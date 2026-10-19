
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import {
  LoyaltyAccount,
  LoyaltyAccountSchema,
} from './loyalty-account.schema';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ??
        'mongodb://localhost:27017/loyalty_service?directConnection=true',
    ),
    MongooseModule.forFeature([
      { name: LoyaltyAccount.name, schema: LoyaltyAccountSchema },
    ]),
    KafkaToolkitModule.forRoot({ serviceName: 'loyalty-service' }),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
})
export class AppModule {}