import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventType, Topics } from '@activation-poc/contracts';
import type {
  ActivationCompletedEvent,
  ActivationFailedEvent,
  EventEnvelope,
} from '@activation-poc/contracts';
import { ResilientConsumer } from '@activation-poc/kafka-toolkit';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly resilient: ResilientConsumer,
  ) {}

  @EventPattern(Topics.ActivationEvents)
  async handleActivationEvent(@Payload() event: EventEnvelope<unknown>) {
    await this.resilient.handle({
      topic: Topics.ActivationEvents,
      message: event,
      work: async () => {
        if (event.eventType === EventType.ActivationCompleted) {
          await this.notificationsService.notifyCompleted(
            event as ActivationCompletedEvent,
          );
        } else if (event.eventType === EventType.ActivationFailed) {
          await this.notificationsService.notifyFailed(
            event as ActivationFailedEvent,
          );
        }
      },
    });
  }
}