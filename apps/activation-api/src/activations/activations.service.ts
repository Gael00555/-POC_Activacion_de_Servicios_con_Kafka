import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { EventType, Topics } from '@activation-poc/contracts';
import type { EventEnvelope } from '@activation-poc/contracts';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { Activation } from './activation.schema';
import { ActivationsGateway } from './activations.gateway';
import { CreateActivationDto } from './create-activation.dto';

export type StepName = 'billing' | 'provisioning';
export type StepStatus = 'OK' | 'FAILED';

@Injectable()
export class ActivationsService {
  private readonly logger = new Logger(ActivationsService.name);

  constructor(
    @InjectModel(Activation.name)
    private readonly activationModel: Model<Activation>,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly gateway: ActivationsGateway,
  ) {}

  async create(dto: CreateActivationDto) {
    const activationId = randomUUID();
    const simulateFailure = dto.simulateFailure ?? 'none';
    const requestedAt = new Date();

    await this.activationModel.create({
      _id: activationId,
      customerId: dto.customerId,
      planId: dto.planId,
      status: 'PENDING',
      simulateFailure,
      steps: {},
      history: [{ eventType: EventType.ActivationRequested, at: requestedAt }],
    });

    this.gateway.emitEvent(
      activationId,
      EventType.ActivationRequested,
      requestedAt,
    );

    await this.kafkaProducer.publishEvent({
      topic: Topics.ActivationRequested,
      eventType: EventType.ActivationRequested,
      correlationId: activationId,
      customerId: dto.customerId,
      source: 'activation-api',
      payload: {
        planId: dto.planId,
        channel: dto.channel ?? 'web',
        simulateFailure,
      },
    });

    return { activationId, status: 'PENDING' };
  }

  async findOne(id: string) {
    const activation = await this.activationModel.findById(id).lean();

    if (!activation) {
      throw new NotFoundException(`Activación ${id} no encontrada`);
    }

    return activation;
  }

  /**
   * Guarda el resultado de billing o provisioning y decide si la
   * activación terminó (ACTIVE / FAILED) o sigue en curso (IN_PROGRESS).
   */
  async recordStepResult(
    event: EventEnvelope<unknown>,
    step: StepName,
    status: StepStatus,
    reason?: string,
  ) {
    const id = event.correlationId;
    const at = new Date();

    // 1) Guardar el resultado del paso y anotarlo en el historial.
    //    Se hace siempre, incluso si la activación ya terminó.
    const activation = await this.activationModel
      .findOneAndUpdate(
        { _id: id },
        {
          $set: {
            [`steps.${step}`]: { status, at, ...(reason ? { reason } : {}) },
          },
          $push: { history: { eventType: event.eventType, at } },
        },
        { returnDocument: 'after' },
      )
      .lean();

    if (!activation) {
      this.logger.warn(
        `Evento ${event.eventType} de una activación inexistente (${id}), se ignora`,
      );
      return;
    }

    this.gateway.emitEvent(id, event.eventType, at);

    // 2) Decidir según lo que ya se sabe de cada servicio.
    const steps = activation.steps ?? {};
    const failed = Object.entries(steps).find(([, s]) => s.status === 'FAILED');

    if (failed) {
      const [failedStep, data] = failed;
      const finishedAt = new Date();
      const finished = await this.transition(
        id,
        'FAILED',
        EventType.ActivationFailed,
        finishedAt,
      );

      if (finished) {
        this.gateway.emitEvent(id, EventType.ActivationFailed, finishedAt);
        await this.kafkaProducer.publishEvent({
          topic: Topics.ActivationEvents,
          eventType: EventType.ActivationFailed,
          correlationId: id,
          customerId: event.customerId,
          source: 'activation-api',
          payload: {
            activationId: id,
            reason: `${failedStep}: ${data.reason ?? 'sin detalle'}`,
          },
        });
        this.logger.warn(`Activación ${id} -> FAILED (${failedStep})`);
      }
      return;
    }

    if (steps.billing?.status === 'OK' && steps.provisioning?.status === 'OK') {
      const finishedAt = new Date();
      const finished = await this.transition(
        id,
        'ACTIVE',
        EventType.ActivationCompleted,
        finishedAt,
      );

      if (finished) {
        this.gateway.emitEvent(id, EventType.ActivationCompleted, finishedAt);
        await this.kafkaProducer.publishEvent({
          topic: Topics.ActivationEvents,
          eventType: EventType.ActivationCompleted,
          correlationId: id,
          customerId: event.customerId,
          source: 'activation-api',
          payload: { activationId: id },
        });
        this.logger.log(`Activación ${id} -> ACTIVE`);
      }
      return;
    }

    // Llegó solo uno de los dos resultados y fue OK: sigue en curso.
    await this.activationModel.updateOne(
      { _id: id, status: 'PENDING' },
      { $set: { status: 'IN_PROGRESS' } },
    );
  }

  /**
   * Anota en el historial un evento de compensación (por ejemplo
   * BillingAccountCancelled). No cambia el estado de la activación.
   */
  async recordCompensation(event: EventEnvelope<unknown>) {
    const id = event.correlationId;
    const at = new Date();

    const result = await this.activationModel.updateOne(
      { _id: id },
      { $push: { history: { eventType: event.eventType, at } } },
    );

    if (result.matchedCount === 0) return;

    this.gateway.emitEvent(id, event.eventType, at);
  }

  /**
   * Pasa la activación a un estado final solo si todavía no terminó.
   * Devuelve el documento si esta llamada hizo la transición, o null si
   * otra ya la había hecho. Así el evento final se publica una sola vez.
   */
  private async transition(
    id: string,
    status: 'ACTIVE' | 'FAILED',
    eventType: string,
    at: Date,
  ) {
    return this.activationModel
      .findOneAndUpdate(
        { _id: id, status: { $in: ['PENDING', 'IN_PROGRESS'] } },
        {
          $set: { status },
          $push: { history: { eventType, at } },
        },
        { returnDocument: 'after' },
      )
      .lean();
  }
}