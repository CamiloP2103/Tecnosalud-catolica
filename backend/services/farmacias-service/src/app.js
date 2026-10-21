const express = require('express');
const cors = require('cors');
const { requiereSesion, requiereAdmin } = require('./autenticacion');
const { validarSolicitud, validarReglasMedicamentos } = require('./validators');
const { errorBaseDatos } = require('./errores');

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pesos = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

const textoConsulta = (v) => (typeof v === 'string' ? v.trim().slice(0, 60) : '');
const idValido = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// `repo`: ver repositorio.js. `notificar({ to, subject, html })` delega el correo al notification-service.
// `reabastecedor` (opcional, ver reabastecimiento.js) expone el estado del reabastecimiento semanal
function crearApp({ repo, jwtSecret, frontendUrl, notificar, puerto, reabastecedor = null }) {
  const app = express();

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '50kb' }));

  // Envuelve cada ruta: errores de negocio, base de datos caída y errores inesperados
  const manejar = (ruta) => async (req, res) => {
    try {
      await ruta(req, res);
    } catch (error) {
      if (error && error.name === 'ErrorNegocio') {
        return res.status(error.status).json({ error: error.message, ...(error.detalle ? { detalle: error.detalle } : {}) });
      }
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[farmacias-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }
      console.error(`[farmacias-service] Error en ${req.method} ${req.originalUrl}:`, error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  };

  function enviarConfirmacion(usuario, solicitud) {
    const filas = solicitud.items
      .map(
        (i) => `<tr><td style="padding: 6px 0;">${escaparHtml(i.nombre)} ${escaparHtml(i.concentracion)} (${escaparHtml(i.presentacion)})</td>` +
          `<td style="text-align: center;">${i.cantidad}</td><td style="text-align: right;">${pesos(i.subtotal)}</td></tr>`
      )
      .join('');
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #145da0; text-align: center;">Tecnosalud Católica</h2>
      <p>Recibimos tu solicitud de medicamentos <strong>#${solicitud.id}</strong>. Tu pedido está <strong>completado</strong> y llegará en un día.</p>
      <p><strong>Farmacia:</strong> ${escaparHtml(solicitud.farmacia.nombre)} — ${escaparHtml(solicitud.farmacia.direccion)}, ${escaparHtml(solicitud.farmacia.municipio)}<br>
      <strong>Horario:</strong> ${escaparHtml(solicitud.farmacia.horario)}</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><th style="text-align: left;">Medicamento</th><th>Cant.</th><th style="text-align: right;">Subtotal</th></tr>
        ${filas}
        <tr><td colspan="2" style="padding-top: 8px;"><strong>Total</strong></td><td style="text-align: right; padding-top: 8px;"><strong>${pesos(solicitud.total)}</strong></td></tr>
      </table>
      ${solicitud.requiereFormula ? '<p style="color: #b45309;">Recuerda llevar tu fórmula médica en original al reclamar.</p>' : ''}
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Tecnosalud Católica - Portal Institucional de Salud</p>
    </div>`;
    notificar({ to: usuario.email, subject: `Recibimos tu solicitud de medicamentos #${solicitud.id} - Tecnosalud Católica`, html })
      .catch((err) => console.error('[farmacias-service] No se pudo notificar:', err.message));
  }

  const router = express.Router();
  const conSesion = requiereSesion(jwtSecret);

  router.get('/health', (req, res) => {
    res.json({ servicio: 'farmacias-service', estado: 'activo', puerto });
  });

  // ---- Catálogo de medicamentos (público) ----
  router.get('/medicamentos', manejar(async (req, res) => {
    const filtros = { buscar: textoConsulta(req.query.buscar), categoria: textoConsulta(req.query.categoria) };
    if (req.query.requiereFormula === 'true') filtros.requiereFormula = true;
    if (req.query.requiereFormula === 'false') filtros.requiereFormula = false;
    const medicamentos = await repo.listarMedicamentos(filtros);
    res.json({ total: medicamentos.length, medicamentos });
  }));

  router.get('/medicamentos/categorias', manejar(async (req, res) => {
    res.json({ categorias: await repo.listarCategorias() });
  }));

  router.get('/medicamentos/:id', manejar(async (req, res) => {
    const id = idValido(req.params.id);
    const medicamento = id ? await repo.obtenerMedicamento(id) : null;
    if (!medicamento) return res.status(404).json({ error: 'El medicamento no existe.' });
    return res.json(medicamento);
  }));

  // ---- Reabastecimiento semanal (público, solo lectura) ----
  router.get('/reabastecimiento', manejar(async (req, res) => {
    if (!reabastecedor) return res.status(503).json({ error: 'El reabastecimiento no está configurado.' });
    return res.json(await reabastecedor.estado());
  }));

  // ---- Farmacias e inventario (público) ----
  router.get('/sedes', manejar(async (req, res) => {
    const farmacias = await repo.listarFarmacias({ municipio: textoConsulta(req.query.municipio) });
    res.json({ total: farmacias.length, farmacias });
  }));

  router.get('/sedes/:id', manejar(async (req, res) => {
    const id = idValido(req.params.id);
    const farmacia = id ? await repo.obtenerFarmacia(id) : null;
    if (!farmacia) return res.status(404).json({ error: 'La farmacia no existe.' });
    return res.json(farmacia);
  }));

  router.get('/sedes/:id/inventario', manejar(async (req, res) => {
    const id = idValido(req.params.id);
    const farmacia = id ? await repo.obtenerFarmacia(id) : null;
    if (!farmacia) return res.status(404).json({ error: 'La farmacia no existe.' });
    const inventario = await repo.inventarioFarmacia(id, {
      buscar: textoConsulta(req.query.buscar),
      categoria: textoConsulta(req.query.categoria),
      soloDisponibles: req.query.disponibles === 'true',
    });
    return res.json({ farmacia, total: inventario.length, inventario });
  }));

  // ---- Solicitudes (requieren sesión) ----
  router.post('/solicitudes', conSesion, manejar(async (req, res) => {
    const { errores, datos } = validarSolicitud(req.body);
    if (Object.keys(errores).length > 0) return res.status(400).json({ errores });

    const medicamentos = await repo.obtenerMedicamentosPorIds(datos.items.map((i) => i.medicamentoId));
    const reglas = validarReglasMedicamentos(datos.items, medicamentos, datos.formula);
    if (reglas.status) {
      const { status, ...cuerpo } = reglas;
      return res.status(status).json(cuerpo);
    }

    const solicitud = await repo.crearSolicitud({
      usuario: req.usuario,
      farmaciaId: datos.farmaciaId,
      items: datos.items,
      formula: reglas.formula,
      observaciones: datos.observaciones,
    });
    enviarConfirmacion(req.usuario, solicitud); // segundo plano
    return res.status(201).json(solicitud);
  }));

  router.get('/solicitudes', conSesion, manejar(async (req, res) => {
    const solicitudes = await repo.listarSolicitudesUsuario(req.usuario.id);
    res.json({ total: solicitudes.length, solicitudes });
  }));

  router.patch('/solicitudes/:id/cancelar', conSesion, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'La solicitud no existe.' });
    return res.json(await repo.cancelarSolicitud(id, req.usuario.id));
  }));

  // ---- Administración (rol ADMIN) ----
  const soloAdmin = [conSesion, requiereAdmin];

  // Avisa al usuario cuando su pedido está listo para reclamar o fue rechazado
  function avisarCambioPedido(pedido) {
    if (!['LISTA', 'RECHAZADA'].includes(pedido.estado)) return;
    const lista = pedido.estado === 'LISTA';
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #145da0; text-align: center;">Tecnosalud Católica</h2>
      <p>${lista ? 'Tu pedido de medicamentos <strong>#' + pedido.id + '</strong> está <strong>listo para reclamar</strong>.' : 'Tu pedido de medicamentos <strong>#' + pedido.id + '</strong> fue <strong>rechazado</strong> por la farmacia. Las unidades se liberaron y puedes hacer un nuevo pedido.'}</p>
      <p><strong>Farmacia:</strong> ${escaparHtml(pedido.farmacia.nombre)} — ${escaparHtml(pedido.farmacia.direccion)}<br>
      <strong>Horario:</strong> ${escaparHtml(pedido.farmacia.horario)}</p>
      ${lista ? '<p>Lleva tu documento de identidad y, si aplica, la fórmula médica en original.</p>' : ''}
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Tecnosalud Católica - Portal Institucional de Salud</p>
    </div>`;
    notificar({ to: pedido.usuarioEmail, subject: `Tu pedido #${pedido.id} ${lista ? 'está listo para reclamar' : 'fue rechazado'} - Tecnosalud Católica`, html })
      .catch((err) => console.error('[farmacias-service] No se pudo notificar:', err.message));
  }

  router.get('/admin/resumen', ...soloAdmin, manejar(async (req, res) => {
    const resumen = await repo.resumenAdmin();
    res.json({ ...resumen, reabastecimiento: reabastecedor ? await reabastecedor.estado() : null });
  }));

  // ?estado=PENDIENTE|LISTA|ENTREGADA|CANCELADA|RECHAZADA
  router.get('/admin/solicitudes', ...soloAdmin, manejar(async (req, res) => {
    const estado = ['PENDIENTE', 'LISTA', 'ENTREGADA', 'CANCELADA', 'RECHAZADA'].includes(req.query.estado) ? req.query.estado : undefined;
    const solicitudes = await repo.listarSolicitudesAdmin({ estado });
    res.json({ total: solicitudes.length, solicitudes });
  }));

  router.patch('/admin/solicitudes/:id/estado', ...soloAdmin, manejar(async (req, res) => {
    const id = idValido(req.params.id);
    if (!id) return res.status(404).json({ error: 'El pedido no existe.' });
    const estado = String(req.body?.estado || '').toUpperCase();
    if (!['LISTA', 'ENTREGADA', 'RECHAZADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Usa: LISTA, ENTREGADA o RECHAZADA.' });
    }
    const pedido = await repo.cambiarEstadoSolicitud(id, estado);
    avisarCambioPedido(pedido); // segundo plano
    return res.json(pedido);
  }));

  app.use('/api/farmacias', router);

  // JSON mal formado: respuesta clara en lugar de la página de error de Express
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande.' });
    console.error('[farmacias-service] Error no controlado:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  });

  return app;
}

module.exports = { crearApp, escaparHtml };
