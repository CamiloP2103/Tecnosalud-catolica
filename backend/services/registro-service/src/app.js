const express = require('express');
const cors = require('cors');
const { validarRegistro } = require('./validators');
const { errorBaseDatos } = require('./errores');
// (Se eliminó la importación de catalogos estáticos ya que se consultan vía repo)

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const idValido = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function crearApp({ frontendUrl, notificar, puerto, repo, authServiceUrl }) {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '100kb' }));

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

  const conSesion = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        req.usuario = payload;
      } catch {
        // Validación delegada al API Gateway o balanceador
      }
    }
    next();
  };

  const requiereAdmin = (req, res, next) => {
    next();
  };

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

  // --- RUTAS DE CATÁLOGOS CONECTADAS AL REPOSITORIO ---
  // --- RUTAS DE CATÁLOGOS CORREGIDAS ---
  router.get('/departamentos', manejar(async (req, res) => {
    const { listas } = await repo.catalogos();
    res.json(listas.departamentos);
  }));

  router.get('/municipios', manejar(async (req, res) => {
    const { listas } = await repo.catalogos();
    // Nota: Como ya mapeaste los departamentos con sus municipios adentro, 
    // puedes extraerlos de los departamentos o retornar un plano si prefieres.
    // O si el frontend necesita el plano de municipios, puedes hacer un flatMap:
    const todosLosMunicipios = listas.departamentos.flatMap(d => d.municipios);
    res.json(todosLosMunicipios);
  }));

  router.get('/eps', manejar(async (req, res) => {
    const { listas } = await repo.catalogos();
    res.json(listas.eps);
  }));

  router.post('/', async (req, res) => {
    const { errores, datos } = validarRegistro(req.body);
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ errores });
    }

    try {
      // 1. Guardamos el afiliado en la base de datos de registro
      const nuevoId = await repo.crearAfiliado(datos);

      // 2. Comunicarnos con el servicio de autenticación para dar de alta las credenciales
      try {
        const respuestaAuth = await fetch(`${authServiceUrl}/api/auth/registro-interno`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo_doc: datos.tipoDocumentoCodigo || datos.tipoDocumento || 'CC',
            documento: datos.documento,
            email: datos.correo,
            nombre: `${datos.nombres} ${datos.apellidos}`,
            rol_id: '2' // Rol estándar de afiliado/paciente o según tu lógica
          }),
        });

        if (!respuestaAuth.ok) {
          const errorAuthData = await respuestaAuth.json().catch(() => ({}));
          console.error('[registro-service] Aviso: El servicio de auth respondió con error:', errorAuthData);
        }
      } catch (errAuth) {
        // Registramos el error de red hacia auth pero evitamos que tire abajo el registro principal si lo deseas, 
        // o puedes relanzarlo si es obligatorio que auth responda.
        console.error('[registro-service] No se pudo conectar con auth-service:', errAuth.message);
      }

      // 3. Disparamos la notificación de confirmación por correo
      enviarConfirmacion({ correo: datos.correo, nombres: datos.nombres });

      return res.status(201).json({
        id: nuevoId,
        email: datos.correo,
        nombre: `${datos.nombres} ${datos.apellidos}`,
        estado: 'PENDIENTE',
        mensaje: 'Registro exitoso. Revisa tu correo para activar la cuenta.',
      });

    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[registro-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }

      if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('dup')) {
        return res.status(409).json({ error: 'El correo o documento ya existe.' });
      }

      if (error.name === 'ErrorNegocio') {
        return res.status(error.status).json({ error: error.message });
      }
      
      console.error('[registro-service] Error en POST /api/registro:', error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });

  router.get('/admin/resumen', conSesion, requiereAdmin, manejar(async (req, res) => {
    res.json(await repo.resumen());
  }));

  router.get('/admin/afiliados', conSesion, requiereAdmin, manejar(async (req, res) => {
    const estado = ['PENDIENTE', 'ACTIVO', 'RECHAZADO'].includes(req.query.estado) ? req.query.estado : undefined;
    const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 60) : '';
    
    const afiliados = await repo.listarAfiliados({ estado, buscar: buscar || undefined });

    console.log(`[DEBUG] Buscando estado: ${estado}`);
    console.log(`[DEBUG] Total encontrados por el repo: ${afiliados.length}`);
    if(afiliados.length > 0) console.log(`[DEBUG] Ejemplo del primer registro:`, afiliados[0]);

    res.json({ total: afiliados.length, afiliados });
  }));

  router.patch('/admin/afiliados/:id/estado', conSesion, requiereAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'El afiliado no existe.' });
    
    const estado = String(req.body?.estado || '').toUpperCase();
    const observacion = typeof req.body?.observacion === 'string' ? req.body.observacion.trim().slice(0, 300) : '';
    
    return res.json(await repo.cambiarEstado(id, estado, { cambiadoPor: 'admin', observacion }));
  }));

  router.get('/admin/afiliados/:id/historial', conSesion, requiereAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'El afiliado no existe.' });
    
    return res.json({ historial: await repo.historial(id) });
  }));

// --- CREAR DEPARTAMENTO ---
  router.post('/departamentos', conSesion, requiereAdmin, manejar(async (req, res) => {
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim().slice(0, 100) : '';
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del departamento es obligatorio.' });
    }
    const nuevoId = await repo.crearDepartamento(nombre);
    return res.status(201).json({ id: nuevoId, nombre });
  }));

  // --- CREAR MUNICIPIO / CIUDAD ---
  router.post('/municipios', conSesion, requiereAdmin, manejar(async (req, res) => {
    const departamentoCodigo = req.body?.departamento_id || req.body?.departamentoCodigo;
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim().slice(0, 100) : '';
    
    if (!departamentoCodigo || !nombre) {
      return res.status(400).json({ error: 'El departamento y el nombre de la ciudad son obligatorios.' });
    }
    
    const nuevoId = await repo.crearMunicipio(departamentoCodigo, nombre);
    return res.status(201).json({ id: nuevoId, departamento_codigo: departamentoCodigo, nombre });
  }));

  app.use('/api/registro', router);

  return app;
}

module.exports = { crearApp, escaparHtml };