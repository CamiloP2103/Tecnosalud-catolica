import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

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

// Endpoint transversal para envío de correos
app.post('/api/notifications/email', async (req, res) => {
  const { to, subject, html, text } = req.body;

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Los campos to, subject y html/text son obligatorios',
    });
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: text || '',
      html: html || `<p>${text}</p>`,
    });

    console.log(`[Notification-Service] Correo enviado a ${to}. ID: ${info.messageId}`);
    return res.json({
      exito: true,
      mensaje: 'Notificación enviada satisfactoriamente',
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('[Notification-Service] Error enviando correo:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Fallo al despachar el correo electrónico',
      error: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ servicio: 'notification-service', estado: 'activo', puerto: PORT });
});

app.listen(PORT, () => {
  console.log(`🚀 Notification Service activo en http://localhost:${PORT}`);
});
