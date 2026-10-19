import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KafkaToolkitModule } from '@activation-poc/kafka-toolkit';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  SentNotification,
  SentNotificationSchema,
} from './sent-notification.schema';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ??
        'mongodb://localhost:27017/notification_service?directConnection=true',
    ),
    MongooseModule.forFeature([
      { name: SentNotification.name, schema: SentNotificationSchema },
    ]),
    KafkaToolkitModule.forRoot({ serviceName: 'notification-service' }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class AppModule {}