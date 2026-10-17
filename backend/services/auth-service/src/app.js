const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { plantillaAlertaLogin, plantillaRecuperacion } = require('./plantillas');
const { crearLimitador } = require('./limitador');
const { errorBaseDatos } = require('./errores');
const { crearRutasAdmin } = require('./admin');

const LARGO_MINIMO_CLAVE = 8;
const MAX_INTENTOS_CUENTA = 5; // fallos seguidos antes de bloquear la cuenta 15 minutos
const QUINCE_MINUTOS = 15 * 60 * 1000;
const MENSAJE_RECUPERACION =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

// `notificar({ to, subject, html })` delega el envío al notification-service y devuelve una promesa
function crearApp({ pool, jwtSecret, frontendUrl, notificar }) {
  const app = express();

  // Intentos fallidos por IP + correo, y solicitudes de recuperación por IP
  const limiteLogin = crearLimitador({ maximo: 5, ventanaMs: QUINCE_MINUTOS });
  const limiteRecuperacion = crearLimitador({ maximo: 5, ventanaMs: QUINCE_MINUTOS });

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '20kb' }));

  // Envía alertas de acceso sin bloquear el login
  function notificarSeguridadLogin({ destinatario, nombreUsuario, exito, ipCliente }) {
    const fechaHora = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const asunto = exito
      ? 'Inicio de sesión detectado - Tecnosalud Católica'
      : 'Alerta de seguridad: Intento de inicio de sesión fallido - Tecnosalud Católica';

    console.log(`[auth-service] Notificando evento de seguridad (${exito ? 'Acceso Exitoso' : 'Fallo de Clave'}) a: ${destinatario}`);
    notificar({
      to: destinatario,
      subject: asunto,
      html: plantillaAlertaLogin({ nombreUsuario, exito, ipCliente, fechaHora }),
    }).catch((err) => {
      console.error('[auth-service] No se pudo enviar la alerta de seguridad vía notification-service:', err.message);
    });
  }

  const router = express.Router();

  // Registra cada intento de inicio de sesión en db_auth.bitacora_acceso (sin bloquear la respuesta)
  function registrarIntento({ usuarioId = null, email, ipCliente, exitoso, motivo = null }) {
    pool.query(
      `INSERT INTO bitacora_acceso (usuario_id, email_ingresado, ip_origen, exitoso, motivo_fallo)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, email.slice(0, 120), String(ipCliente).slice(0, 45), exitoso, motivo]
    ).catch((error) => {
      console.error('[auth-service] No se pudo registrar el intento en bitacora_acceso:', error.code || error.message);
    });
  }

  // 1. Endpoint de Inicio de Sesión
  router.post('/login', async (req, res) => {
    const { usuario, contrasena } = req.body || {};
    const ipCliente = req.ip || 'Local';

    if (typeof usuario !== 'string' || typeof contrasena !== 'string' || !usuario.trim() || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const emailIngresado = usuario.trim().toLowerCase();
    const claveLimite = `${ipCliente}|${emailIngresado}`;

    // Límite en memoria por IP + correo: frena ataques aunque el correo no exista
    if (limiteLogin.bloqueado(claveLimite)) {
      registrarIntento({ email: emailIngresado, ipCliente, exitoso: false, motivo: 'LIMITE_IP' });
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' });
    }

    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.tipo_doc, u.documento, u.email, u.contrasena_hash, u.nombre, u.activo, r.nombre AS rol,
                (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()) AS esta_bloqueado,
                GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), u.bloqueado_hasta) / 60), 1) AS minutos_bloqueo
         FROM usuarios u
         INNER JOIN roles r ON u.rol_id = r.id
         WHERE u.email = ? LIMIT 1`,
        [emailIngresado]
      );

      // Caso A: Si el usuario ni siquiera existe, no enviamos correo para evitar spam a correos ajenos
      if (rows.length === 0) {
        limiteLogin.registrar(claveLimite);
        registrarIntento({ email: emailIngresado, ipCliente, exitoso: false, motivo: 'USUARIO_NO_EXISTE' });
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      const user = rows[0];

      // Cuenta bloqueada en la base de datos (persiste aunque se reinicie el servicio)
      if (Number(user.esta_bloqueado)) {
        registrarIntento({ usuarioId: user.id, email: emailIngresado, ipCliente, exitoso: false, motivo: 'CUENTA_BLOQUEADA' });
        return res.status(429).json({
          error: `La cuenta está bloqueada por intentos fallidos. Intenta de nuevo en ${user.minutos_bloqueo} minuto(s) o restablece tu contraseña.`,
        });
      }

      // Validar contraseña antes de revelar si la cuenta está inactiva
      const esValida = await bcrypt.compare(contrasena, user.contrasena_hash);

      // Caso B: El usuario existe pero colocó la contraseña errada -> suma el intento y dispara alerta.
      // Al quinto fallo se bloquea la cuenta 15 minutos y el contador vuelve a 0.
      // (bloqueado_hasta se asigna primero porque MySQL evalúa las asignaciones de izquierda a derecha)
      if (!esValida) {
        limiteLogin.registrar(claveLimite);
        await pool.query(
          `UPDATE usuarios
           SET bloqueado_hasta = IF(intentos_fallidos + 1 >= ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), bloqueado_hasta),
               intentos_fallidos = IF(intentos_fallidos + 1 >= ?, 0, intentos_fallidos + 1)
           WHERE id = ?`,
          [MAX_INTENTOS_CUENTA, MAX_INTENTOS_CUENTA, user.id]
        );
        registrarIntento({ usuarioId: user.id, email: emailIngresado, ipCliente, exitoso: false, motivo: 'CLAVE_INCORRECTA' });
        notificarSeguridadLogin({
          destinatario: user.email,
          nombreUsuario: user.nombre,
          exito: false,
          ipCliente,
        });
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      if (!user.activo) {
        registrarIntento({ usuarioId: user.id, email: emailIngresado, ipCliente, exitoso: false, motivo: 'USUARIO_INACTIVO' });
        return res.status(403).json({ error: 'Usuario inactivo o bloqueado.' });
      }

      limiteLogin.limpiar(claveLimite);
      await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [user.id]);
      registrarIntento({ usuarioId: user.id, email: emailIngresado, ipCliente, exitoso: true });

      // Caso C: Inicio de sesión correcto -> Dispara Notificación de Acceso
      notificarSeguridadLogin({
        destinatario: user.email,
        nombreUsuario: user.nombre,
        exito: true,
        ipCliente,
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol, doc: user.documento },
        jwtSecret,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        usuario: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          tipoDoc: user.tipo_doc,
          documento: user.documento,
          rol: user.rol,
        },
      });
    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[auth-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }
      console.error('Error en /login:', error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });

  // 2. SOLICITUD DE RECUPERACIÓN: Generar token y delegar envío al Notification Service.
  // Responde lo mismo exista o no el correo, para no revelar qué cuentas están registradas.
  router.post('/recuperar-clave/solicitar', async (req, res) => {
    const { email } = req.body || {};

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Debes ingresar un correo electrónico.' });
    }

    const ipCliente = req.ip || 'Local';
    if (limiteRecuperacion.bloqueado(ipCliente)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' });
    }
    limiteRecuperacion.registrar(ipCliente);

    const emailLimpio = email.trim().toLowerCase();
    console.log(`\n[auth-service] Solicitud de recuperación para: ${emailLimpio}`);

    try {
      const [usuarios] = await pool.query(
        'SELECT id, nombre, email FROM usuarios WHERE email = ? LIMIT 1',
        [emailLimpio]
      );

      if (usuarios.length === 0) {
        console.warn(`[auth-service] Correo no registrado: ${emailLimpio}`);
        return res.json({ mensaje: MENSAJE_RECUPERACION });
      }

      const usuario = usuarios[0];
      const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
      const fechaExpiracion = new Date(Date.now() + QUINCE_MINUTOS);

      await pool.query(
        'INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)',
        [usuario.id, tokenRecuperacion, fechaExpiracion]
      );
      console.log(`[auth-service] Token guardado en db_auth para usuario: ${usuario.id}`);

      const enlaceRestablecer = `${frontendUrl}/#restablecer-clave?token=${tokenRecuperacion}`;

      try {
        await notificar({
          to: usuario.email,
          subject: 'Recuperación de Contraseña - Tecnosalud Católica',
          html: plantillaRecuperacion({ nombreUsuario: usuario.nombre, enlaceRestablecer }),
        });
        console.log('[auth-service] Notificación enviada con éxito vía notification-service.');
      } catch (notifError) {
        console.error('[auth-service] Error comunicando con notification-service:', notifError.message);
      }

      return res.json({ mensaje: MENSAJE_RECUPERACION });
    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[auth-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }
      console.error('Error general en /recuperar-clave/solicitar:', error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });

  // 3. RESTABLECER CONTRASEÑA: Validar token y cambiar hash
  router.post('/recuperar-clave/restablecer', async (req, res) => {
    const { token, nuevaContrasena } = req.body || {};

    if (typeof token !== 'string' || typeof nuevaContrasena !== 'string' || !token || !nuevaContrasena) {
      return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios.' });
    }

    if (nuevaContrasena.trim().length < LARGO_MINIMO_CLAVE) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.` });
    }

    try {
      const [tokens] = await pool.query(
        'SELECT id, usuario_id, expira_en, usado FROM tokens_recuperacion WHERE token = ? LIMIT 1',
        [token]
      );

      if (tokens.length === 0) {
        return res.status(400).json({ error: 'El enlace de recuperación es inválido.' });
      }

      const registroToken = tokens[0];

      if (registroToken.usado) {
        return res.status(400).json({ error: 'Este enlace ya ha sido utilizado.' });
      }

      if (new Date() > new Date(registroToken.expira_en)) {
        return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });
      }

      const salt = await bcrypt.genSalt(10);
      const nuevoHash = await bcrypt.hash(nuevaContrasena.trim(), salt);

      await pool.query(
        'UPDATE usuarios SET contrasena_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
        [nuevoHash, registroToken.usuario_id]
      );

      await pool.query(
        'UPDATE tokens_recuperacion SET usado = TRUE WHERE id = ?',
        [registroToken.id]
      );

      return res.json({ mensaje: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      const mensajeBD = errorBaseDatos(error);
      if (mensajeBD) {
        console.error('[auth-service] Base de datos no disponible:', error.code);
        return res.status(503).json({ error: mensajeBD });
      }
      console.error('Error al restablecer contraseña:', error);
      return res.status(500).json({ error: 'Error interno al actualizar contraseña.' });
    }
  });

  router.use('/admin', crearRutasAdmin({ pool, jwtSecret }));
  app.use('/api/auth', router);

  return app;
}

module.exports = { crearApp, LARGO_MINIMO_CLAVE };
