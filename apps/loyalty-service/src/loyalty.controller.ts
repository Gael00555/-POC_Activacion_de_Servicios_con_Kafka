import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventType, Topics } from '@activation-poc/contracts';
import type {
  ActivationCompletedEvent,
  EventEnvelope,
} from '@activation-poc/contracts';
import { ResilientConsumer } from '@activation-poc/kafka-toolkit';
import { LoyaltyService } from './loyalty.service';

@Controller()
export class LoyaltyController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly resilient: ResilientConsumer,
  ) {}

  @EventPattern(Topics.ActivationEvents)
  async handleActivationEvent(@Payload() event: EventEnvelope<unknown>) {
    await this.resilient.handle({
      topic: Topics.ActivationEvents,
      message: event,
      work: async () => {
        if (event.eventType === EventType.ActivationCompleted) {
          await this.loyaltyService.awardPoints(
            event as ActivationCompletedEvent,
          );
        }
      },
    });
  }
}