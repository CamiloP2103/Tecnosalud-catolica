require('dotenv').config();
const { crearApp } = require('./app'); // Importamos tu app.js modular
const pool = require('./config/db');

const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'tecnosalud_secret_jwt_key_2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY || ''; // <-- La llave maestra

// Función notificar centralizada con la cabecera x-api-key
const notificar = async ({ to, subject, html, text }) => {
  const respuesta = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NOTIFICATION_API_KEY, // Autorización para el microservicio de correos
      'x-servicio-origen': 'auth-service'
    },
    body: JSON.stringify({ to, subject, html, text })
  });

  const resultado = await respuesta.json();
  if (!respuesta.ok || !resultado.exito) {
    throw new Error(resultado.mensaje || `Error HTTP: ${respuesta.status}`);
  }
  return resultado;
};

// Inicializamos la app modular pasándole las dependencias
const app = crearApp({
  pool,
  jwtSecret: JWT_SECRET,
  frontendUrl: FRONTEND_URL,
  notificar
});

// Health check
app.get('/api/auth/health', (req, res) => {
  res.json({ servicio: 'auth', estado: 'activo', version: 'modular' });
});

app.listen(PORT, () => {
  console.log(`Microservicio de Autenticación activo en el puerto ${PORT} (/api/auth)`);
});