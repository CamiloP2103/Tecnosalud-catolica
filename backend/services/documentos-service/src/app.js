const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { errorBaseDatos } = require('./errores');
const { generarConstancia } = require('./constancia');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENT_PATTERN = /^[A-Za-z0-9.-]{5,20}$/;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_TYPES = {
  'application/pdf': { extension: '.pdf', signature: Buffer.from('%PDF-') },
  'image/jpeg': { extension: '.jpg', signature: Buffer.from([0xff, 0xd8, 0xff]) },
  'image/png': {
    extension: '.png',
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
};
const STAFF_ROLES = new Set(['MEDICO', 'ADMIN']);

function normalizeDocument(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeOriginalName(value) {
  return path.basename(value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .slice(0, 255);
}

function canAccessPatient(user, patientDocument) {
  return user.doc === patientDocument || STAFF_ROLES.has(user.rol);
}

function verifyFileSignature(file, mimeType) {
  const specification = MIME_TYPES[mimeType];
  const extensionIsValid = mimeType === 'image/jpeg'
    ? /\.(jpg|jpeg)$/i.test(file.originalname)
    : file.originalname.toLowerCase().endsWith(specification?.extension || '\0');
  return Boolean(
    specification &&
    extensionIsValid &&
    file.buffer.subarray(0, specification.signature.length).equals(specification.signature)
  );
}

function encryptContents(contents, encryptionKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(contents), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

function decryptContents(encryptedContents, encryptionKey) {
  if (encryptedContents.length < 28) {
    throw new Error('El archivo cifrado está incompleto.');
  }
  const iv = encryptedContents.subarray(0, 12);
  const authTag = encryptedContents.subarray(12, 28);
  const ciphertext = encryptedContents.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Responde 503 con la causa cuando MySQL no está disponible; devuelve false si es otro error
function responderErrorBaseDatos(res, error) {
  const mensaje = errorBaseDatos(error);
  if (!mensaje) return false;
  console.error('[documentos-service] Base de datos no disponible:', error.code);
  res.status(503).json({ error: mensaje });
  return true;
}

function createApp({ pool, jwtSecret, encryptionKey, storageDir, frontendUrl = 'http://localhost:5173' }) {
  if (!pool || !jwtSecret || !Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32 || !storageDir) {
    throw new Error('pool, jwtSecret, una clave AES de 32 bytes y storageDir son requeridos para iniciar documentos-service.');
  }

  const app = express();
  app.disable('x-powered-by');
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, callback) => {
      if (!MIME_TYPES[file.mimetype]) {
        return callback(new Error('Solo se permiten archivos PDF, PNG o JPG.'));
      }
      return callback(null, true);
    },
  });

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: '30kb' }));

  function autenticar(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Debes iniciar sesión para acceder a documentos clínicos.' });
    }

    try {
      const usuario = jwt.verify(match[1], jwtSecret);
      if (!usuario.doc || !usuario.rol) {
        return res.status(401).json({ error: 'La sesión no contiene una identidad válida.' });
      }
      req.usuario = {
        doc: normalizeDocument(usuario.doc),
        rol: String(usuario.rol).toUpperCase(),
      };
      if (!DOCUMENT_PATTERN.test(req.usuario.doc)) {
        return res.status(401).json({ error: 'La sesión no contiene una identificación válida.' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'La sesión es inválida o ha expirado.' });
    }
  }

  function exigirPersonalClinico(req, res, next) {
    if (!STAFF_ROLES.has(req.usuario.rol)) {
      return res.status(403).json({ error: 'Solo el personal clínico autorizado puede generar documentos.' });
    }
    return next();
  }

  function validarDocumentoPaciente(value) {
    const documento = normalizeDocument(value);
    return DOCUMENT_PATTERN.test(documento) ? documento : null;
  }

  async function guardarDocumento({ pacienteDoc, titulo, descripcion, originalName, contentType, contents, creadorDoc }) {
    const id = crypto.randomUUID();
    const extension = MIME_TYPES[contentType]?.extension || '.txt';
    const nombreGuardado = `${id}.enc`;
    const destination = path.join(storageDir, nombreGuardado);
    const encryptedContents = encryptContents(contents, encryptionKey);

    await fs.mkdir(storageDir, { recursive: true });
    await fs.writeFile(destination, encryptedContents, { flag: 'wx', mode: 0o600 });

    try {
      await pool.execute(
        `INSERT INTO documentos
          (id, paciente_doc, titulo, descripcion, nombre_original, nombre_guardado, extension,
           content_type, tamano, creado_por_doc)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, pacienteDoc, titulo, descripcion || null, originalName, nombreGuardado, extension,
          contentType, contents.length, creadorDoc,
        ]
      );
    } catch (error) {
      await fs.unlink(destination).catch((unlinkError) => {
        console.error('[documentos-service] No se pudo limpiar un archivo tras fallar su registro:', unlinkError);
      });
      throw error;
    }

    return {
      id,
      titulo,
      descripcion: descripcion || null,
      nombreOriginal: originalName,
      contentType,
      tamano: contents.length,
    };
  }

  app.get('/api/documentos/health', (req, res) => {
    res.json({ servicio: 'documentos-service', estado: 'activo' });
  });

  // Endpoint para generar la constancia en PDF solicitada por Autenticación
  app.post('/api/documentos/generar-pdf-constancia', async (req, res) => {
    try {
      const usuario = req.body;

      if (!usuario || !usuario.documento) {
        return res.status(400).json({ error: 'Faltan los datos del usuario para generar el PDF.' });
      }

      const pdfBuffer = await generarConstancia(usuario);
      const pdfBase64 = pdfBuffer.toString('base64');

      return res.json({ 
        mensaje: 'PDF generado exitosamente',
        base64: pdfBase64 
      });

    } catch (error) {
      console.error('[documentos-service] Error generando constancia PDF:', error);
      return res.status(500).json({ error: 'Error interno generando el documento PDF.' });
    }
  });

  app.get('/api/documentos', autenticar, async (req, res) => {
    const pacienteDoc = validarDocumentoPaciente(req.query.documentoPaciente);
    if (!pacienteDoc) {
      return res.status(400).json({ error: 'Ingresa una identificación de paciente válida.' });
    }
    if (!canAccessPatient(req.usuario, pacienteDoc)) {
      return res.status(403).json({ error: 'Solo puedes consultar tus propios documentos.' });
    }

    try {
      const [rows] = await pool.execute(
        `SELECT id, titulo, descripcion, nombre_original AS nombreOriginal,
                content_type AS contentType, tamano, creado_en AS creadoEn
         FROM documentos WHERE paciente_doc = ? ORDER BY creado_en DESC`,
        [pacienteDoc]
      );
      return res.json({ documentos: rows });
    } catch (error) {
      if (responderErrorBaseDatos(res, error)) return undefined;
      console.error('[documentos-service] Error al consultar documentos:', error);
      return res.status(500).json({ error: 'No fue posible consultar los documentos.' });
    }
  });

  app.post('/api/documentos', autenticar, upload.single('archivo'), async (req, res) => {
    const body = req.body || {};
    const pacienteDoc = validarDocumentoPaciente(body.documentoPaciente);
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';

    if (!pacienteDoc) {
      return res.status(400).json({ error: 'Ingresa una identificación de paciente válida.' });
    }
    if (!canAccessPatient(req.usuario, pacienteDoc)) {
      return res.status(403).json({ error: 'Solo puedes cargar documentos para tu propia historia clínica.' });
    }
    if (!titulo || titulo.length > 150 || descripcion.length > 500) {
      return res.status(400).json({ error: 'El título es obligatorio (máximo 150 caracteres) y la descripción no puede superar 500.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Selecciona un archivo PDF, PNG o JPG.' });
    }
    if (!verifyFileSignature(req.file, req.file.mimetype)) {
      return res.status(400).json({ error: 'El contenido del archivo no coincide con su formato declarado.' });
    }

    try {
      const documento = await guardarDocumento({
        pacienteDoc,
        titulo,
        descripcion,
        originalName: sanitizeOriginalName(req.file.originalname),
        contentType: req.file.mimetype,
        contents: req.file.buffer,
        creadorDoc: req.usuario.doc,
      });
      return res.status(201).json({ documento });
    } catch (error) {
      if (responderErrorBaseDatos(res, error)) return undefined;
      console.error('[documentos-service] Error al guardar documento:', error);
      return res.status(500).json({ error: 'No fue posible guardar el documento.' });
    }
  });

  app.post('/api/documentos/generar', autenticar, exigirPersonalClinico, async (req, res) => {
    const body = req.body || {};
    const pacienteDoc = validarDocumentoPaciente(body.documentoPaciente);
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const contenido = typeof body.contenido === 'string' ? body.contenido.trim() : '';

    if (!pacienteDoc) {
      return res.status(400).json({ error: 'Ingresa una identificación de paciente válida.' });
    }
    if (!titulo || titulo.length > 150 || contenido.length < 1 || contenido.length > 20000) {
      return res.status(400).json({ error: 'El título y el contenido son obligatorios; el contenido admite hasta 20.000 caracteres.' });
    }

    const texto = [
      'TECNOSALUD CATÓLICA',
      titulo,
      `Fecha de generación: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
      '',
      contenido,
      '',
    ].join('\n');

    try {
      const documento = await guardarDocumento({
        pacienteDoc,
        titulo,
        descripcion: 'Documento generado por personal clínico.',
        originalName: `${titulo.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 80) || 'documento'}.txt`,
        contentType: 'text/plain',
        contents: Buffer.from(texto, 'utf8'),
        creadorDoc: req.usuario.doc,
      });
      return res.status(201).json({ documento });
    } catch (error) {
      if (responderErrorBaseDatos(res, error)) return undefined;
      console.error('[documentos-service] Error al generar documento:', error);
      return res.status(500).json({ error: 'No fue posible generar el documento.' });
    }
  });

  app.post('/api/documentos/:id/descargar', autenticar, async (req, res) => {
    const id = req.params.id;
    const documentoAcceso = validarDocumentoPaciente((req.body || {}).documentoAcceso);

    if (!UUID_PATTERN.test(id)) {
      return res.status(400).json({ error: 'El identificador del documento no es válido.' });
    }
    if (!documentoAcceso || documentoAcceso !== req.usuario.doc) {
      return res.status(403).json({ error: 'La identificación ingresada no coincide con la sesión autenticada.' });
    }

    try {
      const [rows] = await pool.execute(
        `SELECT id, paciente_doc AS pacienteDoc, nombre_original AS nombreOriginal,
                nombre_guardado AS nombreGuardado, content_type AS contentType
         FROM documentos WHERE id = ? LIMIT 1`,
        [id]
      );
      const documento = rows[0];
      if (!documento) {
        return res.status(404).json({ error: 'No se encontró el documento solicitado.' });
      }
      if (!canAccessPatient(req.usuario, documento.pacienteDoc)) {
        return res.status(403).json({ error: 'No tienes permiso para acceder a este documento clínico.' });
      }

      const rutaArchivo = path.join(storageDir, documento.nombreGuardado);
      let contenidoDescifrado;
      try {
        const contenidoCifrado = await fs.readFile(rutaArchivo);
        contenidoDescifrado = decryptContents(contenidoCifrado, encryptionKey);
      } catch (error) {
        console.error('[documentos-service] No se pudo leer o autenticar el archivo protegido:', error);
        return res.status(500).json({ error: 'El archivo solicitado no está disponible o no pudo validarse.' });
      }

      await pool.execute(
        `INSERT INTO bitacora_descargas
          (documento_id, usuario_doc, rol_usuario, ip_origen, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [
          documento.id,
          req.usuario.doc,
          req.usuario.rol,
          req.ip,
          String(req.get('user-agent') || '').slice(0, 500),
        ]
      );

      const nombreDescarga = sanitizeOriginalName(documento.nombreOriginal) || `documento${path.extname(documento.nombreGuardado)}`;
      res.set('Cache-Control', 'no-store');
      res.set('X-Content-Type-Options', 'nosniff');
      res.attachment(nombreDescarga);
      res.type(documento.contentType);
      return res.send(contenidoDescifrado);
    } catch (error) {
      if (responderErrorBaseDatos(res, error)) return undefined;
      console.error('[documentos-service] Error al preparar descarga:', error);
      return res.status(500).json({ error: 'No fue posible procesar la descarga.' });
    }
  });

  app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        error: error.code === 'LIMIT_FILE_SIZE'
          ? 'El archivo supera el límite de 10 MB.'
          : 'La solicitud contiene un archivo no válido.',
      });
    }
    if (error) {
      if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'El cuerpo JSON de la solicitud no es válido.' });
      }
      if (error.type === 'entity.too.large') {
        return res.status(413).json({ error: 'El cuerpo de la solicitud supera el límite permitido.' });
      }
      if (error.message === 'Solo se permiten archivos PDF, PNG o JPG.') {
        return res.status(400).json({ error: error.message });
      }
      console.error('[documentos-service] Error inesperado:', error);
      return res.status(500).json({ error: 'Error interno en el servidor.' });
    }
    return next();
  });

  return app;
}

module.exports = {
  createApp,
  canAccessPatient,
  normalizeDocument,
  sanitizeOriginalName,
  verifyFileSignature,
  encryptContents,
  decryptContents,
};