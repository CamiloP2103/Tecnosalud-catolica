const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'tecnosalud_secret_jwt_key_2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005';

app.use(cors({ origin: '*' }));
app.use(express.json());

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

// Función auxiliar para enviar alertas de acceso al Notification Service
async function notificarSeguridadLogin({ destinatario, nombreUsuario, exito, ipCliente }) {
  const fechaHora = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const asunto = exito
    ? 'Inicio de sesión detectado - Tecnosalud Católica'
    : 'Alerta de seguridad: Intento de inicio de sesión fallido - Tecnosalud Católica';

  const plantillaHtml = exito
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #145da0; text-align: center; margin-bottom: 20px;">Tecnosalud Católica</h2>
        <p style="font-size: 15px; color: #1e293b;">Hola, <strong>${nombreUsuario}</strong>.</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Te informamos que se registró un <strong>inicio de sesión exitoso</strong> en tu cuenta del portal de afiliados.
        </p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Fecha y hora:</strong> ${fechaHora}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Dirección IP:</strong> ${ipCliente}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Línea de soporte: soporte@tecnosalud.com.co | Tecnosalud Católica</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fecaca; border-radius: 8px;">
        <h2 style="color: #dc2626; text-align: center; margin-bottom: 20px;">Alerta de Seguridad - Tecnosalud</h2>
        <p style="font-size: 15px; color: #1e293b;">Hola, <strong>${nombreUsuario}</strong>.</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Hemos detectado un <strong>intento de acceso con contraseña errada</strong> a tu cuenta.
        </p>

        <div style="background-color: #fff1f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Fecha y hora:</strong> ${fechaHora}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Dirección IP solicitante:</strong> ${ipCliente}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Mesa de ayuda: soporte@tecnosalud.com.co | Tecnosalud Católica</p>
      </div>
    `;

  try {
    const resNotif = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: destinatario, subject: asunto, html: plantillaHtml })
    });
    if (!resNotif.ok) console.warn(`[auth-service] Notification-service devolvió código ${resNotif.status}.`);
  } catch (err) {
    console.error('[auth-service] No se pudo enviar la alerta de seguridad:', err.message);
  }
}

// Función orquestadora para generar y enviar el PDF
async function despacharConstancia(emailUsuario) {
  const [usuarios] = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.tipo_doc AS tipoDoc, u.documento, r.nombre AS rol, u.activo, u.creado_en AS creadoEn
     FROM usuarios u INNER JOIN roles r ON r.id = u.rol_id WHERE u.email = ?`,
    [emailUsuario]
  );

  if (usuarios.length === 0) throw new Error('Usuario no encontrado en la base de datos.');
  const usuarioCompleto = usuarios[0];

  const baseUrlDoc = (process.env.DOCUMENTOS_SERVICE_URL || 'http://localhost:3006').replace(/\/+$/, '');
  const respuestaDoc = await fetch(`${baseUrlDoc}/api/documentos/generar-pdf-constancia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usuarioCompleto)
  });

  if (!respuestaDoc.ok) throw new Error(`Error en Documentos: ${respuestaDoc.status}`);
  const datosPdf = await respuestaDoc.json(); 

  const baseUrlNotif = (process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005').replace(/\/+$/, '');
  const respuestaNotif = await fetch(`${baseUrlNotif}/api/notifications/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: emailUsuario,
      subject: 'Tu Constancia de Registro - Tecnosalud Católica',
      html: '<p>Hola, adjunto encontrarás tu constancia oficial de registro protegida con tu número de documento.</p>',
      attachments: [{
        filename: `Constancia_Tecnosalud_${usuarioCompleto.documento}.pdf`,
        content: datosPdf.base64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }]
    })
  });

  if (!respuestaNotif.ok) throw new Error(`Error en Notificaciones: ${respuestaNotif.status}`);
  return usuarioCompleto.id;
}


// ==========================================
// RUTAS PÚBLICAS Y DE AUTENTICACIÓN
// ==========================================
const router = express.Router();

