// Constancia de registro en PDF, cifrada con AES-256. La contraseña para abrirla es el número de
// identificación del usuario; una contraseña de propietario aleatoria impide editarla o copiar su texto.
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const AZUL = '#145da0';
const GRIS = '#475569';
const ZONA_HORARIA = 'America/Bogota';

const TIPOS_DOCUMENTO = {
  CC: 'Cédula de ciudadanía',
  TI: 'Tarjeta de identidad',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
};

const ROLES = { PACIENTE: 'Paciente', MEDICO: 'Médico', ADMIN: 'Administrador' };

const fechaLarga = (valor) => (valor
  ? new Date(valor).toLocaleString('es-CO', { timeZone: ZONA_HORARIA, dateStyle: 'long', timeStyle: 'short' })
  : 'Sin registro');

// La contraseña es el número de identificación tal como está registrado, sin espacios
const contrasenaDe = (usuario) => String(usuario.documento).replace(/\s+/g, '');

/**
 * Genera la constancia y devuelve una promesa con el PDF (Buffer).
 * usuario: { id, nombre, email, tipoDoc, documento, rol, activo, creadoEn, ultimoAcceso }
 */
function generarConstancia(usuario, { emitida = new Date() } = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 56,
      pdfVersion: '1.7ext3', // AES-256
      userPassword: contrasenaDe(usuario),
      ownerPassword: crypto.randomBytes(24).toString('hex'),
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true,
        documentAssembly: false,
      },
      info: {
        Title: 'Constancia de registro - Tecnosalud Católica',
        Author: 'Tecnosalud Católica',
        Subject: 'Constancia de registro de usuario',
      },
    });

    const partes = [];
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const ancho = doc.page.width;

    // Encabezado institucional
    doc.rect(0, 0, ancho, 110).fill(AZUL);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('Tecnosalud Católica', 56, 36);
    doc.font('Helvetica').fontSize(11).text('Portal Institucional de Salud', 56, 66);
    doc.fontSize(9).text(`Constancia N.° TS-${String(usuario.id).padStart(6, '0')}`, 56, 66, { align: 'right', width: ancho - 112 });

    // Título
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(18).text('Constancia de registro', 56, 145);
    doc.moveDown(0.4);
    doc.fillColor(GRIS).font('Helvetica').fontSize(11).text(
      'Tecnosalud Católica certifica que la siguiente persona se encuentra registrada como usuaria del portal, con los datos que se detallan a continuación.',
      { width: ancho - 112, lineGap: 2 }
    );

    // Tabla de datos
    const filas = [
      ['Nombre completo', usuario.nombre],
      ['Tipo de documento', TIPOS_DOCUMENTO[usuario.tipoDoc] || usuario.tipoDoc],
      ['Número de documento', usuario.documento],
      ['Correo electrónico', usuario.email],
      ['Rol en el portal', ROLES[usuario.rol] || usuario.rol],
      ['Estado de la cuenta', usuario.activo ? 'Activa' : 'Inactiva'],
      ['Fecha de registro', fechaLarga(usuario.creadoEn)],
      ['Último acceso', fechaLarga(usuario.ultimoAcceso)],
    ];
    let y = doc.y + 22;
    const xEtiqueta = 56;
    const xValor = 230;
    filas.forEach(([etiqueta, valor], i) => {
      if (i % 2 === 0) doc.rect(xEtiqueta - 8, y - 6, ancho - 96, 26).fill('#f1f5f9');
      doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(10.5).text(etiqueta, xEtiqueta, y);
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10.5).text(String(valor ?? ''), xValor, y, { width: ancho - xValor - 56 });
      y += 26;
    });

    // Pie
    y += 24;
    doc.fillColor(GRIS).font('Helvetica').fontSize(9.5).text(`Documento emitido el ${fechaLarga(emitida)} (hora de Colombia).`, 56, y);
    doc.moveDown(0.6);
    doc.text(
      'Este documento está protegido: solo se abre con el número de identificación del titular y no permite modificaciones. '
        + 'Los datos personales se tratan conforme a la Ley 1581 de 2012 (habeas data).',
      { width: ancho - 112, lineGap: 2 }
    );
    doc.moveDown(1.2);
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(9).text('soporte@tecnosalud.com.co · Tecnosalud Católica', { align: 'center', width: ancho - 112 });

    doc.end();
  });
}

/** HTML del correo que acompaña la constancia (no incluye la contraseña). */
function correoConstancia(usuario) {
  const nombre = String(usuario.nombre).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #145da0; text-align: center;">Tecnosalud Católica</h2>
      <p>Hola, <strong>${nombre}</strong>.</p>
      <p>Adjuntamos tu <strong>constancia de registro</strong> en el portal, con tus datos y la fecha en que te registraste.</p>
      <div style="background-color: #eff6ff; border-left: 4px solid #145da0; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>Para abrir el PDF</strong> escribe tu <strong>número de identificación</strong>, sin puntos ni espacios.</p>
      </div>
      <p style="color: #64748b; font-size: 13px;">Si no solicitaste este documento, comunícate con soporte@tecnosalud.com.co.</p>
    </div>`;
}

module.exports = { generarConstancia, correoConstancia, contrasenaDe };
