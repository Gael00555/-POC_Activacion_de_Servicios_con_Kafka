import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { SimulateFailure } from '@activation-poc/contracts';

export class CreateActivationDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsIn(['none', 'billing', 'provisioning'])
  simulateFailure?: SimulateFailure;
}