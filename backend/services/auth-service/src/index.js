const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'tecnosalud_secret_jwt_key_2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const router = express.Router();

// 1. Endpoint de Inicio de Sesión
router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;

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

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const user = rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario inactivo o bloqueado.' });
    }

    const esValida = await bcrypt.compare(contrasena, user.contrasena_hash);
    if (!esValida) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

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

// 2. SOLICITUD DE RECUPERACIÓN: Generar token y enviar correo
router.post('/recuperar-clave/solicitar', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Debes ingresar un correo electrónico.' });
  }

  const emailLimpio = email.trim().toLowerCase();

  try {
    const [usuarios] = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE email = ? LIMIT 1',
      [emailLimpio]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'El correo ingresado no se encuentra registrado en el sistema.' });
    }

    const usuario = usuarios[0];

    // Generar token único aleatorio y calcular expiración en 15 minutos
    const tokenRecuperacion = crypto.randomBytes(32).toString('hex');
    const fechaExpiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar token en db_auth
    await pool.query(
      'INSERT INTO tokens_recuperacion (usuario_id, token, expira_en) VALUES (?, ?, ?)',
      [usuario.id, tokenRecuperacion, fechaExpiracion]
    );

    // Enlace directo al frontend con hash routing
    const enlaceRestablecer = `${FRONTEND_URL}/#restablecer-clave?token=${tokenRecuperacion}`;

    // Enviar correo electrónico
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Tecnosalud Católica" <no-reply@tecnosalud.com.co>',
      to: usuario.email,
      subject: 'Recuperación de Contraseña - Tecnosalud Católica',
      html: `
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
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ mensaje: 'Correo de recuperación enviado con éxito.' });
  } catch (error) {
    console.error('Error al enviar correo de recuperación:', error);
    return res.status(500).json({ error: 'No se pudo enviar el correo de recuperación. Revisa la configuración SMTP.' });
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

    // Hashear la nueva contraseña con bcrypt
    const salt = await bcrypt.genSalt(10);
    const nuevoHash = await bcrypt.hash(nuevaContrasena.trim(), salt);

    // Actualizar contraseña en la tabla de usuarios
    await pool.query(
      'UPDATE usuarios SET contrasena_hash = ? WHERE id = ?',
      [nuevoHash, registroToken.usuario_id]
    );

    // Marcar el token como usado
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