const historiasRoutes = require('./src/routes/historiasRoutes');
app.use('/api/citas/historias', historiasRoutes); // o la ruta base que prefieras

require('dotenv').config();
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

// 1. Importaciones de tu arquitectura (Base de datos real de Azure)
const pool = require('./config/db');
const { crearRepositorio } = require('./repositorio');
const { crearApp } = require('./app');

// 2. Variables de entorno y puertos
const PORT = Number(process.env.PORT || 3003);

// 3. Lógica de los compañeros para leer el JWT desde auth-service
const AUTH_ENV_PATH = path.join(__dirname, '../../auth-service/.env');
const AUTH_ENV = existsSync(AUTH_ENV_PATH)
  ? require('dotenv').parse(readFileSync(AUTH_ENV_PATH))
  : {};

const JWT_SECRET = process.env.JWT_SECRET || AUTH_ENV.JWT_SECRET || 'tecnosalud_secret_jwt_key_2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY || '';

// 4. Función notificar integrada
async function notificar({ to, subject, html }) {
  const respuesta = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'x-api-key': NOTIFICATION_API_KEY, 
      'x-servicio-origen': 'citas-service' 
    },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!respuesta.ok) throw new Error(`notification-service respondió ${respuesta.status}`);
}

// Instancia del repositorio y la app
const repo = crearRepositorio(pool);

// Función requerida por las pruebas para reiniciar el estado
function resetCitas() {
  if (typeof repo.reset === 'function') {
    repo.reset();
  }
}

// 5. Inicializar la aplicación conectando todo
const app = crearApp({
  repo,
  jwtSecret: JWT_SECRET,
  frontendUrl: FRONTEND_URL,
  notificar,
  puerto: PORT,
});

// 6. Arrancar el servidor (si no se está ejecutando en entorno de pruebas estricto)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Microservicio de Citas activo en el puerto ${PORT} (/api/citas)`);
  });
}

// Exportaciones compatibles con CommonJS y ES Modules (para Vitest)
module.exports = app;
module.exports.JWT_SECRET = JWT_SECRET;
module.exports.resetCitas = resetCitas;