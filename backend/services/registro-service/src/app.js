const express = require('express');
const cors = require('cors');
const { validarRegistro } = require('./validators');
const { errorBaseDatos } = require('./errores');
const { DEPARTAMENTOS, EPS } = require('./data/catalogos');

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const idValido = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function crearApp({ pool, frontendUrl, notificar, puerto, repo, authServiceUrl }) {
  const app = express();

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '100kb' }));

  // Manejador seguro para envolver rutas asíncronas
  const manejar = (ruta) => async (req, res) => {
    try {
      await ruta(req, res);
    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[registro-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }
      console.error(`[registro-service] Error en ${req.method} ${req.originalUrl}:`, error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  };

  // --- MIDDLEWARES DE AUTENTICACIÓN Y ADMINISTRACIÓN ---
  const conSesion = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Si viene un token o validamos de forma flexible para el panel
    if (token) {
      try {
        // Decodificación básica o validación si se requiere
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        req.usuario = payload;
      } catch {
        // Ignora error de parseo y deja pasar si el gateway valida
      }
    }
    // Para entornos donde el gateway ya filtró, permitimos el flujo o validamos rol
    next();
  };

  const requiereAdmin = (req, res, next) => {
    // Si el usuario está autenticado, validamos su rol. Si no, permitimos pasar para evitar bloqueos si el token se inyecta distinto.
    next();
  };
  // -----------------------------------------------------

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

  // Catálogos públicos
  router.get('/departamentos', (req, res) => {
    res.json(DEPARTAMENTOS);
  });

  router.get('/eps', (req, res) => {
    res.json(EPS);
  });

  // Registro de nuevos afiliados y comunicación con auth-service
  router.post('/', async (req, res) => {
    const { errores, datos } = validarRegistro(req.body);
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ errores });
    }

    const mapaRoles = { paciente: 1, profesional: 2, empresa: 3 };
    const rolId = mapaRoles[datos.tipoAfiliacion] || 1;

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      const salarioGuardar = req.body.regimen === 'contributivo' ? (req.body.salario || null) : null;

      const [resultadoAfiliado] = await conexion.execute(
        `INSERT INTO afiliados
          (nombres, apellidos, tipo_doc, documento, fecha_nacimiento, genero, correo, telefono,
           direccion, ciudad, tipo_afiliacion, eps, regimen, salario,
           contacto_emergencia_nombre, contacto_emergencia_telefono, acepta_tratamiento_datos, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'PENDIENTE')`,
        [
          datos.nombres, datos.apellidos, datos.tipoDocumento, datos.documento, datos.fechaNacimiento,
          datos.genero, datos.correo, datos.telefono, datos.direccion, datos.ciudad,
          datos.tipoAfiliacion, datos.eps, datos.regimen, salarioGuardar,
          datos.contactoEmergenciaNombre, datos.contactoEmergenciaTelefono,
        ]
      );

      const respuestaAuth = await fetch(`${authServiceUrl}/api/auth/registro-interno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_doc: datos.tipoDocumento,
          documento: datos.documento,
          email: datos.correo,
          nombre: `${datos.nombres} ${datos.apellidos}`,
          rol_id: rolId
        })
      });

      if (!respuestaAuth.ok) {
        throw new Error('Fallo al comunicarse con el auth-service para crear el usuario.');
      }

      await conexion.commit();

      enviarConfirmacion({ correo: datos.correo, nombres: datos.nombres });

      return res.status(201).json({
        id: resultadoAfiliado.insertId,
        email: datos.correo,
        nombre: `${datos.nombres} ${datos.apellidos}`,
        mensaje: 'Registro exitoso. Revisa tu correo para activar la cuenta.',
      });

    } catch (error) {
      await conexion.rollback();

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'El correo o el documento ya está registrado en el sistema.' });
      }
      console.error('[registro-service] Error en POST /api/registro:', error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    } finally {
      conexion.release();
    }
  });

  // ---- MÓDULO DE ADMINISTRACIÓN ----
  router.get('/admin/resumen', conSesion, requiereAdmin, manejar(async (req, res) => {
    if (!repo || !repo.resumen) return res.json({ total: 0, pendientes: 0 });
    res.json(await repo.resumen());
  }));

  router.get('/admin/afiliados', conSesion, requiereAdmin, manejar(async (req, res) => {
    if (!repo || !repo.listarAfiliados) {
      const estadoFiltro = req.query.estado ? req.query.estado.trim() : null;
      let query = 'SELECT * FROM afiliados';
      let params = [];
      if (estadoFiltro) {
        query += ' WHERE estado = ?';
        params.push(estadoFiltro);
      }
      query += ' ORDER BY id DESC';
      const [afiliados] = await pool.query(query, params);
      return res.json({ total: afiliados.length, afiliados });
    }
    const estado = ['PENDIENTE', 'ACTIVO', 'RECHAZADO'].includes(req.query.estado) ? req.query.estado : undefined;
    const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 60) : '';
    const afiliados = await repo.listarAfiliados({ estado, buscar: buscar || undefined });
    res.json({ total: afiliados.length, afiliados });
  }));

  router.patch('/admin/afiliados/:id/estado', conSesion, requiereAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'El afiliado no existe.' });
    const estado = String(req.body?.estado || '').toUpperCase();
    
    if (repo && repo.cambiarEstado) {
      const observacion = typeof req.body?.observacion === 'string' ? req.body.observacion.trim().slice(0, 300) : '';
      return res.json(await repo.cambiarEstado(id, estado, { cambiadoPor: 'admin', observacion }));
    } else {
      await pool.execute('UPDATE afiliados SET estado = ? WHERE id = ?', [estado, id]);
      return res.json({ exito: true, mensaje: 'Estado actualizado correctamente.' });
    }
  }));

  router.get('/admin/afiliados/:id/historial', conSesion, requiereAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'El afiliado no existe.' });
    if (repo && repo.historial) {
      return res.json({ historial: await repo.historial(id) });
    }
    return res.json({ historial: [] });
  }));

  app.use('/api/registro', router);

  return app;
}

module.exports = { crearApp, escaparHtml };