import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BillingAccountStatus = 'ACTIVE' | 'CANCELLED' | 'FAILED';

@Schema({ collection: 'billing_accounts', timestamps: true })
export class BillingAccount {
  @Prop({ type: String })
  _id!: string;

  @Prop({ type: String, required: true, unique: true })
  activationId!: string;

  @Prop({ type: String, required: true })
  customerId!: string;

  @Prop({ type: String, required: true })
  status!: BillingAccountStatus;

  @Prop({ type: Date })
  cancelledAt?: Date;
}

export type BillingAccountDocument = HydratedDocument<BillingAccount>;
export const BillingAccountSchema = SchemaFactory.createForClass(BillingAccount);