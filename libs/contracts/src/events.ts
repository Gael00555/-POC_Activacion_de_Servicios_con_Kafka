import { EventEnvelope } from './envelope';

/** Modo de fallo forzado desde la UI, solo para la demo. */
export type SimulateFailure = 'none' | 'billing' | 'provisioning';

// ---- Payloads de cada evento ----

export interface ActivationRequestedPayload {
  planId: string;
  channel: string;
  simulateFailure: SimulateFailure;
}

export interface BillingAccountCreatedPayload {
  billingAccountId: string;
}

export interface BillingFailedPayload {
  reason: string;
}

export interface BillingAccountCancelledPayload {
  billingAccountId: string;
  reason: string;
}

export interface ProvisioningCompletedPayload {
  provisioningOrderId: string;
}

export interface ProvisioningFailedPayload {
  reason: string;
}

export interface ActivationCompletedPayload {
  activationId: string;
}

export interface ActivationFailedPayload {
  activationId: string;
  reason: string;
}

// ---- Nombres de eventType (en pasado, describen un hecho) ----

export const EventType = {
  ActivationRequested: 'ActivationRequested',
  BillingAccountCreated: 'BillingAccountCreated',
  BillingFailed: 'BillingFailed',
  BillingAccountCancelled: 'BillingAccountCancelled',
  ProvisioningCompleted: 'ProvisioningCompleted',
  ProvisioningFailed: 'ProvisioningFailed',
  ActivationCompleted: 'ActivationCompleted',
  ActivationFailed: 'ActivationFailed',
} as const;

// ---- Envelope ya tipado para cada evento ----

export type ActivationRequestedEvent = EventEnvelope<ActivationRequestedPayload>;
export type BillingAccountCreatedEvent = EventEnvelope<BillingAccountCreatedPayload>;
export type BillingFailedEvent = EventEnvelope<BillingFailedPayload>;
export type BillingAccountCancelledEvent = EventEnvelope<BillingAccountCancelledPayload>;
export type ProvisioningCompletedEvent = EventEnvelope<ProvisioningCompletedPayload>;
export type ProvisioningFailedEvent = EventEnvelope<ProvisioningFailedPayload>;
export type ActivationCompletedEvent = EventEnvelope<ActivationCompletedPayload>;
export type ActivationFailedEvent = EventEnvelope<ActivationFailedPayload>;