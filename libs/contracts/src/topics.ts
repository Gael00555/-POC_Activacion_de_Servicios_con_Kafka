/**
 * Nombres de los topics de Kafka. Todos con 3 particiones,
 * retención de 7 días y customerId como clave del mensaje.
 */
export const Topics = {
  ActivationRequested: 'activation.requested',
  BillingEvents: 'billing.events',
  ProvisioningEvents: 'provisioning.events',
  ActivationEvents: 'activation.events',
} as const;

export type TopicName = (typeof Topics)[keyof typeof Topics];

/** Nombre del topic DLQ correspondiente a un topic de negocio. */
export function dlqTopic(topic: TopicName): string {
  return `${topic}.dlq`;
}