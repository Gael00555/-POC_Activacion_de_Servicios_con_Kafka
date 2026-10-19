import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { EventEnvelope } from '@activation-poc/contracts';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_PRODUCER') private readonly client: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.client.connect();
  }

  /**
   * Publica un evento ya armado con su envelope completo.
   */
  async publish<T>(topic: string, event: EventEnvelope<T>): Promise<void> {
    this.client.emit(topic, {
      key: event.customerId,
      value: event,
    });
  }

  /**
   * Arma el envelope común y lo publica, para no repetir estos campos
   * en cada lugar donde se publica un evento.
   */
  async publishEvent<T>(params: {
    topic: string;
    eventType: string;
    correlationId: string;
    customerId: string;
    source: string;
    payload: T;
  }): Promise<void> {
    const event: EventEnvelope<T> = {
      eventId: randomUUID(),
      eventType: params.eventType,
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: params.correlationId,
      customerId: params.customerId,
      source: params.source,
      payload: params.payload,
    };

    await this.publish(params.topic, event);
  }
}