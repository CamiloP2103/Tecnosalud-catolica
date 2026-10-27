import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { errorBaseDatos } from './errores.js';

// Compara la clave recibida con la esperada sin filtrar información por tiempo de respuesta
function claveValida(recibida, esperada) {
  if (typeof recibida !== 'string') return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Nombre del microservicio que pide el correo (cabecera x-servicio-origen), saneado para el historial
const servicioOrigen = (req) => String(req.get('x-servicio-origen') || 'desconocido').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'desconocido';

export function crearApp({ transporter, apiKey, emailFrom, puerto, historial = null, jwtSecret, frontendUrl = 'http://localhost:5173' }) {
  const app = express();

  // Guarda el resultado del envío sin afectar la respuesta si la base de datos falla
  function registrar(datos) {
    if (!historial) return;
    historial.registrar(datos).catch((error) => {
      console.error('[Notification-Service] No se pudo guardar el historial:', error.code || error.message);
    });
  }

  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ servicio: 'notification-service', estado: 'activo', puerto });
  });

  // 1. Panel de administración: lo llama el navegador con el JWT de auth-service (rol ADMIN).
  // Se registra ANTES de la verificación de x-api-key y tiene CORS abierto para el frontend.
  app.get('/api/notifications/admin/resumen', cors({ origin: frontendUrl }), async (req, res) => {
    const [tipo, token] = String(req.get('authorization') || '').split(' ');
    if (!jwtSecret || !historial) return res.status(503).json({ error: 'El panel de notificaciones no está configurado (JWT_SECRET o base de datos).' });
    if (tipo !== 'Bearer' || !token) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    let usuario;
    try {
      usuario = jwt.verify(token, jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Tu sesión expiró o no es válida. Inicia sesión de nuevo.' });
    }
    if (String(usuario.rol || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo un administrador puede acceder a esta información.' });
    }
    try {
      return res.json(await historial.resumen());
    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) return res.status(503).json({ error: mensajeBD });
      console.error('[Notification-Service] Error en el resumen:', error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });
  app.options('/api/notifications/admin/resumen', cors({ origin: frontendUrl }));

  // 2. Middleware de seguridad: Solo los microservicios internos que conocen NOTIFICATION_API_KEY pueden acceder a las rutas siguientes
  app.use('/api/notifications', (req, res, next) => {
    if (!claveValida(req.get('x-api-key'), apiKey)) {
      return res.status(401).json({ exito: false, mensaje: 'No autorizado' });
    }
    return next();
  });

  // 3. Endpoint transversal para envío de correos
  app.post('/api/notifications/email', async (req, res) => {
    console.log('[Notification-Service] RECIBIDO REQ.BODY:', JSON.stringify(req.body));

    const { to, subject, html, text, attachments, adjuntos } = req.body || {};

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Los campos to, subject y html/text son obligatorios',
      });
    }

    try {
      let listaAdjuntos = [];
      const fuenteAdjuntos = attachments || adjuntos;
      
      if (Array.isArray(fuenteAdjuntos)) {
        listaAdjuntos = fuenteAdjuntos.map(adj => {
          const contenidoBuffer = Buffer.from(adj.content || adj.contenidoBase64, 'base64');
          console.log(`[Notification-Service] Procesando adjunto: ${adj.filename || adj.nombre} | Tamaño del Buffer: ${contenidoBuffer.length} bytes`);

          return {
            filename: adj.filename || adj.nombre || 'constancia-registro.pdf',
            content: contenidoBuffer,
            contentType: adj.contentType || adj.tipo || 'application/pdf'
          };
        });
      }

      const info = await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        text: text || '',
        html: html || `<p>${text}</p>`,
        attachments: listaAdjuntos,
      });

      console.log(`[Notification-Service] Correo enviado a ${to}. ID: ${info.messageId}`);
      registrar({ destinatario: to, asunto: subject, servicioOrigen: servicioOrigen(req), estado: 'ENVIADA', messageId: info.messageId });
      return res.json({
        exito: true,
        mensaje: 'Notificación enviada satisfactoriamente',
        messageId: info.messageId,
      });
    } catch (error) {
      console.error('[Notification-Service] Error enviando correo:', error);
      registrar({ destinatario: to, asunto: subject, servicioOrigen: servicioOrigen(req), estado: 'FALLIDA', error: error.code || error.message });
      return res.status(500).json({
        exito: false,
        mensaje: 'Fallo al despachar el correo electrónico',
      });
    }
  });

  // 4. Historial de envíos interno
  app.get('/api/notifications/historial', async (req, res) => {
    if (!historial) return res.status(503).json({ exito: false, mensaje: 'El historial no está configurado.' });
    const limite = Math.min(Math.max(Number.parseInt(req.query.limite, 10) || 50, 1), 200);
    const estado = ['ENVIADA', 'FALLIDA'].includes(req.query.estado) ? req.query.estado : undefined;
    const destinatario = typeof req.query.destinatario === 'string' ? req.query.destinatario.trim().toLowerCase() : undefined;
    try {
      const notificaciones = await historial.listar({ limite, destinatario: destinatario || undefined, estado });
      return res.json({ exito: true, total: notificaciones.length, notificaciones });
    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) return res.status(503).json({ exito: false, mensaje: mensajeBD });
      console.error('[Notification-Service] Error consultando historial:', error);
      return res.status(500).json({ exito: false, mensaje: 'Error interno en el servidor.' });
    }
  });

  return app;
}