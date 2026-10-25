require('dotenv').config();
const { crearApp } = require('./app');
const pool = require('./config/db');
const { crearRepositorio } = require('./repositorio'); // Importamos la fábrica del repo de Juan

// Instanciamos el repositorio inyectándole la conexión a la base de datos
const repo = crearRepositorio(pool);

const PORT = process.env.PORT || 3004;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
const JWT_SECRET = process.env.JWT_SECRET || 'tecnosalud_secret_jwt_key_2026';

// Función para delegar notificaciones al notification-service
const notificar = async ({ to, subject, html }) => {
  const respuesta = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!respuesta.ok) {
    throw new Error('No se pudo enviar la notificación.');
  }
  return respuesta.json();
};

const app = crearApp({
  pool,
  frontendUrl: FRONTEND_URL,
  notificar,
  puerto: PORT,
  repo,
  authServiceUrl: AUTH_SERVICE_URL,
  jwtSecret: JWT_SECRET,
});

app.listen(PORT, () => {
  console.log(`Microservicio de Registro activo en el puerto ${PORT} (/api/registro)`);
});