import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'event_log', timestamps: true })
export class EventLogEntry {
  @Prop({ type: String, required: true, unique: true })
  eventId!: string;

  @Prop({ type: String, required: true, index: true })
  correlationId!: string;

  @Prop({ type: String, required: true })
  topic!: string;

  @Prop({ type: String, required: true })
  eventType!: string;

  @Prop({ type: String, required: true })
  customerId!: string;

  @Prop({ type: String, required: true })
  source!: string;

  @Prop({ type: String, required: true })
  occurredAt!: string;

  @Prop({ type: Object })
  payload!: unknown;
}

export const EventLogEntrySchema = SchemaFactory.createForClass(EventLogEntry);