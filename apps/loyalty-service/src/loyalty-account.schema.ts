import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ collection: 'loyalty_accounts', timestamps: true })
export class LoyaltyAccount {
  @Prop({ type: String, required: true, unique: true })
  customerId!: string;

  @Prop({ type: Number, required: true, default: 0 })
  points!: number;

  @Prop({ type: Number, required: true, default: 0 })
  activations!: number;
}

export const LoyaltyAccountSchema = SchemaFactory.createForClass(LoyaltyAccount);