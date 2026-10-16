import express from 'express';
import { timingSafeEqual } from 'node:crypto';

// Compara la clave recibida con la esperada sin filtrar información por tiempo de respuesta
function claveValida(recibida, esperada) {
  if (typeof recibida !== 'string') return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function crearApp({ transporter, apiKey, emailFrom, puerto }) {
  const app = express();

  // Servicio interno: solo lo llaman auth-service y registro-service, nunca el navegador (sin CORS)
  app.use(express.json({ limit: '200kb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ servicio: 'notification-service', estado: 'activo', puerto });
  });

  // Solo los microservicios que conocen NOTIFICATION_API_KEY pueden enviar correos
  app.use('/api/notifications', (req, res, next) => {
    if (!claveValida(req.get('x-api-key'), apiKey)) {
      return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
    }
    return next();
  });

  // Endpoint transversal para envío de correos
  app.post('/api/notifications/email', async (req, res) => {
    const { to, subject, html, text } = req.body || {};

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Los campos to, subject y html/text son obligatorios',
      });
    }

    try {
      const info = await transporter.sendMail({
        from: emailFrom,
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
      });
    }
  });

  return app;
}
