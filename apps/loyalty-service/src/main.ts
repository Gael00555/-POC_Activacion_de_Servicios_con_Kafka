import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID ?? 'loyalty-service',
          brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID ?? 'loyalty-service',
        },
        // Un grupo nuevo, sin offsets guardados, empieza desde el primer
        // mensaje del topic en lugar de esperar los nuevos. Es el
        // equivalente a auto.offset.reset=earliest.
        subscribe: { fromBeginning: true },
      },
    },
  );

  await app.listen();
}
bootstrap();