// Rutas de administración de auth-service (solo rol ADMIN): usuarios, roles y accesos.
const express = require('express');
const { requiereSesion, requiereAdmin } = require('./autenticacion');
const { errorBaseDatos } = require('./errores');

const numero = (v) => Number(v || 0);

function crearRutasAdmin({ pool, jwtSecret, constancias }) {
  const router = express.Router();
  router.use(requiereSesion(jwtSecret), requiereAdmin);

  const manejar = (ruta) => async (req, res) => {
    try {
      await ruta(req, res);
    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) return res.status(503).json({ error: mensajeBD });
      console.error(`[auth-service] Error en ${req.method} ${req.originalUrl}:`, error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  };

  // Usuarios por rol, cuentas bloqueadas y accesos de las últimas 24 horas
  router.get('/resumen', manejar(async (req, res) => {
    const [[usuarios]] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(activo = TRUE) AS activos, SUM(activo = FALSE) AS inactivos,
              SUM(bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueados,
              SUM(creado_en >= NOW() - INTERVAL 7 DAY) AS nuevos7Dias
       FROM usuarios`
    );
    const [porRol] = await pool.query(
      `SELECT r.nombre AS rol, COUNT(u.id) AS total FROM roles r LEFT JOIN usuarios u ON u.rol_id = r.id
       GROUP BY r.id ORDER BY r.id`
    );
    const [[accesos]] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(exitoso = TRUE) AS exitosos, SUM(exitoso = FALSE) AS fallidos
       FROM bitacora_acceso WHERE fecha_intento >= NOW() - INTERVAL 1 DAY`
    );
    const [porMotivo] = await pool.query(
      `SELECT motivo_fallo AS motivo, COUNT(*) AS total FROM bitacora_acceso
       WHERE exitoso = FALSE AND fecha_intento >= NOW() - INTERVAL 7 DAY
       GROUP BY motivo_fallo ORDER BY total DESC`
    );
    const [recientes] = await pool.query(
      `SELECT b.email_ingresado AS email, u.nombre, b.ip_origen AS ip, b.exitoso, b.motivo_fallo AS motivo, b.fecha_intento AS fecha
       FROM bitacora_acceso b LEFT JOIN usuarios u ON u.id = b.usuario_id
       ORDER BY b.id DESC LIMIT 15`
    );
    res.json({
      usuarios: {
        total: numero(usuarios.total),
        activos: numero(usuarios.activos),
        inactivos: numero(usuarios.inactivos),
        bloqueados: numero(usuarios.bloqueados),
        nuevos7Dias: numero(usuarios.nuevos7Dias),
        porRol: porRol.map((f) => ({ rol: f.rol, total: numero(f.total) })),
      },
      accesos24h: { total: numero(accesos.total), exitosos: numero(accesos.exitosos), fallidos: numero(accesos.fallidos) },
      fallosPorMotivo7Dias: porMotivo.map((f) => ({ motivo: f.motivo, total: numero(f.total) })),
      accesosRecientes: recientes.map((f) => ({ ...f, exitoso: Boolean(Number(f.exitoso)) })),
    });
  }));

  // Lista de usuarios: ?buscar=&rol=
  router.get('/usuarios', manejar(async (req, res) => {
    const condiciones = [];
    const parametros = [];
    const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 60) : '';
    if (buscar) {
      condiciones.push('(u.nombre LIKE ? OR u.email LIKE ? OR u.documento LIKE ?)');
      const patron = `%${buscar.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      parametros.push(patron, patron, patron);
    }
    if (['PACIENTE', 'MEDICO', 'ADMIN'].includes(req.query.rol)) {
      condiciones.push('r.nombre = ?');
      parametros.push(req.query.rol);
    }
    const [filas] = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.tipo_doc AS tipoDoc, u.documento, r.nombre AS rol, u.activo,
              u.intentos_fallidos AS intentosFallidos,
              (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()) AS bloqueado,
              u.creado_en AS creadoEn,
              (SELECT MAX(b.fecha_intento) FROM bitacora_acceso b WHERE b.usuario_id = u.id AND b.exitoso = TRUE) AS ultimoAcceso,
              (SELECT MAX(c.creado_en) FROM constancias_enviadas c WHERE c.usuario_id = u.id AND c.estado = 'ENVIADA') AS ultimaConstancia
       FROM usuarios u INNER JOIN roles r ON r.id = u.rol_id
       ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
       ORDER BY u.creado_en DESC, u.id DESC LIMIT 200`,
      parametros
    );
    res.json({
      total: filas.length,
      usuarios: filas.map((u) => ({ ...u, activo: Boolean(Number(u.activo)), bloqueado: Boolean(Number(u.bloqueado)) })),
    });
  }));

  // Activa o desactiva una cuenta: { activo: true|false }
  router.patch('/usuarios/:id/activo', manejar(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'El usuario no existe.' });
    if (typeof req.body?.activo !== 'boolean') return res.status(400).json({ error: 'Envía "activo": true o false.' });
    if (id === Number(req.usuario.id) && req.body.activo === false) {
      return res.status(409).json({ error: 'No puedes desactivar tu propia cuenta de administrador.' });
    }
    const [resultado] = await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [req.body.activo, id]);
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'El usuario no existe.' });
    return res.json({ id, activo: req.body.activo });
  }));

  // Quita el bloqueo por intentos fallidos
  router.post('/usuarios/:id/desbloquear', manejar(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'El usuario no existe.' });
    const [resultado] = await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [id]);
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'El usuario no existe.' });
    return res.json({ id, bloqueado: false });
  }));

  // Envía la constancia de registro (PDF protegido con el número de identificación) a un usuario
  router.post('/usuarios/:id/constancia', manejar(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'El usuario no existe.' });
    const resultado = await constancias.enviar(id, req.usuario.email);
    if (resultado.estado === 'NO_EXISTE') return res.status(404).json({ error: resultado.error });
    if (resultado.estado === 'FALLIDA') return res.status(502).json(resultado);
    return res.json(resultado);
  }));

  // Envía la constancia a todos los usuarios activos (máximo 200 por ejecución)
  router.post('/constancias', manejar(async (req, res) => {
    res.json(await constancias.enviarATodos(req.usuario.email));
  }));

  return router;
}

module.exports = { crearRutasAdmin };