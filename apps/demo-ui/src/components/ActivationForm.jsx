import { useState } from 'react'

export default function ActivationForm({ onSubmit, loading, error }) {
  const [customerId, setCustomerId] = useState('C-1001')
  const [planId, setPlanId] = useState('FLOW-FULL')
  const [simulateFailure, setSimulateFailure] = useState('none')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      customerId: customerId.trim(),
      planId: planId.trim(),
      simulateFailure,
    })
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Contratar plan</h2>

      <div className="field">
        <label htmlFor="customerId">Cliente</label>
        <input
          id="customerId"
          type="text"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="planId">Plan</label>
        <input
          id="planId"
          type="text"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="simulateFailure">Forzar un fallo</label>
        <select
          id="simulateFailure"
          value={simulateFailure}
          onChange={(e) => setSimulateFailure(e.target.value)}
        >
          <option value="none">Ninguno</option>
          <option value="billing">En facturación (billing)</option>
          <option value="provisioning">En aprovisionamiento (provisioning)</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn" disabled={loading}>
        {loading ? 'Enviando...' : 'Contratar'}
      </button>
    </form>
  )
}