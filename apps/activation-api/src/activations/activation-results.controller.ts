import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventType, Topics } from '@activation-poc/contracts';
import type { EventEnvelope } from '@activation-poc/contracts';
import { ResilientConsumer } from '@activation-poc/kafka-toolkit';
import { ActivationsService } from './activations.service';

type FailurePayload = { reason?: string };

@Controller()
export class ActivationResultsController {
  constructor(
    private readonly activationsService: ActivationsService,
    private readonly resilient: ResilientConsumer,
  ) {}

  @EventPattern(Topics.BillingEvents)
  async handleBillingEvent(@Payload() event: EventEnvelope<FailurePayload>) {
    await this.resilient.handle({
      topic: Topics.BillingEvents,
      message: event,
      work: async () => {
        if (event.eventType === EventType.BillingAccountCreated) {
          await this.activationsService.recordStepResult(event, 'billing', 'OK');
        } else if (event.eventType === EventType.BillingFailed) {
          await this.activationsService.recordStepResult(
            event,
            'billing',
            'FAILED',
            event.payload.reason,
          );
        } else if (event.eventType === EventType.BillingAccountCancelled) {
          await this.activationsService.recordCompensation(event);
        }
      },
    });
  }

  @EventPattern(Topics.ProvisioningEvents)
  async handleProvisioningEvent(@Payload() event: EventEnvelope<FailurePayload>) {
    await this.resilient.handle({
      topic: Topics.ProvisioningEvents,
      message: event,
      work: async () => {
        if (event.eventType === EventType.ProvisioningCompleted) {
          await this.activationsService.recordStepResult(
            event,
            'provisioning',
            'OK',
          );
        } else if (event.eventType === EventType.ProvisioningFailed) {
          await this.activationsService.recordStepResult(
            event,
            'provisioning',
            'FAILED',
            event.payload.reason,
          );
        }
      },
    });
  }
}