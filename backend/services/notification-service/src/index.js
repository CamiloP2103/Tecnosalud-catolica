import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { crearApp } from './app.js';
import pool from './config/db.js';
import { crearHistorial } from './historial.js';

dotenv.config();

const PORT = process.env.PORT || 3005;

if (!process.env.NOTIFICATION_API_KEY) {
  console.error('[Notification-Service] Falta NOTIFICATION_API_KEY en el archivo .env (ver .env.example).');
  process.exit(1);
}

// Configuración del transporter Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const app = crearApp({
  transporter,
  apiKey: process.env.NOTIFICATION_API_KEY,
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER,
  puerto: PORT,
  historial: crearHistorial(pool),
});

app.listen(PORT, () => {
  console.log(`🚀 Notification Service activo en http://localhost:${PORT}`);
});
