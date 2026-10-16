// Plantillas HTML de los correos que auth-service pide enviar al notification-service

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function plantillaAlertaLogin({ nombreUsuario, exito, ipCliente, fechaHora }) {
  const nombre = escaparHtml(nombreUsuario);
  const ip = escaparHtml(ipCliente);

  return exito
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #145da0; text-align: center; margin-bottom: 20px;">Tecnosalud Católica</h2>
        <p style="font-size: 15px; color: #1e293b;">Hola, <strong>${nombre}</strong>.</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Te informamos que se registró un <strong>inicio de sesión exitoso</strong> en tu cuenta del portal de afiliados.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Fecha y hora:</strong> ${fechaHora}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Dirección IP:</strong> ${ip}</p>
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
        <p style="font-size: 15px; color: #1e293b;">Hola, <strong>${nombre}</strong>.</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
          Hemos detectado un <strong>intento de acceso con contraseña errada</strong> a tu cuenta.
        </p>

        <div style="background-color: #fff1f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Fecha y hora:</strong> ${fechaHora}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Dirección IP solicitante:</strong> ${ip}</p>
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
}

function plantillaRecuperacion({ nombreUsuario, enlaceRestablecer }) {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #145da0; text-align: center;">Tecnosalud Católica</h2>
        <p>Hola, <strong>${escaparHtml(nombreUsuario)}</strong>.</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el portal de afiliados.</p>
        <p>Para ingresar una nueva contraseña, haz clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escaparHtml(enlaceRestablecer)}" style="background-color: #145da0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Restablecer mi contraseña
          </a>
        </div>
        <p style="color: #64748b; font-size: 0.85rem;">Este enlace estará activo durante <strong>15 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 0.75rem; text-align: center;">Tecnosalud Católica - Portal Institucional de Salud</p>
      </div>
    `;
}

module.exports = { escaparHtml, plantillaAlertaLogin, plantillaRecuperacion };
