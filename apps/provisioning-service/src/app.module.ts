import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { KafkaModule } from './kafka/kafka.module';
import { ProvisioningController } from './provisioning.controller';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ??
        'mongodb://localhost:27017/provisioning_service?directConnection=true',
    ),
    KafkaToolkitModule.forRoot({ serviceName: 'provisioning-service' }),
    KafkaModule,
  ],
  controllers: [ProvisioningController],
})
export class AppModule {}