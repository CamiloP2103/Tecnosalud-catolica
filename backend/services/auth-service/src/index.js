require('dotenv').config();
const pool = require('./config/db');
const { crearApp } = require('./app');

const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[auth-service] Falta JWT_SECRET en el archivo .env (ver .env.example).');
  process.exit(1);
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY || '';

// Delega el envío de correos al notification-service
async function notificar({ to, subject, html }) {
  const respuesta = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': NOTIFICATION_API_KEY, 'x-servicio-origen': 'auth-service' },
    body: JSON.stringify({ to, subject, html }),
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => ({}));
    throw new Error(errorData.mensaje || `Estado HTTP: ${respuesta.status}`);
  }
}

const app = crearApp({ pool, jwtSecret: JWT_SECRET, frontendUrl: FRONTEND_URL, notificar });

app.listen(PORT, () => {
  console.log(`Microservicio de Autenticación activo en el puerto ${PORT} (/api/auth)`);
});
