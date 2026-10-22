import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
// Aumentamos el límite de JSON para que el PDF no sature la petición
app.use(express.json({ limit: '1mb' }));

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

// Endpoint transversal para envío de correos con soporte de adjuntos
app.post('/api/notifications/email', async (req, res) => {
  console.log('[Notification-Service] RECIBIDO REQ.BODY con adjuntos:', Object.keys(req.body));

  const { to, subject, html, text, attachments, adjuntos } = req.body || {};

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Los campos to, subject y html/text son obligatorios',
    });
  }

  try {
    // Preparamos los archivos adjuntos de forma robusta
    let listaAdjuntos = [];
    const fuenteAdjuntos = attachments || adjuntos;
    
    if (Array.isArray(fuenteAdjuntos)) {
      listaAdjuntos = fuenteAdjuntos.map(adj => {
        const contenidoBuffer = Buffer.from(adj.content || adj.contenidoBase64, 'base64');
        console.log(`[Notification-Service] Procesando adjunto: ${adj.filename || adj.nombre} | Tamaño: ${contenidoBuffer.length} bytes`);

        return {
          filename: adj.filename || adj.nombre || 'constancia-registro.pdf',
          content: contenidoBuffer,
          contentType: adj.contentType || adj.tipo || 'application/pdf'
        };
      });
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: text || '',
      html: html || `<p>${text}</p>`,
      attachments: listaAdjuntos,
    });

    console.log(`[Notification-Service] Correo enviado a ${to} con ${listaAdjuntos.length} adjuntos. ID: ${info.messageId}`);
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