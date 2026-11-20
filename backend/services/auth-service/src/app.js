const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { plantillaAlertaLogin, plantillaRecuperacion } = require('./plantillas');
const { crearLimitador } = require('./limitador');
const { errorBaseDatos } = require('./errores');
const { crearRutasAdmin } = require('./admin');
const { requiereSesion } = require('./autenticacion');
const { crearEnvioConstancias } = require('./envioConstancias');

const LARGO_MINIMO_CLAVE = 8;
const MAX_INTENTOS_CUENTA = 5;
const QUINCE_MINUTOS = 15 * 60 * 1000;
const CINCO_MINUTOS = 5 * 60 * 1000;
const MAX_INTENTOS_MFA = 5;
const MENSAJE_RECUPERACION = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

function crearApp({ pool, jwtSecret, frontendUrl, notificar }) {
  const app = express();

  const limiteLogin = crearLimitador({ maximo: 5, ventanaMs: QUINCE_MINUTOS });
  const limiteRecuperacion = crearLimitador({ maximo: 5, ventanaMs: QUINCE_MINUTOS });
  const limiteMfa = crearLimitador({ maximo: 10, ventanaMs: QUINCE_MINUTOS });

  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '20kb' }));

  function notificarSeguridadLogin({ destinatario, nombreUsuario, exito, ipCliente }) {
    const fechaHora = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const asunto = exito
      ? 'Inicio de sesión detectado - Tecnosalud Católica'
      : 'Alerta de seguridad: Intento de inicio de sesión fallido desde su cuenta - Tecnosalud Católica';

    console.log(`[auth-service] Notificando evento de seguridad a: ${destinatario}`);
    notificar({
      to: destinatario,
      subject: asunto,
      html: plantillaAlertaLogin({ nombreUsuario, exito, ipCliente, fechaHora }),
    }).catch((err) => {
      console.error('[auth-service] No se pudo enviar alerta de seguridad:', err.message);
    });
  }

  const router = express.Router();

  function enmascararCorreoMfa(correo) {
    if (!correo || !correo.includes('@')) return '***@***.com';
    const [nombre, dominio] = correo.split('@');
    const prefijo = nombre.length > 2 ? nombre.slice(0, 2) : nombre.charAt(0);
    return `${prefijo}***@${dominio}`;
  }

  function registrarIntento({ usuarioId = null, email, ipCliente, exitoso, motivo = null }) {
    pool.query(
      `INSERT INTO bitacora_acceso (usuario_id, email_ingresado, ip_origen, exitoso, motivo_fallo) VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, email.slice(0, 120), String(ipCliente).slice(0, 45), exitoso, motivo]
    ).catch((error) => console.error('[auth-service] Error bitacora:', error.code || error.message));
  }

  function plantillaCodigoMfa({ nombreUsuario, codigo }) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #145da0; text-align: center;">Verificación en Dos Pasos (MFA)</h2>
        <p>Hola, <strong>${nombreUsuario}</strong>.</p>
        <p>Usa el siguiente código de 6 dígitos para completar tu inicio de sesión en <strong>Tecnosalud Católica</strong>:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #145da0; background-color: #f0f6fc; padding: 14px 28px; border-radius: 8px; border: 1px solid #cbd5e1;">
            ${codigo}
          </span>
        </div>
        <p style="color: #475569; font-size: 14px;">Este código expira en <strong>5 minutos</strong>. Si no intentaste iniciar sesión, ignora este mensaje y cambia tu contraseña.</p>
      </div>
    `;
  }

  async function emitirYEnviarOtp(user) {
    const codigo = crypto.randomInt(100000, 1000000).toString();
    const codigoHash = await bcrypt.hash(codigo, 8);

    // Invalida códigos anteriores pendientes del mismo usuario
    await pool.query('UPDATE mfa_codigos SET usado = TRUE WHERE usuario_id = ? AND usado = FALSE', [user.id]);

    await pool.query(
      'INSERT INTO mfa_codigos (usuario_id, codigo_hash, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))',
      [user.id, codigoHash]
    );

    await notificar({
      to: user.email,
      subject: 'Código de verificación de acceso - Tecnosalud Católica',
      html: plantillaCodigoMfa({ nombreUsuario: user.nombre, codigo }),
    });
  }

  router.post('/', async (req, res) => {
    const { errores, datos } = validarRegistro(req.body);
    if (Object.keys(errores).length > 0) {
      return res.status(400).json({ errores });
    }

    try {
      const nuevoId = await repo.crearAfiliado(datos);

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

  // 1. LOGIN
  router.post('/login', async (req, res) => {
    const { usuario, contrasena } = req.body || {};
    const ipCliente = req.ip || 'Local';

    if (typeof usuario !== 'string' || typeof contrasena !== 'string' || !usuario.trim() || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const emailIngresado = usuario.trim().toLowerCase();
    const claveLimite = `${ipCliente}|${emailIngresado}`;

    if (limiteLogin.bloqueado(claveLimite)) {
      registrarIntento({ email: emailIngresado, ipCliente, exitoso: false, motivo: 'LIMITE_IP' });
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.' });
    }

    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.tipo_doc, u.documento, u.email, u.contrasena_hash, u.nombre, u.activo, r.nombre AS rol,
                (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()) AS esta_bloqueado,
                GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), u.bloqueado_hasta) / 60), 1) AS minutos_bloqueo
         FROM usuarios u INNER JOIN roles r ON u.rol_id = r.id WHERE u.email = ? LIMIT 1`,
        [emailIngresado]
      );

      if (rows.length === 0) {
        limiteLogin.registrar(claveLimite);
        registrarIntento({ email: emailIngresado, ipCliente, exitoso: false, motivo: 'USUARIO_NO_EXISTE' });
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      const user = rows[0];

      if (Number(user.esta_bloqueado)) {
        registrarIntento({ usuarioId: user.id, email: emailIngresado, ipCliente, exitoso: false, motivo: 'CUENTA_BLOQUEADA' });
        return res.status(429).json({ error: `La cuenta está bloqueada por intentos fallidos. Intenta de nuevo en ${user.minutos_bloqueo} minuto(s).` });
      }

      const esValida = await bcrypt.compare(contrasena, user.contrasena_hash);

      if (!esValida) {
        limiteLogin.registrar(claveLimite);
        await pool.query(
          `UPDATE usuarios SET bloqueado_hasta = IF(intentos_fallidos + 1 >= ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), bloqueado_hasta),
               intentos_fallidos = IF(intentos_fallidos + 1 >= ?, 0, intentos_fallidos + 1) WHERE id = ?`,
          [MAX_INTENTOS_CUENTA, MAX_INTENTOS_CUENTA, user.id]
        );
        registrarIntento({ usuarioId: user.id, email: emailIngresado, ipCliente, exitoso: false, motivo: 'CLAVE_INCORRECTA' });
        notificarSeguridadLogin({ destinatario: user.email, nombreUsuario: user.nombre, exito: false, ipCliente });
        return res.status(401).json({ error: 'Credenciales inválidas.' });
      }

      if (!user.activo) {
        registrarIntento({ usuarioId: user.id, email: emailIngresado, ipCliente, exitoso: false, motivo: 'USUARIO_INACTIVO' });
        return res.status(403).json({ error: 'Usuario inactivo o bloqueado.' });
      }

      limiteLogin.limpiar(claveLimite);
      await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [user.id]);

      try {
        await emitirYEnviarOtp(user);
      } catch (notifError) {
        console.error('[auth-service] Error enviando código MFA:', notifError.message);
        return res.status(502).json({ error: 'No se pudo enviar el código de verificación al correo. Intenta nuevamente.' });
      }

      const tempToken = jwt.sign(
        { id: user.id, email: user.email, proposito: 'MFA_LOGIN' },
        jwtSecret,
        { expiresIn: '5m' }
      );

      return res.json({
        requiereMfa: true,
        tempToken,
        correoEnmascarado: enmascararCorreoMfa(user.email),
        mensaje: `Enviamos un código de 6 dígitos a ${enmascararCorreoMfa(user.email)}.`,
      });
    } catch (error) {
      if (errorBaseDatos(error)) return res.status(503).json({ error: errorBaseDatos(error) });
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });

  // 1B. VERIFICAR CÓDIGO MFA (Paso 2 del login)
  router.post('/verificar-mfa', async (req, res) => {
    const { tempToken, codigo } = req.body || {};
    const ipCliente = req.ip || 'Local';

    if (typeof tempToken !== 'string' || typeof codigo !== 'string' || !tempToken.trim() || !/^\d{6}$/.test(codigo.trim())) {
      return res.status(400).json({ error: 'Debes ingresar un código de verificación válido de 6 dígitos.' });
    }

    if (limiteMfa.bloqueado(ipCliente)) {
      return res.status(429).json({ error: 'Demasiados intentos de verificación. Intenta de nuevo en 15 minutos.' });
    }

    let payload;
    try {
      payload = jwt.verify(tempToken, jwtSecret);
      if (payload.proposito !== 'MFA_LOGIN') {
        return res.status(401).json({ error: 'Token temporal inválido.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'La verificación ha expirado. Inicia sesión nuevamente.' });
    }

    try {
      const [codigos] = await pool.query(
        `SELECT id, codigo_hash, intentos, (expira_en < NOW()) AS expirado
         FROM mfa_codigos
         WHERE usuario_id = ? AND usado = FALSE
         ORDER BY id DESC LIMIT 1`,
        [payload.id]
      );

      if (codigos.length === 0) {
        return res.status(400).json({ error: 'No hay un código activo. Solicita uno nuevo.' });
      }

      const registroOtp = codigos[0];

      if (Number(registroOtp.expirado)) {
        await pool.query('UPDATE mfa_codigos SET usado = TRUE WHERE id = ?', [registroOtp.id]);
        return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
      }

      if (registroOtp.intentos >= MAX_INTENTOS_MFA) {
        await pool.query('UPDATE mfa_codigos SET usado = TRUE WHERE id = ?', [registroOtp.id]);
        return res.status(429).json({ error: 'Superaste el máximo de intentos para este código. Inicia sesión nuevamente.' });
      }

      const codigoValido = await bcrypt.compare(codigo.trim(), registroOtp.codigo_hash);

      if (!codigoValido) {
        limiteMfa.registrar(ipCliente);
        await pool.query('UPDATE mfa_codigos SET intentos = intentos + 1 WHERE id = ?', [registroOtp.id]);
        registrarIntento({ usuarioId: payload.id, email: payload.email, ipCliente, exitoso: false, motivo: 'MFA_INCORRECTO' });
        return res.status(401).json({ error: 'Código de verificación incorrecto.' });
      }

      await pool.query('UPDATE mfa_codigos SET usado = TRUE WHERE id = ?', [registroOtp.id]);
      limiteMfa.limpiar(ipCliente);

      const [rows] = await pool.query(
        `SELECT u.id, u.tipo_doc, u.documento, u.email, u.nombre, u.activo, r.nombre AS rol
         FROM usuarios u INNER JOIN roles r ON u.rol_id = r.id WHERE u.id = ? LIMIT 1`,
        [payload.id]
      );

      if (rows.length === 0 || !rows[0].activo) {
        return res.status(403).json({ error: 'Usuario inactivo o no disponible.' });
      }

      const user = rows[0];
      registrarIntento({ usuarioId: user.id, email: user.email, ipCliente, exitoso: true });
      notificarSeguridadLogin({ destinatario: user.email, nombreUsuario: user.nombre, exito: true, ipCliente });

      const token = jwt.sign(
        { id: user.id, email: user.email, rol: user.rol, doc: user.documento },
        jwtSecret,
        { expiresIn: '4h' }
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
      if (errorBaseDatos(error)) return res.status(503).json({ error: errorBaseDatos(error) });
      console.error('[auth-service] Error en /verificar-mfa:', error);
      return res.status(500).json({ error: 'Error interno al verificar el código.' });
    }
  });

  // 1C. REENVIAR CÓDIGO MFA
  router.post('/reenviar-mfa', async (req, res) => {
    const { tempToken } = req.body || {};
    if (typeof tempToken !== 'string' || !tempToken.trim()) {
      return res.status(400).json({ error: 'Token temporal requerido.' });
    }

    let payload;
    try {
      payload = jwt.verify(tempToken, jwtSecret);
      if (payload.proposito !== 'MFA_LOGIN') {
        return res.status(401).json({ error: 'Token temporal inválido.' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Tu sesión de verificación expiró. Inicia sesión nuevamente.' });
    }

    try {
      const [rows] = await pool.query('SELECT id, nombre, email, activo FROM usuarios WHERE id = ? LIMIT 1', [payload.id]);
      if (rows.length === 0 || !rows[0].activo) {
        return res.status(403).json({ error: 'Usuario no disponible.' });
      }

      await emitirYEnviarOtp(rows[0]);
      return res.json({
        mensaje: `Hemos enviado un nuevo código de 6 dígitos a ${enmascararCorreoMfa(rows[0].email)}.`,
      });
    } catch (error) {
      console.error('[auth-service] Error en /reenviar-mfa:', error);
      return res.status(502).json({ error: 'No se pudo reenviar el código de verificación.' });
    }
  });

  // 2. RECUPERAR USUARIO: CONSULTAR (Restaurado y corregido)
  router.post('/recuperar-usuario/consultar', async (req, res) => {
    const { tipoDoc, documento } = req.body;
    
    if (!tipoDoc || !documento) {
      return res.status(400).json({ error: 'El tipo y número de documento son obligatorios.' });
    }

    try {
      const [usuarios] = await pool.query(
        'SELECT id, email, bloqueado_hasta, intentos_fallidos FROM usuarios WHERE tipo_doc = ? AND documento = ? LIMIT 1', 
        [tipoDoc, documento]
      );

      if (usuarios.length === 0) {
        return res.status(404).json({ error: 'No se encontró ningún usuario con estos datos.' });
      }

      const usuario = usuarios[0];

      if ((usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) || usuario.intentos_fallidos >= 3) {
        return res.status(403).json({ error: 'La cuenta se encuentra bloqueada por seguridad. Contacta a soporte.' });
      }

      const enmascararCorreo = (correo) => {
        if (!correo || !correo.includes('@')) return '***@***.com';
        const [nombre, dominio] = correo.split('@');
        return `${nombre.charAt(0)}***@${dominio}`;
      };

      const correoReal = enmascararCorreo(usuario.email);
      const distractores = ['j***@gmail.com', 'm***@ucatolica.edu.co', 'a***@hotmail.com'];
      const opcionesCorreos = [correoReal, distractores[0], distractores[1]].sort(() => Math.random() - 0.5);

      return res.json({
        exito: true,
        mensaje: 'Usuario verificado. Selecciona tu correo electrónico asociado para continuar.',
        opciones: opcionesCorreos
      });
    } catch (error) {
      console.error('[auth-service] Error en /recuperar-usuario/consultar:', error);
      return res.status(500).json({ error: 'Error interno al consultar el usuario.' });
    }
  });

  // 3. RECUPERAR CLAVE: SOLICITAR
  router.post('/recuperar-clave/solicitar', async (req, res) => {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'Debes ingresar un correo electrónico.' });

    const ipCliente = req.ip || 'Local';
    if (limiteRecuperacion.bloqueado(ipCliente)) return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' });
    limiteRecuperacion.registrar(ipCliente);

    const emailLimpio = email.trim().toLowerCase();

    try {
      const [usuarios] = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email = ? LIMIT 1', [emailLimpio]);
      if (usuarios.length === 0) return res.json({ mensaje: MENSAJE_RECUPERACION });

      const usuario = usuarios[0];
      const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
      const fechaExpiracion = new Date(Date.now() + QUINCE_MINUTOS);

      await pool.query('INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)', [usuario.id, tokenRecuperacion, fechaExpiracion]);
      
      const enlaceRestablecer = `${frontendUrl}/#restablecer-clave?token=${tokenRecuperacion}`;

      try {
        await notificar({
          to: usuario.email,
          subject: 'Recuperación de Contraseña - Tecnosalud Católica',
          html: plantillaRecuperacion({ nombreUsuario: usuario.nombre, enlaceRestablecer }),
        });
      } catch (notifError) {
        console.error('[auth-service] Error enviando correo de recuperación:', notifError.message);
      }

      return res.json({ mensaje: MENSAJE_RECUPERACION });
    } catch (error) {
      if (errorBaseDatos(error)) return res.status(503).json({ error: errorBaseDatos(error) });
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });

  // 4. RECUPERAR CLAVE: RESTABLECER
  router.post('/recuperar-clave/restablecer', async (req, res) => {
    const { token, nuevaContrasena, aceptaTratamientoDatos } = req.body || {};
    if (typeof token !== 'string' || typeof nuevaContrasena !== 'string' || !token || !nuevaContrasena) return res.status(400).json({ error: 'Faltan datos.' });
    if (nuevaContrasena.trim().length < LARGO_MINIMO_CLAVE) return res.status(400).json({ error: `La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.` });

    try {
      const [tokens] = await pool.query('SELECT id, usuario_id, expira_en, usado FROM tokens_recuperacion WHERE token = ? LIMIT 1', [token]);
      if (tokens.length === 0) return res.status(400).json({ error: 'El enlace de recuperación es inválido.' });

      const registroToken = tokens[0];
      if (registroToken.usado) return res.status(400).json({ error: 'Este enlace ya ha sido utilizado.' });
      if (new Date() > new Date(registroToken.expira_en)) return res.status(400).json({ error: 'El enlace ha expirado. Solicita uno nuevo.' });

      // Opcional: Obtener el correo o documento del usuario asociado para pasarlo a registro-service
      const [usuarios] = await pool.query('SELECT email, documento FROM usuarios WHERE id = ? LIMIT 1', [registroToken.usuario_id]);
      const datosUsuario = usuarios[0] || {};

      const salt = await bcrypt.genSalt(10);
      const nuevoHash = await bcrypt.hash(nuevaContrasena.trim(), salt);
      const UsuarioRegistro =  datosUsuario.documento; 

      // 1. Actualizamos contraseña y activamos usuario en db_auth
      await pool.query('UPDATE usuarios SET contrasena_hash = ?, intentos_fallidos = 0, activo = 1, bloqueado_hasta = NULL WHERE id = ?', [nuevoHash, registroToken.usuario_id]);
      await pool.query('UPDATE tokens_recuperacion SET usado = TRUE WHERE id = ?', [registroToken.id]);
      await pool.query('UPDATE db_registro.afiliados SET usuario_id = ? WHERE documento = ?', [registroToken.usuario_id,UsuarioRegistro]);

      // 2. Sincronizamos el consentimiento y estado activo en db_registro (a través del microservicio de registro)
      if (datosUsuario.email || datosUsuario.documento) {
        try {
              const payloadSincronizacion = {
              correo: datosUsuario.email,
              documento: datosUsuario.documento,
              aceptaTratamientoDatos: aceptaTratamientoDatos ? 1 : 0
              }; 

              // Imprimimos en los logs de Azure para verificar qué valores van
          console.log('[auth-service] Payload enviado a registro-service:', JSON.stringify(payloadSincronizacion));
          await fetch(`${process.env.REGISTRO_SERVICE_URL || 'http://localhost:3004'}/activar-consentimiento`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              correo: datosUsuario.email,
              documento: datosUsuario.documento,
              aceptaTratamientoDatos: aceptaTratamientoDatos ? 1 : 0
            })
          });
          console.log('[auth-service] REGISTRO_SERVICE_URL configurada:', process.env.REGISTRO_SERVICE_URL);
        } catch (errorRegistro) {
          console.error('[auth-service] No se pudo sincronizar el consentimiento en registro-service:', errorRegistro.message);
        }
      }

      return res.json({ mensaje: 'Contraseña actualizada correctamente. Puedes ingresar con esta contraseña' });
    } catch (error) {
      if (errorBaseDatos(error)) return res.status(503).json({ error: errorBaseDatos(error) });
      return res.status(500).json({ error: 'Error interno al actualizar contraseña.' });
    }
  });

  // 5. REGISTRO INTERNO
  router.post('/registro-interno', async (req, res) => {
    const { tipo_doc, documento, email, nombre, rol_id } = req.body || {};
  
    try {
      const [resultadoUsuario] = await pool.query(
        `INSERT INTO usuarios (tipo_doc, documento, email, contrasena_hash, nombre, rol_id, activo)
         VALUES (?, ?, ?, '$2a$10$GcXq.R.QWp3F6H.VUzrHZug.qmzSIHE.BxDyK3ChI7UB5pWC71Fri', ?, ?, 0)`,
        [tipo_doc, documento, email, nombre, rol_id]
      );
  
      const usuarioId = resultadoUsuario.insertId;
      const tokenConfiguracion = crypto.randomBytes(32).toString('hex');
      const fechaExpiracion = new Date(Date.now() + 24 * 3600000);
  
      await pool.query('INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)', [usuarioId, tokenConfiguracion, fechaExpiracion]);
  
      const enlaceConfiguracion = `${frontendUrl}/#restablecer-clave?token=${tokenConfiguracion}`;
      const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #145da0; text-align: center;">Bienvenido a Tecnosalud Católica</h2>
          <p>Hola, <strong>${nombre}</strong>.</p>
          <p>Tu registro ha sido exitoso. Para activar tu cuenta, haz clic abajo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${enlaceConfiguracion}" style="background-color: #145da0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Activar cuenta y crear contraseña</a>
          </div>
        </div>`;
  
      await notificar({ to: email, subject: 'Activa tu cuenta - Tecnosalud Católica', html });
      return res.status(201).json({ exito: true });
    } catch (error) {
      console.error('[auth-service] Error en /registro-interno:', error);
      return res.status(500).json({ error: 'Error interno creando el usuario.' });
    }
  });

  // 6. CONSTANCIAS DE REGISTRO
  const constancias = crearEnvioConstancias({ pool, notificar });
  const limiteConstancias = crearLimitador({ maximo: 3, ventanaMs: QUINCE_MINUTOS * 4 });
  
  router.post('/mi-constancia', requiereSesion(jwtSecret), async (req, res) => {
    const clave = String(req.usuario.id);
    if (limiteConstancias.bloqueado(clave)) return res.status(429).json({ error: 'Ya pediste tu constancia varias veces. Intenta de nuevo en una hora.' });
    limiteConstancias.registrar(clave);
    
    try {
      const resultado = await constancias.enviar(req.usuario.id, req.usuario.email);
      if (resultado.estado === 'NO_EXISTE') return res.status(404).json({ error: resultado.error });
      if (resultado.estado === 'FALLIDA') return res.status(502).json({ error: resultado.error });
      return res.json({ mensaje: `Enviamos tu constancia a ${resultado.email}. Ábrela con tu número de identificación.`, email: resultado.email });
    } catch (error) {
      if (errorBaseDatos(error)) return res.status(503).json({ error: errorBaseDatos(error) });
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
  });

  // 7. MÓDULO ADMIN
  router.use('/admin', crearRutasAdmin({ pool, jwtSecret, constancias }));
  
  app.use('/api/auth', router);
  return app;
}

module.exports = { crearApp, LARGO_MINIMO_CLAVE };