const express = require('express');
const cors = require('cors');
const { validarRegistro } = require('./validators');
const { requiereSesion, requiereAdmin } = require('./autenticacion');
const { errorBaseDatos } = require('./errores');

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const idValido = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// `repo`: ver repositorio.js. `notificar({ to, subject, html })` delega el envío al notification-service.
function crearApp({ repo, jwtSecret, frontendUrl, notificar, puerto }) {
  const app = express();

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '100kb' }));

  const manejar = (ruta) => async (req, res) => {
    try {
      await ruta(req, res);
    } catch (error) {
      if (error && error.name === 'ErrorNegocio') return res.status(error.status).json({ error: error.message });
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[registro-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }
      console.error(`[registro-service] Error en ${req.method} ${req.originalUrl}:`, error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  };

  // Llama al notification-service sin bloquear la respuesta al usuario
  function enviarConfirmacion({ correo, nombres }) {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #145da0; text-align: center;">Tecnosalud Católica</h2>
      <p>Hola, <strong>${escaparHtml(nombres)}</strong>.</p>
      <p>Recibimos tu solicitud de afiliación. Está en estado <strong>pendiente</strong> y te contactaremos pronto.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Tecnosalud Católica - Portal Institucional de Salud</p>
    </div>`;
    notificar({ to: correo, subject: 'Recibimos tu solicitud de afiliación - Tecnosalud Católica', html }).catch((err) => {
      console.error('[registro-service] No se pudo notificar:', err.message);
    });
  }

  const router = express.Router();
  const conSesion = requiereSesion(jwtSecret);

  router.get('/health', (req, res) => {
    res.json({ servicio: 'registro-service', estado: 'activo', puerto });
  });

  // Catálogos colombianos para el formulario (tipos de documento, departamentos y municipios, EPS...)
  router.get('/catalogos', manejar(async (req, res) => {
    res.json((await repo.catalogos()).listas);
  }));

  router.post('/', manejar(async (req, res) => {
    const { validos } = await repo.catalogos();
    const { errores, datos } = validarRegistro(req.body, validos);
    if (Object.keys(errores).length > 0) return res.status(400).json({ errores });

    const id = await repo.crearAfiliado(datos);
    enviarConfirmacion({ correo: datos.correo, nombres: datos.nombres }); // segundo plano
    return res.status(201).json({
      id,
      email: datos.correo,
      nombre: `${datos.nombres} ${datos.apellidos}`,
      estado: 'PENDIENTE',
    });
  }));

  // ---- Administración (rol ADMIN) ----
  router.get('/admin/resumen', conSesion, requiereAdmin, manejar(async (req, res) => {
    res.json(await repo.resumen());
  }));

  // ?estado=PENDIENTE|ACTIVO|RECHAZADO&buscar=texto
  router.get('/admin/afiliados', conSesion, requiereAdmin, manejar(async (req, res) => {
    const estado = ['PENDIENTE', 'ACTIVO', 'RECHAZADO'].includes(req.query.estado) ? req.query.estado : undefined;
    const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 60) : '';
    const afiliados = await repo.listarAfiliados({ estado, buscar: buscar || undefined });
    res.json({ total: afiliados.length, afiliados });
  }));

  router.patch('/admin/afiliados/:id/estado', conSesion, requiereAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'El afiliado no existe.' });
    const estado = String(req.body?.estado || '').toUpperCase();
    const observacion = typeof req.body?.observacion === 'string' ? req.body.observacion.trim().slice(0, 300) : '';
    return res.json(await repo.cambiarEstado(id, estado, { cambiadoPor: req.usuario.email, observacion }));
  }));

  router.get('/admin/afiliados/:id/historial', conSesion, requiereAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'El afiliado no existe.' });
    return res.json({ historial: await repo.historial(id) });
  }));

  app.use('/api/registro', router);

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
    console.error('[registro-service] Error no controlado:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  });

  return app;
}

module.exports = { crearApp, escaparHtml };
