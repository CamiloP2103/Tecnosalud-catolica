require('dotenv').config();
const pool = require('./config/db');
const { crearApp } = require('./app');

const PORT = process.env.PORT || 3003;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY || '';

// Delega el envío de correos al notification-service
async function notificar({ to, subject, html }) {
  const respuesta = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': NOTIFICATION_API_KEY },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!respuesta.ok) throw new Error(`notification-service respondió ${respuesta.status}`);
}

const app = crearApp({ pool, frontendUrl: FRONTEND_URL, notificar, puerto: PORT });

app.listen(PORT, () => {
  console.log(`Microservicio de Registro activo en el puerto ${PORT} (/api/registro)`);
});
