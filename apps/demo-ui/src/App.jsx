import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import ActivationForm from './components/ActivationForm'
import Timeline from './components/Timeline'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Deduce el estado de la activación a partir de los eventos que van llegando.
function nextStatus(current, eventType) {
  if (eventType === 'ActivationCompleted') return 'ACTIVE'
  if (eventType === 'ActivationFailed') return 'FAILED'
  if (current === 'PENDING' && eventType !== 'ActivationRequested') {
    return 'IN_PROGRESS'
  }
  return current
}

export default function App() {
  const [activation, setActivation] = useState(null)
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('PENDING')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)

  const socketRef = useRef(null)
  const activeIdRef = useRef(null)

  // Agrega un evento a la timeline sin duplicar y ordenado por hora.
  const addEvent = useCallback((entry) => {
    setEvents((prev) => {
      const repeated = prev.some(
        (p) => p.eventType === entry.eventType && p.at === entry.at,
      )
      if (repeated) return prev
      return [...prev, entry].sort((a, b) => new Date(a.at) - new Date(b.at))
    })
    setStatus((prev) => nextStatus(prev, entry.eventType))
  }, [])

  // Se une a la sala de la activación y carga lo que ya había pasado.
  const subscribe = useCallback(
    (activationId) => {
      socketRef.current?.emit('subscribe', activationId, (snapshot) => {
        if (activeIdRef.current !== activationId) return
        snapshot.history.forEach((h) =>
          addEvent({ eventType: h.eventType, at: h.at }),
        )
      })
    },
    [addEvent],
  )

  useEffect(() => {
    const socket = io(API_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      // Si se cayó la conexión, se vuelve a suscribir a la activación en curso.
      if (activeIdRef.current) subscribe(activeIdRef.current)
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('activation.event', (e) => {
      if (e.activationId !== activeIdRef.current) return
      addEvent({ eventType: e.eventType, at: e.at })
    })

    return () => socket.close()
  }, [addEvent, subscribe])

  const handleCreate = async (values) => {
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/activations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        const message = Array.isArray(body?.message)
          ? body.message.join(', ')
          : body?.message
        throw new Error(message || 'No se pudo crear la activación')
      }

      const { activationId } = await response.json()

      activeIdRef.current = activationId
      setActivation({ id: activationId, ...values })
      setEvents([])
      setStatus('PENDING')
      subscribe(activationId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Activación de servicios</h1>
          <p className="subtitle">
            Un solo evento en Kafka dispara toda la activación.
          </p>
        </div>
        <span className={`conn ${connected ? 'conn--on' : ''}`}>
          {connected ? 'Tiempo real conectado' : 'Sin conexión'}
        </span>
      </header>

      <div className="layout">
        <ActivationForm
          onSubmit={handleCreate}
          loading={loading}
          error={error}
        />
        <Timeline activation={activation} events={events} status={status} />
      </div>
    </main>
  )
}