router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  const ipCliente = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Local';

  if (!usuario || !contrasena) return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });

  const emailIngresado = usuario.trim().toLowerCase();

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.tipo_doc, u.documento, u.email, u.contrasena_hash, u.nombre, u.activo, r.nombre AS rol
       FROM usuarios u INNER JOIN roles r ON u.rol_id = r.id WHERE u.email = ? LIMIT 1`,
      [emailIngresado]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas.' });

    const user = rows[0];
    if (!user.activo) return res.status(403).json({ error: 'Usuario inactivo o bloqueado.' });

    const esValida = await bcrypt.compare(contrasena, user.contrasena_hash);

    if (!esValida) {
      notificarSeguridadLogin({ destinatario: user.email, nombreUsuario: user.nombre, exito: false, ipCliente });
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    notificarSeguridadLogin({ destinatario: user.email, nombreUsuario: user.nombre, exito: true, ipCliente });

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, doc: user.documento },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      usuario: {
        id: user.id, nombre: user.nombre, email: user.email,
        tipoDoc: user.tipo_doc, documento: user.documento, rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

router.post('/recuperar-clave/solicitar', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Debes ingresar un correo electrónico.' });

  const emailLimpio = email.trim().toLowerCase();

  try {
    const [usuarios] = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email = ? LIMIT 1', [emailLimpio]);
    if (usuarios.length === 0) return res.status(404).json({ error: 'El correo ingresado no está registrado.' });

    const usuario = usuarios[0];
    const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
    const fechaExpiracion = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)',
      [usuario.id, tokenRecuperacion, fechaExpiracion]
    );

    const enlaceRestablecer = `${FRONTEND_URL}/#restablecer-clave?token=${tokenRecuperacion}`;
    const plantillaHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #145da0;">Tecnosalud Católica</h2>
        <p>Hola, <strong>${usuario.nombre}</strong>. Haz clic para restablecer tu contraseña:</p>
        <a href="${enlaceRestablecer}" style="background-color: #145da0; color: #fff; padding: 10px 20px; text-decoration: none;">Restablecer mi contraseña</a>
      </div>
    `;

    await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: usuario.email, subject: 'Recuperación de Contraseña', html: plantillaHtml })
    });

    return res.json({ mensaje: 'Correo de recuperación enviado.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

router.post('/recuperar-clave/restablecer', async (req, res) => {
  const { token, nuevaContrasena } = req.body;
  if (!token || !nuevaContrasena) return res.status(400).json({ error: 'Faltan datos.' });

  try {
    const [tokens] = await pool.query('SELECT id, usuario_id, expira_en, usado FROM tokens_recuperacion WHERE token = ?', [token]);
    if (tokens.length === 0) return res.status(400).json({ error: 'Enlace inválido.' });

    const registroToken = tokens[0];
    if (registroToken.usado) return res.status(400).json({ error: 'Enlace ya utilizado.' });
    if (new Date() > new Date(registroToken.expira_en)) return res.status(400).json({ error: 'Enlace expirado.' });

    const salt = await bcrypt.genSalt(10);
    const nuevoHash = await bcrypt.hash(nuevaContrasena.trim(), salt);

    await pool.query('UPDATE usuarios SET contrasena_hash = ?, activo = 1 WHERE id = ?', [nuevoHash, registroToken.usuario_id]);
    await pool.query('UPDATE tokens_recuperacion SET usado = TRUE WHERE id = ?', [registroToken.id]);

    return res.json({ mensaje: 'Contraseña actualizada.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno.' });
  }
});

router.post('/registro-interno', async (req, res) => {
  const { tipo_doc, documento, email, nombre, rol_id } = req.body;
  try {
    const [resultado] = await pool.query(
      `INSERT INTO usuarios (tipo_doc, documento, email, contrasena_hash, nombre, rol_id, activo)
       VALUES (?, ?, ?, '$2a$10$GcXq.R.QWp3F6H.VUzrHZug.qmzSIHE.BxDyK3ChI7UB5pWC71Fri', ?, ?, 0)`,
      [tipo_doc, documento, email, nombre, rol_id]
    );

    const tokenConfiguracion = crypto.randomBytes(32).toString('hex');
    await pool.query('INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)', [resultado.insertId, tokenConfiguracion, new Date(Date.now() + 24 * 3600000)]);
    
    const enlace = `${FRONTEND_URL}/#restablecer-clave?token=${tokenConfiguracion}`;
    const html = `<h2>Bienvenido ${nombre}</h2><a href="${enlace}">Activar cuenta</a>`;

    await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject: 'Activa tu cuenta', html })
    });

    return res.status(201).json({ exito: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error creando usuario.' });
  }
});

router.post('/mi-constancia', async (req, res) => {
  try {
    const emailUsuario = req.body.email || req.user?.email;
    if (!emailUsuario) return res.status(400).json({ error: 'Correo no identificado.' });
    
    await despacharConstancia(emailUsuario);
    return res.json({ mensaje: 'Constancia enviada a tu correo.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error despachando el documento.' });
  }
});


// ==========================================
// MÓDULO DE ADMINISTRACIÓN (Panel de Usuarios)
// ==========================================
const numero = (v) => Number(v || 0);

