const EVENT_INFO = {
  ActivationRequested: { label: 'Activación solicitada', kind: 'info', source: 'activation-api' },
  BillingAccountCreated: { label: 'Cuenta de facturación creada', kind: 'ok', source: 'billing-service' },
  BillingFailed: { label: 'Falló la facturación', kind: 'error', source: 'billing-service' },
  BillingAccountCancelled: { label: 'Cuenta de facturación anulada (compensación)', kind: 'warn', source: 'billing-service' },
  ProvisioningCompleted: { label: 'Línea aprovisionada', kind: 'ok', source: 'provisioning-service' },
  ProvisioningFailed: { label: 'Falló el aprovisionamiento', kind: 'error', source: 'provisioning-service' },
  ActivationCompleted: { label: 'Activación completada', kind: 'ok', source: 'activation-api' },
  ActivationFailed: { label: 'Activación fallida', kind: 'error', source: 'activation-api' },
}

const STATUS_LABEL = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  ACTIVE: 'Activa',
  FAILED: 'Fallida',
}

function formatTime(iso) {
  const d = new Date(iso)
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${d.toLocaleTimeString('es-AR', { hour12: false })}.${ms}`
}

export default function Timeline({ activation, events, status }) {
  return (
    <section className="card">
      <div className="timeline-head">
        <h2>Timeline de eventos</h2>
        {activation && (
          <span className={`badge badge--${status.toLowerCase()}`}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {!activation ? (
        <p className="empty">
          Contratá un plan para ver los eventos acá, en tiempo real.
        </p>
      ) : (
        <>
          <p className="meta">
            Activación <code>{activation.id}</code> · cliente {activation.customerId} ·
            plan {activation.planId}
          </p>

          <ol className="timeline">
            {events.map((e) => {
              const info = EVENT_INFO[e.eventType] ?? {
                label: e.eventType,
                kind: 'info',
                source: '',
              }
              return (
                <li
                  key={`${e.eventType}-${e.at}`}
                  className={`timeline-item timeline-item--${info.kind}`}
                >
                  <span className="dot" />
                  <div className="timeline-body">
                    <div className="timeline-title">{info.label}</div>
                    <div className="timeline-sub">
                      {e.eventType} · {info.source}
                    </div>
                  </div>
                  <time>{formatTime(e.at)}</time>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}