import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Topics } from '@activation-poc/contracts';
import type { EventEnvelope, TopicName } from '@activation-poc/contracts';
import { ResilientConsumer } from '@activation-poc/kafka-toolkit';
import { CrmService } from './crm.service';

@Controller()
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly resilient: ResilientConsumer,
  ) {}

  @EventPattern(Topics.ActivationRequested)
  async onActivationRequested(@Payload() event: EventEnvelope<unknown>) {
    await this.consume(Topics.ActivationRequested, event);
  }

  @EventPattern(Topics.BillingEvents)
  async onBillingEvent(@Payload() event: EventEnvelope<unknown>) {
    await this.consume(Topics.BillingEvents, event);
  }

  @EventPattern(Topics.ProvisioningEvents)
  async onProvisioningEvent(@Payload() event: EventEnvelope<unknown>) {
    await this.consume(Topics.ProvisioningEvents, event);
  }

  @EventPattern(Topics.ActivationEvents)
  async onActivationEvent(@Payload() event: EventEnvelope<unknown>) {
    await this.consume(Topics.ActivationEvents, event);
  }

  private async consume(topic: TopicName, event: EventEnvelope<unknown>) {
    await this.resilient.handle({
      topic,
      message: event,
      work: () => this.crmService.record(topic, event),
    });
  }
}