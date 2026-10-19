import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { EventLogEntry, EventLogEntrySchema } from './event-log.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ??
        'mongodb://localhost:27017/crm_analytics_service?directConnection=true',
    ),
    MongooseModule.forFeature([
      { name: EventLogEntry.name, schema: EventLogEntrySchema },
    ]),
    KafkaToolkitModule.forRoot({ serviceName: 'crm-analytics-service' }),
  ],
  controllers: [CrmController],
  providers: [CrmService],
})
export class AppModule {}