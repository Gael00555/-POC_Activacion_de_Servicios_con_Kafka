import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { KafkaModule } from '../kafka/kafka.module';
import { Activation, ActivationSchema } from './activation.schema';
import { ActivationResultsController } from './activation-results.controller';
import { ActivationsController } from './activations.controller';
import { ActivationsGateway } from './activations.gateway';
import { ActivationsService } from './activations.service';

@Module({
  imports: [
    KafkaModule,
    KafkaToolkitModule.forRoot({ serviceName: 'activation-api' }),
    MongooseModule.forFeature([
      { name: Activation.name, schema: ActivationSchema },
    ]),
  ],
  controllers: [ActivationsController, ActivationResultsController],
  providers: [ActivationsService, ActivationsGateway],
})
export class ActivationsModule {}