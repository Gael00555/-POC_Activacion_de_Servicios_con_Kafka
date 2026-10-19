import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'notifications', timestamps: true })
export class SentNotification {
  @Prop({ type: String, required: true })
  activationId!: string;

  @Prop({ type: String, required: true })
  eventType!: string;

  @Prop({ type: String, required: true })
  to!: string;

  @Prop({ type: String, required: true })
  subject!: string;
}

export const SentNotificationSchema = SchemaFactory.createForClass(SentNotification);

SentNotificationSchema.index({ activationId: 1, eventType: 1 }, { unique: true });