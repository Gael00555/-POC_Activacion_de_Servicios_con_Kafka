import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ActivationCompletedEvent } from '@activation-poc/contracts';
import { LoyaltyAccount } from './loyalty-account.schema';

const POINTS_PER_ACTIVATION = 100;

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectModel(LoyaltyAccount.name)
    private readonly accountModel: Model<LoyaltyAccount>,
  ) {}

  /** Suma puntos al cliente por cada activación completada. */
  async awardPoints(event: ActivationCompletedEvent) {
    const account = await this.accountModel
      .findOneAndUpdate(
        { customerId: event.customerId },
        { $inc: { points: POINTS_PER_ACTIVATION, activations: 1 } },
        { upsert: true, returnDocument: 'after' },
      )
      .lean();

    if (!account) {
      throw new Error(`No se pudo actualizar la cuenta de ${event.customerId}`);
    }

    this.logger.log(
      `+${POINTS_PER_ACTIVATION} puntos para ${event.customerId} (total ${account.points}) [activación ${event.correlationId}]`,
    );
  }
}