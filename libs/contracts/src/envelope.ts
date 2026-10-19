/**
 * Sobre común a todos los eventos de la POC.
 * El payload cambia según el tipo de evento (ver events.ts).
 */
export interface EventEnvelope<TPayload = unknown> {
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  customerId: string;
  source: string;
  payload: TPayload;
}