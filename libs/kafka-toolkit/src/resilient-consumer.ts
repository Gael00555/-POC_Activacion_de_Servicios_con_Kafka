import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { dlqTopic } from '@activation-poc/contracts';
import type { EventEnvelope, TopicName } from '@activation-poc/contracts';
import { KAFKA_TOOLKIT_CLIENT, KAFKA_TOOLKIT_OPTIONS } from './constants';
import {
  PROCESSED_EVENT_MODEL,
  ProcessedEvent,
} from './processed-event.schema';

export interface KafkaToolkitOptions {
  /** Nombre del servicio: identifica al productor de la DLQ y va en los headers. */
  serviceName: string;
  /** Esperas entre reintentos. Por defecto 1 s, 2 s y 4 s. */
  retryDelaysMs?: number[];
}

export interface HandleParams<T> {
  topic: TopicName;
  /** El evento tal como llegó de Kafka. */
  message: EventEnvelope<T>;
  /** El efecto del servicio. Corre dentro de una transacción de Mongo. */
  work: () => Promise<void>;
}

export type HandleResult = 'processed' | 'duplicate' | 'dead-lettered';

const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000];

class DuplicateEventError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isDuplicateKeyError = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: number }).code === 11000;

@Injectable()
export class ResilientConsumer implements OnModuleInit {
  private readonly logger = new Logger(ResilientConsumer.name);
  private readonly retryDelaysMs: number[];

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(PROCESSED_EVENT_MODEL)
    private readonly processedModel: Model<ProcessedEvent>,
    @Inject(KAFKA_TOOLKIT_CLIENT) private readonly client: ClientKafka,
    @Inject(KAFKA_TOOLKIT_OPTIONS) private readonly options: KafkaToolkitOptions,
  ) {
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  }

  async onModuleInit() {
    // Con esto, las consultas de Mongoose que corren dentro de una
    // transacción usan su sesión sin tener que pasarla a mano.
    this.connection.base.set('transactionAsyncLocalStorage', true);
    await this.client.connect();
  }

  /**
   * Procesa un evento de forma idempotente y con reintentos:
   *  - si el eventId ya estaba en processed_events, lo descarta;
   *  - si falla, reintenta con espera creciente;
   *  - si sigue fallando, lo manda a la DLQ y devuelve el control, así un
   *    mensaje roto no frena al resto de la partición.
   */
  async handle<T>(params: HandleParams<T>): Promise<HandleResult> {
    const { topic, message } = params;
    const totalAttempts = this.retryDelaysMs.length + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      try {
        const outcome = await this.runOnce(params);

        if (outcome === 'duplicate') {
          this.logger.warn(
            `Evento ${message.eventId} ya procesado [${topic}], se descarta`,
          );
        }
        return outcome;
      } catch (err) {
        lastError = err;
        const reason = err instanceof Error ? err.message : String(err);

        if (attempt < this.retryDelaysMs.length) {
          const wait = this.retryDelaysMs[attempt];
          this.logger.warn(
            `Falló el procesamiento [${topic}] (intento ${attempt + 1}/${totalAttempts}): ${reason}. Reintento en ${wait} ms`,
          );
          await sleep(wait);
        }
      }
    }

    await this.sendToDlq(topic, message, lastError, totalAttempts);
    return 'dead-lettered';
  }

  /**
   * Un intento: en una sola transacción, registra el eventId y ejecuta el
   * efecto. Si algo falla, la transacción se deshace completa, incluido el
   * registro del eventId, y el reintento empieza de cero.
   */
  private async runOnce<T>(
    params: HandleParams<T>,
  ): Promise<'processed' | 'duplicate'> {
    const { topic, message, work } = params;

    try {
      await this.connection.transaction(async () => {
        try {
          await this.processedModel.create([
            { eventId: message.eventId, topic },
          ]);
        } catch (err) {
          if (isDuplicateKeyError(err)) throw new DuplicateEventError();
          throw err;
        }

        await work();
      });

      return 'processed';
    } catch (err) {
      if (err instanceof DuplicateEventError) return 'duplicate';
      throw err;
    }
  }

  private async sendToDlq<T>(
    topic: TopicName,
    message: EventEnvelope<T>,
    error: unknown,
    attempts: number,
  ) {
    const reason = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const target = dlqTopic(topic);
    const key =
      typeof message === 'object' && message !== null
        ? message.customerId
        : undefined;

    await lastValueFrom(
      this.client.emit(target, {
        key,
        value: message,
        headers: {
          'x-original-topic': topic,
          'x-consumer': this.options.serviceName,
          'x-error-name': errorName,
          'x-error-message': reason.slice(0, 500),
          'x-attempts': String(attempts),
          'x-failed-at': new Date().toISOString(),
        },
      }),
    );

    this.logger.error(
      `Mensaje enviado a ${target} tras ${attempts} intentos: ${reason}`,
    );
  }
}