router.get('/admin/resumen', async (req, res) => {
  try {
    const [[usuarios]] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(activo = TRUE) AS activos, SUM(activo = FALSE) AS inactivos,
              SUM(bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueados,
              SUM(creado_en >= NOW() - INTERVAL 7 DAY) AS nuevos7Dias FROM usuarios`
    );
    const [porRol] = await pool.query(`SELECT r.nombre AS rol, COUNT(u.id) AS total FROM roles r LEFT JOIN usuarios u ON u.rol_id = r.id GROUP BY r.id`);
    const [[accesos]] = await pool.query(`SELECT COUNT(*) AS total, SUM(exitoso = TRUE) AS exitosos, SUM(exitoso = FALSE) AS fallidos FROM bitacora_acceso WHERE fecha_intento >= NOW() - INTERVAL 1 DAY`);
    const [porMotivo] = await pool.query(`SELECT motivo_fallo AS motivo, COUNT(*) AS total FROM bitacora_acceso WHERE exitoso = FALSE AND fecha_intento >= NOW() - INTERVAL 7 DAY GROUP BY motivo_fallo`);
    const [recientes] = await pool.query(`SELECT b.email_ingresado AS email, u.nombre, b.ip_origen AS ip, b.exitoso, b.motivo_fallo AS motivo, b.fecha_intento AS fecha FROM bitacora_acceso b LEFT JOIN usuarios u ON u.id = b.usuario_id ORDER BY b.id DESC LIMIT 15`);
    
    res.json({
      usuarios: {
        total: numero(usuarios.total), activos: numero(usuarios.activos), inactivos: numero(usuarios.inactivos),
        bloqueados: numero(usuarios.bloqueados), nuevos7Dias: numero(usuarios.nuevos7Dias),
        porRol: porRol.map((f) => ({ rol: f.rol, total: numero(f.total) })),
      },
      accesos24h: { total: numero(accesos.total), exitosos: numero(accesos.exitosos), fallidos: numero(accesos.fallidos) },
      fallosPorMotivo7Dias: porMotivo.map((f) => ({ motivo: f.motivo, total: numero(f.total) })),
      accesosRecientes: recientes.map((f) => ({ ...f, exitoso: Boolean(Number(f.exitoso)) })),
    });
  } catch (error) { res.status(500).json({ error: 'Error interno.' }); }
});

router.get('/admin/usuarios', async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim().slice(0, 60) : '';
    const condiciones = [];
    const parametros = [];
    if (buscar) {
      condiciones.push('(u.nombre LIKE ? OR u.email LIKE ? OR u.documento LIKE ?)');
      const p = `%${buscar}%`;
      parametros.push(p, p, p);
    }
    const [filas] = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.tipo_doc AS tipoDoc, u.documento, r.nombre AS rol, u.activo,
              u.intentos_fallidos AS intentosFallidos, (u.bloqueado_hasta > NOW()) AS bloqueado, u.creado_en AS creadoEn,
              (SELECT MAX(b.fecha_intento) FROM bitacora_acceso b WHERE b.usuario_id = u.id AND b.exitoso = TRUE) AS ultimoAcceso,
              (SELECT MAX(c.creado_en) FROM constancias_enviadas c WHERE c.usuario_id = u.id AND c.estado = 'ENVIADA') AS ultimaConstancia
       FROM usuarios u INNER JOIN roles r ON r.id = u.rol_id
       ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''} ORDER BY u.creado_en DESC LIMIT 200`, parametros
    );
    res.json({ total: filas.length, usuarios: filas.map(u => ({ ...u, activo: Boolean(Number(u.activo)), bloqueado: Boolean(Number(u.bloqueado)) })) });
  } catch (error) { res.status(500).json({ error: 'Error interno.' }); }
});

router.patch('/admin/usuarios/:id/activo', async (req, res) => {
  try { await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [req.body.activo, Number(req.params.id)]); res.json({ activo: req.body.activo }); } 
  catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/admin/usuarios/:id/desbloquear', async (req, res) => {
  try { await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [Number(req.params.id)]); res.json({ bloqueado: false }); } 
  catch (e) { res.status(500).json({ error: 'Error interno.' }); }
});

router.post('/admin/usuarios/:id/constancia', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [u] = await pool.query('SELECT email FROM usuarios WHERE id = ?', [id]);
    if (u.length === 0) return res.status(404).json({ error: 'Usuario no existe' });
    await despacharConstancia(u[0].email);
    await pool.query("INSERT INTO constancias_enviadas (usuario_id, estado) VALUES (?, 'ENVIADA')", [id]).catch(()=>{});
    res.json({ mensaje: 'Constancia enviada con éxito.' });
  } catch (e) { res.status(500).json({ error: 'Error enviando constancia.' }); }
});

router.post('/admin/constancias', async (req, res) => {
  try {
    const [usuarios] = await pool.query('SELECT id, email FROM usuarios WHERE activo = 1 LIMIT 50');
    let enviadas = 0, fallidas = 0;
    for (const u of usuarios) {
      try {
        await despacharConstancia(u.email);
        await pool.query("INSERT INTO constancias_enviadas (usuario_id, estado) VALUES (?, 'ENVIADA')", [u.id]).catch(()=>{});
        enviadas++;
      } catch (e) { fallidas++; }
    }
    res.json({ total: usuarios.length, enviadas, fallidas });
  } catch (e) { res.status(500).json({ error: 'Error en envío masivo.' }); }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.use('/api/auth', router);

app.get('/api/auth/health', (req, res) => {
  res.json({ servicio: 'auth', estado: 'activo' });
});

app.listen(PORT, () => {
  console.log(`Microservicio de Autenticación activo en el puerto ${PORT} (/api/auth)`);
});