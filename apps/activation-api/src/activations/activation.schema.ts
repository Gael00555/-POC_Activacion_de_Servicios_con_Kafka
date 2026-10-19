import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivationStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVE' | 'FAILED';

@Schema({ collection: 'activations', timestamps: true, minimize: false })
export class Activation {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true })
  customerId!: string;

  @Prop({ type: String, required: true })
  planId!: string;

  @Prop({ type: String, required: true, default: 'PENDING' })
  status!: ActivationStatus;

  @Prop({ type: String, required: true, default: 'none' })
  simulateFailure!: string;

  @Prop({ type: Object, default: {} })
    steps!: Record<string, { status: string; at: Date; reason?: string }>;

  @Prop({
    type: [{ _id: false, eventType: { type: String }, at: { type: Date } }],
    default: [],
  })
  history!: { eventType: string; at: Date }[];
}

export type ActivationDocument = HydratedDocument<Activation>;
export const ActivationSchema = SchemaFactory.createForClass(Activation);