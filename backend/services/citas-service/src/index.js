import cors from 'cors';
import { existsSync, readFileSync } from 'node:fs';
import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3003);
const AUTH_ENV_PATH = new URL('../../auth-service/.env', import.meta.url);
const AUTH_ENV = existsSync(AUTH_ENV_PATH)
  ? dotenv.parse(readFileSync(AUTH_ENV_PATH))
  : {};
export const JWT_SECRET = process.env.JWT_SECRET
  || AUTH_ENV.JWT_SECRET
  || 'tecnosalud_secret_jwt_key_2026';
const DOCTORES = [
  { id: 'doctor-1', nombre: 'Doctor de Prueba' },
  { id: 'doctor-2', nombre: 'Doctor 2' },
  { id: 'doctor-3', nombre: 'Doctor 3' },
  { id: 'doctor-4', nombre: 'Doctor 4' },
];
const DOCTOR_ID_POR_CORREO = {
  'doctor@tecnosalud.com.co': 'doctor-1',
};
const HORAS_ATENCION = [
  { inicio: 8, fin: 12 },
  { inicio: 14, fin: 18 },
];
const DURACION_CITA_MINUTOS = 30;
const app = express();
let citas = [];
let siguienteId = 1;

app.use(cors());
app.use(express.json());

function esDiaHabil(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false;
  const fechaUtc = new Date(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(fechaUtc.getTime()) || fechaUtc.toISOString().slice(0, 10) !== fecha) return false;
  return fechaUtc.getUTCDay() > 0 && fechaUtc.getUTCDay() < 6;
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_API_KEY = process.env.NOTIFICATION_API_KEY || '';

// Delega el envío de correos al notification-service
async function notificar({ to, subject, html }) {
  const respuesta = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': NOTIFICATION_API_KEY, 'x-servicio-origen': 'citas-service' },
    body: JSON.stringify({ to, subject, html }),
  });
  if (!respuesta.ok) throw new Error(`notification-service respondió ${respuesta.status}`);
}

const app = crearApp({
  repo: crearRepositorio(pool),
  jwtSecret: JWT_SECRET,
  frontendUrl: FRONTEND_URL,
  notificar,
  puerto: PORT,
});

app.listen(PORT, () => {
  console.log(`Microservicio de Citas activo en el puerto ${PORT} (/api/citas)`);
});
