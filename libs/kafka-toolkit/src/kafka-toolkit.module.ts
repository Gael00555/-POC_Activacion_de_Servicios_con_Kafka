import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { KAFKA_TOOLKIT_CLIENT, KAFKA_TOOLKIT_OPTIONS } from './constants';
import {
  PROCESSED_EVENT_MODEL,
  ProcessedEventSchema,
} from './processed-event.schema';
import { KafkaToolkitOptions, ResilientConsumer } from './resilient-consumer';

@Module({})
export class KafkaToolkitModule {
  static forRoot(options: KafkaToolkitOptions): DynamicModule {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');

    return {
      module: KafkaToolkitModule,
      imports: [
        ClientsModule.register([
          {
            name: KAFKA_TOOLKIT_CLIENT,
            transport: Transport.KAFKA,
            options: {
              client: { clientId: `${options.serviceName}-dlq`, brokers },
              producerOnlyMode: true,
            },
          },
        ]),
        MongooseModule.forFeature([
          { name: PROCESSED_EVENT_MODEL, schema: ProcessedEventSchema },
        ]),
      ],
      providers: [
        { provide: KAFKA_TOOLKIT_OPTIONS, useValue: options },
        ResilientConsumer,
      ],
      exports: [ResilientConsumer],
    };
  }
}