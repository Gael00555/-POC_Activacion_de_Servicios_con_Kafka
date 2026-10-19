import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventType, Topics } from '@activation-poc/contracts';
import type {
  ActivationFailedEvent,
  ActivationRequestedEvent,
  EventEnvelope,
} from '@activation-poc/contracts';
import { ResilientConsumer } from '@activation-poc/kafka-toolkit';
import { BillingService } from './billing.service';

@Controller()
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly resilient: ResilientConsumer,
  ) {}

  @EventPattern(Topics.ActivationRequested)
  async handleActivationRequested(@Payload() event: ActivationRequestedEvent) {
    await this.resilient.handle({
      topic: Topics.ActivationRequested,
      message: event,
      work: () => this.billingService.handleActivationRequested(event),
    });
  }

  @EventPattern(Topics.ActivationEvents)
  async handleActivationEvent(@Payload() event: EventEnvelope<unknown>) {
    await this.resilient.handle({
      topic: Topics.ActivationEvents,
      message: event,
      work: async () => {
        if (event.eventType === EventType.ActivationFailed) {
          await this.billingService.handleActivationFailed(
            event as ActivationFailedEvent,
          );
        }
      },
    });
  }
}