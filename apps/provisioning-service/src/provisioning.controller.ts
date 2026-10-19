import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { EventType, Topics } from '@activation-poc/contracts';
import type { ActivationRequestedEvent } from '@activation-poc/contracts';
import { ResilientConsumer } from '@activation-poc/kafka-toolkit';
import { KafkaProducerService } from './kafka/kafka-producer.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Controller()
export class ProvisioningController {
  private readonly logger = new Logger(ProvisioningController.name);

  constructor(
    private readonly kafkaProducer: KafkaProducerService,
    private readonly resilient: ResilientConsumer,
  ) {}

  @EventPattern(Topics.ActivationRequested)
  async handleActivationRequested(@Payload() event: ActivationRequestedEvent) {
    await this.resilient.handle({
      topic: Topics.ActivationRequested,
      message: event,
      work: async () => {
        this.logger.log(
          `Recibido ${event.eventType} (activación ${event.correlationId}, cliente ${event.customerId}, plan ${event.payload.planId})`,
        );

        // Simula el aprovisionamiento de la línea: entre 1 y 3 segundos.
        const delayMs = 1000 + Math.floor(Math.random() * 2000);
        await sleep(delayMs);

        if (event.payload.simulateFailure === 'provisioning') {
          await this.kafkaProducer.publishEvent({
            topic: Topics.ProvisioningEvents,
            eventType: EventType.ProvisioningFailed,
            correlationId: event.correlationId,
            customerId: event.customerId,
            source: 'provisioning-service',
            payload: { reason: 'Fallo de aprovisionamiento simulado' },
          });
          this.logger.warn(
            `Publicado ProvisioningFailed tras ${delayMs} ms (activación ${event.correlationId})`,
          );
          return;
        }

        const provisioningOrderId = randomUUID();

        await this.kafkaProducer.publishEvent({
          topic: Topics.ProvisioningEvents,
          eventType: EventType.ProvisioningCompleted,
          correlationId: event.correlationId,
          customerId: event.customerId,
          source: 'provisioning-service',
          payload: { provisioningOrderId },
        });
        this.logger.log(
          `Publicado ProvisioningCompleted ${provisioningOrderId} tras ${delayMs} ms (activación ${event.correlationId})`,
        );
      },
    });
  }
}