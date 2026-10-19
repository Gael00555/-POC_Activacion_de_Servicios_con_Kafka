const { io } = require('socket.io-client');

const failure = process.argv[2] || 'none';

async function main() {
  const res = await fetch('http://localhost:3000/activations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: 'C-9001',
      planId: 'FLOW-FULL',
      simulateFailure: failure,
    }),
  });
  const { activationId } = await res.json();
  console.log('Activación creada:', activationId);

  const socket = io('http://localhost:3000');

  socket.on('connect', () => {
    socket.emit('subscribe', activationId, (snapshot) => {
      const past = snapshot.history.map((h) => h.eventType).join(', ');
      console.log(`FOTO  estado=${snapshot.status}  historial=[${past}]`);
    });
  });

  socket.on('activation.event', (e) => {
    console.log('EN VIVO', e.eventType);
    if (e.eventType === 'ActivationCompleted' || e.eventType === 'ActivationFailed') {
      setTimeout(() => { socket.close(); process.exit(0); }, 2000);
    }
  });
}

main();