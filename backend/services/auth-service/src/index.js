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

// Función auxiliar para enviar alertas de acceso al Notification Service sin bloquear el login
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

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af; font-size: 14px;">¿Fuiste tú quien ingresó?</p>
          <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.4;">
            Si reconoces esta actividad, puedes ignorar este mensaje. Si <strong>NO fuiste tú</strong>, por tu seguridad te sugerimos cambiar tu contraseña de inmediato o comunicarte con uno de nuestros asesores de soporte técnico.
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
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

        <div style="background-color: #fef2f2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #991b1b; font-size: 14px;">¿Fuiste tú intentando ingresar?</p>
          <p style="margin: 0; font-size: 13px; color: #7f1d1d; line-height: 1.4;">
            Si olvidaste tu clave, utiliza la opción de <em>Recuperar Contraseña</em> en el portal. Pero si <strong>NO fuiste tú</strong> quien realizó este intento, comunícate de inmediato con un asesor institucional o restablece tus credenciales para proteger tu cuenta.
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Mesa de ayuda: soporte@tecnosalud.com.co | Tecnosalud Católica</p>
      </div>
    `;

  try {
    console.log(`[auth-service] Notificando evento de seguridad (${exito ? 'Acceso Exitoso' : 'Fallo de Clave'}) a: ${destinatario}`);
    const resNotif = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: destinatario,
        subject: asunto,
        html: plantillaHtml
      })
    });

    if (!resNotif.ok) {
      console.warn(`[auth-service] Notification-service devolvió código ${resNotif.status} al notificar seguridad.`);
    }
  } catch (err) {
    console.error('[auth-service] No se pudo enviar la alerta de seguridad vía notification-service:', err.message);
  }
}

const router = express.Router();

// 1. Endpoint de Inicio de Sesión
router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  const ipCliente = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Local';

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
  }

  const emailIngresado = usuario.trim().toLowerCase();

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.tipo_doc, u.documento, u.email, u.contrasena_hash, u.nombre, u.activo, r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.email = ? LIMIT 1`,
      [emailIngresado]
    );

    // Caso A: Si el usuario ni siquiera existe, no enviamos correo para evitar spam a correos ajenos
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario inactivo o bloqueado.' });
    }

    // Validar contraseña
    const esValida = await bcrypt.compare(contrasena, user.contrasena_hash);

    // Caso B: El usuario existe pero colocó la contraseña errada -> Dispara Alerta
    if (!esValida) {
      notificarSeguridadLogin({
        destinatario: user.email,
        nombreUsuario: user.nombre,
        exito: false,
        ipCliente
      }); // Se ejecuta en segundo plano
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Caso C: Inicio de sesión correcto -> Dispara Notificación de Acceso
    notificarSeguridadLogin({
      destinatario: user.email,
      nombreUsuario: user.nombre,
      exito: true,
      ipCliente
    }); // Se ejecuta en segundo plano

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, doc: user.documento },
      JWT_SECRET,
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
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

// 2. SOLICITUD DE RECUPERACIÓN: Generar token y delegar envío al Notification Service
router.post('/recuperar-clave/solicitar', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Debes ingresar un correo electrónico.' });
  }

  const emailLimpio = email.trim().toLowerCase();
  console.log(`\n[auth-service] Solicitud de recuperación para: ${emailLimpio}`);

  try {
    const [usuarios] = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE email = ? LIMIT 1',
      [emailLimpio]
    );

    if (usuarios.length === 0) {
      console.warn(`[auth-service] Correo no registrado: ${emailLimpio}`);
      return res.status(404).json({ error: 'El correo ingresado no se encuentra registrado en el sistema.' });
    }

    const usuario = usuarios[0];
    const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
    const fechaExpiracion = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)',
      [usuario.id, tokenRecuperacion, fechaExpiracion]
    );
    console.log(`[auth-service] Token guardado en db_auth para usuario: ${usuario.id}`);

    const enlaceRestablecer = `${FRONTEND_URL}/#restablecer-clave?token=${tokenRecuperacion}`;

    const plantillaHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #145da0; text-align: center;">Tecnosalud Católica</h2>
        <p>Hola, <strong>${usuario.nombre}</strong>.</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el portal de afiliados.</p>
        <p>Para ingresar una nueva contraseña, haz clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${enlaceRestablecer}" style="background-color: #145da0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Restablecer mi contraseña
          </a>
        </div>
        <p style="color: #64748b; font-size: 0.85rem;">Este enlace estará activo durante <strong>15 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 0.75rem; text-align: center;">Tecnosalud Católica - Portal Institucional de Salud</p>
      </div>
    `;

    console.log(`[auth-service] Delegando despacho a ${NOTIFICATION_SERVICE_URL}/api/notifications/email...`);
    try {
      const respuestaNotificacion = await fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: usuario.email,
          subject: 'Recuperación de Contraseña - Tecnosalud Católica',
          html: plantillaHtml
        })
      });

      if (!respuestaNotificacion.ok) {
        const errorData = await respuestaNotificacion.json().catch(() => ({}));
        throw new Error(errorData.mensaje || `Estado HTTP: ${respuestaNotificacion.status}`);
      }

      console.log(`[auth-service] Notificación enviada con éxito vía notification-service.`);
    } catch (notifError) {
      console.error('[auth-service] Error comunicando con notification-service:', notifError.message);
      return res.status(502).json({
        error: 'El servicio de notificaciones no pudo despachar el correo. Intenta de nuevo más tarde.'
      });
    }

    return res.json({ mensaje: 'Correo de recuperación enviado con éxito.' });
  } catch (error) {
    console.error('Error general en /recuperar-clave/solicitar:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

// 3. RESTABLECER CONTRASEÑA: Validar token y cambiar hash
router.post('/recuperar-clave/restablecer', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios.' });
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
      'UPDATE usuarios SET contrasena_hash = ? WHERE id = ?',
      [nuevoHash, registroToken.usuario_id]
    );

    await pool.query(
      'UPDATE tokens_recuperacion SET usado = TRUE WHERE id = ?',
      [registroToken.id]
    );

    return res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    return res.status(500).json({ error: 'Error interno al actualizar contraseña.' });
  }
});

app.use('/api/auth', router);

app.listen(PORT, () => {
  console.log(`Microservicio de Autenticación activo en el puerto ${PORT} (/api/auth)`);
});