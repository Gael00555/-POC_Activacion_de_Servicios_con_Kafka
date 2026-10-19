import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { EventType, Topics } from '@activation-poc/contracts';
import type {
  ActivationFailedEvent,
  ActivationRequestedEvent,
} from '@activation-poc/contracts';
import { KafkaProducerService } from './kafka/kafka-producer.service';
import { BillingAccount } from './billing-account.schema';

type EventRef = { correlationId: string; customerId: string };

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(BillingAccount.name)
    private readonly accountModel: Model<BillingAccount>,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /** Reacciona a ActivationRequested: crea la cuenta (o falla a pedido). */
  async handleActivationRequested(event: ActivationRequestedEvent) {
    const activationId = event.correlationId;

    if (event.payload.simulateFailure === 'billing') {
      // Se deja constancia del intento fallido, sin cuenta.
      await this.accountModel.updateOne(
        { activationId },
        {
          $setOnInsert: {
            _id: randomUUID(),
            customerId: event.customerId,
            status: 'FAILED',
          },
        },
        { upsert: true },
      );

      await this.publish(EventType.BillingFailed, event, {
        reason: 'Fallo de facturación simulado',
      });
      this.logger.warn(`Publicado BillingFailed (activación ${activationId})`);
      return;
    }

    const account = await this.accountModel
      .findOneAndUpdate(
        { activationId },
        {
          $setOnInsert: {
            _id: randomUUID(),
            customerId: event.customerId,
            status: 'ACTIVE',
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .lean();

    if (!account) {
      throw new Error(`No se pudo crear la cuenta de la activación ${activationId}`);
    }

    await this.publish(EventType.BillingAccountCreated, event, {
      billingAccountId: account._id,
    });
    this.logger.log(
      `Publicado BillingAccountCreated ${account._id} (activación ${activationId})`,
    );

    if (account.status === 'CANCELLED') {
      await this.publishCancelled(
        event,
        account._id,
        'ActivationFailed llegó antes de crear la cuenta',
      );
    }
  }

  async handleActivationFailed(event: ActivationFailedEvent) {
    const activationId = event.correlationId;

    const cancelled = await this.cancelActiveAccount(activationId);
    if (cancelled) {
      await this.publishCancelled(event, cancelled._id, event.payload.reason);
      return;
    }

    
    await this.accountModel.updateOne(
      { activationId },
      {
        $setOnInsert: {
          _id: randomUUID(),
          customerId: event.customerId,
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      },
      { upsert: true },
    );

    const retried = await this.cancelActiveAccount(activationId);
    if (retried) {
      await this.publishCancelled(event, retried._id, event.payload.reason);
    }
  }

  
  private cancelActiveAccount(activationId: string) {
    return this.accountModel
      .findOneAndUpdate(
        { activationId, status: 'ACTIVE' },
        { $set: { status: 'CANCELLED', cancelledAt: new Date() } },
        { returnDocument: 'after' },
      )
      .lean();
  }

  private async publishCancelled(
    event: EventRef,
    billingAccountId: string,
    reason: string,
  ) {
    await this.publish(EventType.BillingAccountCancelled, event, {
      billingAccountId,
      reason,
    });
    this.logger.warn(
      `Publicado BillingAccountCancelled ${billingAccountId} (activación ${event.correlationId})`,
    );
  }

  private publish<T>(eventType: string, event: EventRef, payload: T) {
    return this.kafkaProducer.publishEvent({
      topic: Topics.BillingEvents,
      eventType,
      correlationId: event.correlationId,
      customerId: event.customerId,
      source: 'billing-service',
      payload,
    });
  }
}