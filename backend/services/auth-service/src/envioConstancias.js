// Envía la constancia de registro al correo del usuario y deja registro en
// db_auth.constancias_enviadas. Delega la creación del PDF al ms de Documentos.
const { correoConstancia } = require('./constancia');

const NOMBRE_ARCHIVO = 'constancia-registro-tecnosalud.pdf';
const MAX_ENVIO_MASIVO = 200;

function crearEnvioConstancias({ pool, notificar }) {
  async function buscarUsuario(id) {
    const [filas] = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.tipo_doc AS tipoDoc, u.documento, r.nombre AS rol, u.activo, u.creado_en AS creadoEn,
              (SELECT MAX(b.fecha_intento) FROM bitacora_acceso b WHERE b.usuario_id = u.id AND b.exitoso = TRUE) AS ultimoAcceso
       FROM usuarios u INNER JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
      [id]
    );
    if (filas.length === 0) return null;
    return { ...filas[0], activo: Boolean(Number(filas[0].activo)) };
  }

  async function registrar(usuarioId, enviadoPor, estado, error = null) {
    try {
      await pool.query(
        'INSERT INTO constancias_enviadas (usuario_id, enviado_por, estado, error) VALUES (?, ?, ?, ?)',
        [usuarioId, String(enviadoPor).slice(0, 120), estado, error ? String(error).slice(0, 255) : null]
      );
    } catch (errorRegistro) {
      console.error('[auth-service] No se pudo registrar la constancia:', errorRegistro.code || errorRegistro.message);
    }
  }

  /** Orquesta la generación (en Documentos) y el envío (en Notificaciones) de la constancia. */
  async function enviar(usuarioId, enviadoPor) {
    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) return { usuarioId, estado: 'NO_EXISTE', error: 'El usuario no existe.' };

    try {
      // 1. Delegar la generación del PDF al microservicio de Documentos
      const urlDocumentos = process.env.DOCUMENTOS_SERVICE_URL || 'http://localhost:3006';
      const respuestaDoc = await fetch(`${urlDocumentos}/api/documentos/generar-pdf-constancia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario) // Pasamos los datos para que Documentos arme el PDF
      });

      if (!respuestaDoc.ok) {
        throw new Error('Fallo la generación del PDF en el microservicio de Documentos.');
      }
      
      const datosPdf = await respuestaDoc.json();

      // 2. Delegar el envío al microservicio de Notificaciones
      await notificar({
        to: usuario.email,
        subject: 'Tu constancia de registro - Tecnosalud Católica',
        html: correoConstancia(usuario),
        adjuntos: [{ nombre: NOMBRE_ARCHIVO, tipo: 'application/pdf', contenidoBase64: datosPdf.base64 }],
      });
      
      await registrar(usuario.id, enviadoPor, 'ENVIADA');
      return { usuarioId: usuario.id, email: usuario.email, estado: 'ENVIADA' };
    } catch (error) {
      await registrar(usuario.id, enviadoPor, 'FALLIDA', error.message);
      return { usuarioId: usuario.id, email: usuario.email, estado: 'FALLIDA', error: 'No se pudo generar o enviar el documento.' };
    }
  }

  /** Envía la constancia a todos los usuarios activos, uno por uno (máximo 200 por ejecución). */
  async function enviarATodos(enviadoPor) {
    const [ids] = await pool.query('SELECT id FROM usuarios WHERE activo = TRUE ORDER BY id LIMIT ?', [MAX_ENVIO_MASIVO]);
    const resultados = [];
    for (const { id } of ids) {
      resultados.push(await enviar(id, enviadoPor));
    }
    return {
      total: resultados.length,
      enviadas: resultados.filter((r) => r.estado === 'ENVIADA').length,
      fallidas: resultados.filter((r) => r.estado === 'FALLIDA').length,
      resultados,
    };
  }

  return { enviar, enviarATodos, buscarUsuario };
}

module.exports = { crearEnvioConstancias, NOMBRE_ARCHIVO };