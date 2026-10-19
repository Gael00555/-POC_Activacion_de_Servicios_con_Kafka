import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { EventEnvelope } from '@activation-poc/contracts';
import { EventLogEntry } from './event-log.schema';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    @InjectModel(EventLogEntry.name)
    private readonly eventLog: Model<EventLogEntry>,
  ) {}

  async record(topic: string, event: EventEnvelope<unknown>) {
    // Se inserta solo si ese eventId no estaba: si el mismo evento llega
    // dos veces, la segunda no duplica nada.
    const result = await this.eventLog.updateOne(
      { eventId: event.eventId },
      {
        $setOnInsert: {
          topic,
          correlationId: event.correlationId,
          customerId: event.customerId,
          eventType: event.eventType,
          source: event.source,
          occurredAt: event.occurredAt,
          payload: event.payload,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount === 0) {
      this.logger.warn(`Evento ${event.eventId} repetido, se ignora`);
      return;
    }

    this.logger.log(
      `Registrado ${event.eventType} de ${event.source} [${topic}] (activación ${event.correlationId})`,
    );
  }
}