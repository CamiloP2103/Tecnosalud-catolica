import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import mysql from 'mysql2/promise';
import { crearApp } from './app.js';       // Importamos desde app_5.js
import { crearHistorial } from './historial.js'; // Importamos desde historial_3.js

dotenv.config();

const PORT = process.env.PORT || 8080;

// Configuración de la Base de Datos para el historial de notificaciones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'db_notificaciones',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  // 👇 ESTO ES LO QUE FALTA PARA CUMPLIR CON EL REQUISITO DE AZURE
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
});

const historial = crearHistorial(pool);

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

// Creamos la aplicación Express usando la fábrica de app_5.js que incluye /api/notifications/admin/resumen
const app = crearApp({
  transporter,
  apiKey: process.env.NOTIFICATION_API_KEY,
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER,
  puerto: PORT,
  historial,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'https://tecnosaludweb2026.z15.web.core.windows.net',
});

app.listen(PORT, () => {
  console.log(`🚀 Notification Service activo tecnosalud en el puerto ${PORT}`);
});