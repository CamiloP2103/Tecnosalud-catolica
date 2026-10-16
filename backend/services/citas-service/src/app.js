const express = require('express');
const cors = require('cors');
const { requiereSesion, requiereAdmin } = require('./autenticacion');
const { ahoraBogota, sumarDias, esFechaValida, franjasLibres, validarFranja } = require('./agenda');
const { errorBaseDatos } = require('./errores');

const ESTADOS_ADMIN = ['ATENDIDA', 'NO_ASISTIO', 'CANCELADA'];

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const idValido = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const fechaLegible = (fecha) =>
  new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// `repo`: ver repositorio.js. `notificar({ to, subject, html })` delega el correo al notification-service.
// `reloj` permite fijar la fecha en las pruebas.
function crearApp({ repo, jwtSecret, frontendUrl, notificar, puerto, reloj = () => new Date() }) {
  const app = express();
  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '20kb' }));

  const manejar = (ruta) => async (req, res) => {
    try {
      await ruta(req, res);
    } catch (error) {
      if (error && error.name === 'ErrorNegocio') return res.status(error.status).json({ error: error.message });
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[citas-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }
      console.error(`[citas-service] Error en ${req.method} ${req.originalUrl}:`, error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  };

  // Franjas libres de los médicos que cumplen el filtro
  async function calcularDisponibilidad({ especialidadId, sedeId, medicoId, desde, dias }) {
    const medicos = await repo.listarMedicos({ especialidadId, sedeId, medicoId });
    const ids = medicos.map((m) => m.id);
    const hasta = sumarDias(desde, dias - 1);
    const [horarios, ocupadas] = await Promise.all([repo.horarios(ids), repo.ocupadas(ids, desde, hasta)]);
    const libres = franjasLibres({ medicos, horarios, ocupadas, desde, dias, ahora: ahoraBogota(reloj()) });
    const porId = new Map(medicos.map((m) => [m.id, m]));
    return { medicos, ocupadas, libres: libres.map((f) => ({ ...f, medico: porId.get(f.medicoId) })) };
  }

  function enviarConfirmacion(usuario, cita) {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #145da0; text-align: center;">Tecnosalud Católica</h2>
      <p>Tu cita médica quedó <strong>programada</strong>.</p>
      <p><strong>Especialidad:</strong> ${escaparHtml(cita.especialidad)}<br>
      <strong>Profesional:</strong> ${escaparHtml(cita.medico)}<br>
      <strong>Fecha:</strong> ${escaparHtml(fechaLegible(cita.fecha))}<br>
      <strong>Hora:</strong> ${escaparHtml(cita.hora)}<br>
      <strong>Sede:</strong> ${escaparHtml(cita.sede)}</p>
      <p style="color: #475569;">Llega 15 minutos antes con tu documento de identidad. Si no puedes asistir, cancela la cita desde el portal.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Tecnosalud Católica - Portal Institucional de Salud</p>
    </div>`;
    notificar({ to: usuario.email, subject: `Cita programada: ${cita.especialidad} el ${cita.fecha} a las ${cita.hora} - Tecnosalud Católica`, html })
      .catch((err) => console.error('[citas-service] No se pudo notificar:', err.message));
  }

  const router = express.Router();
  const conSesion = requiereSesion(jwtSecret);

  router.get('/health', (req, res) => res.json({ servicio: 'citas-service', estado: 'activo', puerto }));

  // ---- Catálogo público ----
  router.get('/especialidades', manejar(async (req, res) => res.json({ especialidades: await repo.listarEspecialidades() })));
  router.get('/sedes', manejar(async (req, res) => res.json({ sedes: await repo.listarSedes() })));
  router.get('/medicos', manejar(async (req, res) => {
    const medicos = await repo.listarMedicos({ especialidadId: idValido(req.query.especialidadId), sedeId: idValido(req.query.sedeId) });
    res.json({ medicos: medicos.map(({ duracion_min: duracionMin, ...m }) => ({ ...m, duracionMin })) });
  }));

  // ?especialidadId=&sedeId=&medicoId=&desde=AAAA-MM-DD&dias=7 (máximo 14)
  router.get('/disponibilidad', manejar(async (req, res) => {
    const hoy = ahoraBogota(reloj()).fecha;
    const desde = esFechaValida(req.query.desde) && req.query.desde > hoy ? req.query.desde : hoy;
    const dias = Math.min(Math.max(Number.parseInt(req.query.dias, 10) || 7, 1), 14);
    const { libres } = await calcularDisponibilidad({
      especialidadId: idValido(req.query.especialidadId),
      sedeId: idValido(req.query.sedeId),
      medicoId: idValido(req.query.medicoId),
      desde,
      dias,
    });
    res.json({
      desde,
      dias,
      total: libres.length,
      franjas: libres.slice(0, 500).map((f) => ({
        fecha: f.fecha,
        hora: f.hora,
        medico: { id: f.medico.id, nombre: f.medico.nombre },
        especialidad: f.medico.especialidad,
        sede: { id: f.medico.sedeId, nombre: f.medico.sede },
      })),
    });
  }));

  // ---- Citas del usuario (requieren sesión) ----
  router.post('/citas', conSesion, manejar(async (req, res) => {
    const medicoId = idValido(req.body?.medicoId);
    const fecha = String(req.body?.fecha || '');
    const hora = String(req.body?.hora || '');
    const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim().slice(0, 300) : '';
    if (!medicoId) return res.status(400).json({ error: 'Debes elegir un médico.' });

    const [medico] = await repo.listarMedicos({ medicoId });
    if (!medico) return res.status(404).json({ error: 'El médico no existe.' });
    const ahora = ahoraBogota(reloj());
    const error = validarFranja({ medico, horarios: await repo.horarios([medicoId]), fecha, hora, ahora });
    if (error) return res.status(400).json({ error });

    const cita = await repo.crearCita({ usuario: req.usuario, medicoId, fecha, hora, motivo: motivo || null, hoy: ahora.fecha });
    enviarConfirmacion(req.usuario, cita); // segundo plano
    return res.status(201).json(cita);
  }));

  router.get('/citas', conSesion, manejar(async (req, res) => {
    const citas = await repo.listarCitasUsuario(req.usuario.id);
    res.json({ total: citas.length, citas });
  }));

  router.patch('/citas/:id/cancelar', conSesion, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'La cita no existe.' });
    return res.json(await repo.cancelarCita(id, req.usuario.id, ahoraBogota(reloj())));
  }));

  // ---- Administración (rol ADMIN) ----
  router.get('/admin/resumen', conSesion, requiereAdmin, manejar(async (req, res) => {
    const hoy = ahoraBogota(reloj()).fecha;
    const finSemana = sumarDias(hoy, 6);
    const [citasHoy, conteosSemana, disponibilidad, especialidades] = await Promise.all([
      repo.listarCitasAdmin({ desde: hoy, hasta: hoy }),
      repo.conteosPorEstado(hoy, finSemana),
      calcularDisponibilidad({ desde: hoy, dias: 7 }),
      repo.listarEspecialidades(),
    ]);
    const reservadas = conteosSemana.PROGRAMADA || 0;
    const libres = disponibilidad.libres.length;

    const porEspecialidad = especialidades.map((e) => {
      const libresEsp = disponibilidad.libres.filter((f) => f.medico.especialidadId === e.id);
      return {
        id: e.id,
        nombre: e.nombre,
        medicos: e.medicos,
        franjasLibres: libresEsp.length,
        proximaDisponible: libresEsp[0] ? { fecha: libresEsp[0].fecha, hora: libresEsp[0].hora, medico: libresEsp[0].medico.nombre } : null,
      };
    });

    res.json({
      hoy,
      semana: { desde: hoy, hasta: finSemana, porEstado: conteosSemana },
      ocupacion: {
        reservadas,
        libres,
        porcentaje: reservadas + libres > 0 ? Math.round((reservadas / (reservadas + libres)) * 100) : 0,
      },
      medicos: disponibilidad.medicos.length,
      porEspecialidad,
      citasHoy,
    });
  }));

  // ?desde=&hasta=&estado=
  router.get('/admin/citas', conSesion, requiereAdmin, manejar(async (req, res) => {
    const hoy = ahoraBogota(reloj()).fecha;
    const desde = esFechaValida(req.query.desde) ? req.query.desde : hoy;
    const hasta = esFechaValida(req.query.hasta) ? req.query.hasta : sumarDias(desde, 6);
    const estado = ['PROGRAMADA', ...ESTADOS_ADMIN].includes(req.query.estado) ? req.query.estado : undefined;
    const citas = await repo.listarCitasAdmin({ desde, hasta, estado });
    res.json({ desde, hasta, total: citas.length, citas });
  }));

  router.patch('/admin/citas/:id/estado', conSesion, requiereAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    const estado = String(req.body?.estado || '').toUpperCase();
    if (!id) return res.status(404).json({ error: 'La cita no existe.' });
    if (!ESTADOS_ADMIN.includes(estado)) return res.status(400).json({ error: `Estado inválido. Usa: ${ESTADOS_ADMIN.join(', ')}.` });
    return res.json(await repo.cambiarEstado(id, estado));
  }));

  app.use('/api/citas', router);

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
    console.error('[citas-service] Error no controlado:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  });

  return app;
}

module.exports = { crearApp };
