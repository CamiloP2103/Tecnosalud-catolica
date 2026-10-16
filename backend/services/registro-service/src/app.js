const express = require('express');
const cors = require('cors');
const { validarRegistro } = require('./validators');

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// `notificar({ to, subject, html })` delega el envío al notification-service y devuelve una promesa
function crearApp({ pool, frontendUrl, notificar, puerto }) {
  const app = express();

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '100kb' }));

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

  router.get('/health', (req, res) => {
    res.json({ servicio: 'registro-service', estado: 'activo', puerto });
  });

  router.post('/', async (req, res) => {
    const { errores, datos } = validarRegistro(req.body);
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ errores });
    }

    try {
      const [resultado] = await pool.execute(
        `INSERT INTO afiliados
          (nombres, apellidos, tipo_doc, documento, fecha_nacimiento, genero, correo, telefono,
           direccion, ciudad, tipo_afiliacion, eps, regimen,
           contacto_emergencia_nombre, contacto_emergencia_telefono, acepta_tratamiento_datos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          datos.nombres, datos.apellidos, datos.tipoDocumento, datos.documento, datos.fechaNacimiento,
          datos.genero, datos.correo, datos.telefono, datos.direccion, datos.ciudad,
          datos.tipoAfiliacion, datos.eps, datos.regimen,
          datos.contactoEmergenciaNombre, datos.contactoEmergenciaTelefono,
        ]
      );

      enviarConfirmacion({ correo: datos.correo, nombres: datos.nombres }); // segundo plano

      return res.status(201).json({
        id: resultado.insertId,
        email: datos.correo,
        nombre: `${datos.nombres} ${datos.apellidos}`,
        estado: 'PENDIENTE',
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'El correo o el documento ya está registrado.' });
      }
      console.error('[registro-service] Error en POST /api/registro:', error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });

  app.use('/api/registro', router);

  return app;
}

module.exports = { crearApp, escaparHtml };
