import { Schema } from 'mongoose';

export const PROCESSED_EVENT_MODEL = 'ProcessedEvent';


export const PROCESSED_EVENTS_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface ProcessedEvent {
  eventId: string;
  topic: string;
  createdAt: Date;
}

export const ProcessedEventSchema = new Schema<ProcessedEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    topic: { type: String, required: true },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: PROCESSED_EVENTS_TTL_SECONDS,
    },
  },
  { collection: 'processed_events' },
);