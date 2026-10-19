import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { BillingAccount, BillingAccountSchema } from './billing-account.schema';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [
     MongooseModule.forRoot(
      process.env.MONGO_URI ??
        'mongodb://localhost:27017/billing_service?directConnection=true',
    ),
    MongooseModule.forFeature([
      { name: BillingAccount.name, schema: BillingAccountSchema },
    ]),
    KafkaToolkitModule.forRoot({ serviceName: 'billing-service' }),
    KafkaModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
})
export class AppModule {}