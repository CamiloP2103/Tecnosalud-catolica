// PDFs clínicos cifrados con AES-256 (contraseña de apertura = número de identificación sin espacios).
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const AZUL = '#145da0';
const MORADO = '#5b21b6';
const GRIS = '#475569';
const ZONA_HORARIA = 'America/Bogota';

const fechaLarga = (valor) => {
  if (!valor) return 'Sin registro';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString('es-CO', {
    timeZone: ZONA_HORARIA,
    dateStyle: 'long',
    timeStyle: 'short',
  });
};

const contrasenaDeDocumento = (documento) =>
  String(documento || '000000').replace(/\s+/g, '');

function crearDocumentoPdfBase({ titulo, subject, documentoPaciente, colorEncabezado = AZUL, folio }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 56,
      pdfVersion: '1.7ext3',
      userPassword: contrasenaDeDocumento(documentoPaciente),
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
        Title: `${titulo} - Tecnosalud Católica`,
        Author: 'Tecnosalud Católica',
        Subject: subject,
      },
    });

    const partes = [];
    doc.on('data', (parte) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const ancho = doc.page.width;

    // Encabezado institucional
    doc.rect(0, 0, ancho, 110).fill(colorEncabezado);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('Tecnosalud Católica', 56, 36);
    doc.font('Helvetica').fontSize(11).text('Portal Institucional de Salud', 56, 66);
    if (folio) {
      doc.fontSize(9).text(folio, 56, 66, { align: 'right', width: ancho - 112 });
    }

    resolve({ doc, ancho, colorEncabezado });
  });
}

function renderizarPieLegal(doc, ancho, emitida, colorAcento) {
  let y = Math.min(doc.y + 20, doc.page.height - 135);
  if (y > doc.page.height - 125) {
    doc.addPage();
    y = 60;
  }
  doc.fillColor(GRIS).font('Helvetica').fontSize(9.5).text(
    `Documento emitido el ${fechaLarga(emitida)} (hora de Colombia).`,
    56,
    y
  );
  doc.moveDown(0.5);
  doc.text(
    'Este documento está protegido: solo se abre con el número de identificación del titular y no permite modificaciones. '
      + 'Los datos clínicos y personales se tratan conforme a la normatividad vigente y la Ley 1581 de 2012 (habeas data).',
    { width: ancho - 112, lineGap: 2 }
  );
  doc.moveDown(1);
  doc.fillColor(colorAcento).font('Helvetica-Bold').fontSize(9).text(
    'soporte@tecnosalud.com.co · Tecnosalud Católica',
    { align: 'center', width: ancho - 112 }
  );
}

/**
 * 1. PDF de Diagnóstico y Atención Médica
 */
function generarPdfAtencionDiagnostico(datos, { emitida = new Date() } = {}) {
  const folio = `HC-${String(datos.historia_clinica_id || datos.id || '000000').padStart(6, '0')}`;
  return crearDocumentoPdfBase({
    titulo: 'Resumen de Atención y Diagnóstico',
    subject: 'Historia clínica - Diagnóstico y plan de manejo',
    documentoPaciente: datos.afiliado_documento || datos.documento,
    colorEncabezado: AZUL,
    folio,
  }).then(({ doc, ancho, colorEncabezado }) => {
    doc.fillColor(colorEncabezado).font('Helvetica-Bold').fontSize(17).text(
      'Constancia de Atención y Diagnóstico Médico',
      56,
      140
    );
    doc.moveDown(0.35);
    doc.fillColor(GRIS).font('Helvetica').fontSize(10.5).text(
      'Detalle de la consulta médica, diagnóstico CIE-10 y plan de manejo registrado en Tecnosalud Católica.',
      { width: ancho - 112, lineGap: 2 }
    );

    const campos = [
      ['Paciente', datos.afiliado_nombre || datos.nombre_paciente || 'Paciente'],
      ['Documento', datos.afiliado_documento || datos.documento || 'N/A'],
      ['Fecha de atención', fechaLarga(datos.fecha_atencion || datos.fecha || emitida)],
      ['Motivo de consulta', datos.motivo_consulta || 'No especificado'],
      ['Diagnóstico principal', datos.diagnostico_principal || 'No especificado'],
      ['Diagnóstico secundario', datos.diagnostico_secundario || 'No especificado'],
      ['Plan de manejo', datos.plan_manejo || 'No especificado'],
      ['Observaciones', datos.observaciones || 'Sin observaciones adicionales'],
    ];

    let y = doc.y + 18;
    const xEtiqueta = 56;
    const xValor = 215;
    const anchoValor = ancho - xValor - 56;

    campos.forEach(([etiqueta, valor], i) => {
      const textoValor = String(valor ?? '');
      const altoTexto = doc.heightOfString(textoValor, { width: anchoValor, lineGap: 2 });
      const altoFila = Math.max(24, altoTexto + 10);

      if (y + altoFila > doc.page.height - 140) {
        doc.addPage();
        y = 60;
      }

      if (i % 2 === 0) {
        doc.rect(xEtiqueta - 6, y - 4, ancho - 106, altoFila).fill('#f1f5f9');
      }
      doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(10).text(etiqueta, xEtiqueta, y, { width: xValor - xEtiqueta - 10 });
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(textoValor, xValor, y, {
        width: anchoValor,
        lineGap: 2,
      });
      y += altoFila + 4;
    });

    doc.y = y;
    renderizarPieLegal(doc, ancho, emitida, colorEncabezado);
    doc.end();
  });
}

/**
 * 2. PDF de Receta Médica
 */
function generarPdfRecetaMedica(datos, { emitida = new Date() } = {}) {
  const folio = `RX-${String(datos.historia_clinica_id || datos.id || '000000').padStart(6, '0')}`;
  return crearDocumentoPdfBase({
    titulo: 'Receta Médica',
    subject: 'Prescripción y receta médica',
    documentoPaciente: datos.afiliado_documento || datos.documento,
    colorEncabezado: MORADO,
    folio,
  }).then(({ doc, ancho, colorEncabezado }) => {
    doc.fillColor(colorEncabezado).font('Helvetica-Bold').fontSize(17).text(
      'Receta Médica / Prescripción Farmacológica',
      56,
      140
    );
    doc.moveDown(0.35);
    doc.fillColor(GRIS).font('Helvetica').fontSize(10.5).text(
      'Prescripción emitida en la atención clínica de Tecnosalud Católica.',
      { width: ancho - 112, lineGap: 2 }
    );

    const datosCabecera = [
      ['Paciente', datos.afiliado_nombre || datos.nombre_paciente || 'Paciente'],
      ['Documento', datos.afiliado_documento || datos.documento || 'N/A'],
      ['Fecha de emisión', fechaLarga(datos.fecha_atencion || datos.fecha || emitida)],
      ['Diagnóstico asociado', datos.diagnostico_principal || 'No especificado'],
    ];

    let y = doc.y + 16;
    const xEtiqueta = 56;
    const xValor = 215;
    const anchoValor = ancho - xValor - 56;

    datosCabecera.forEach(([etiqueta, valor], i) => {
      if (i % 2 === 0) {
        doc.rect(xEtiqueta - 6, y - 4, ancho - 106, 24).fill('#f5f3ff');
      }
      doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(10).text(etiqueta, xEtiqueta, y);
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(String(valor ?? ''), xValor, y, { width: anchoValor });
      y += 26;
    });

    y += 10;
    doc.fillColor(colorEncabezado).font('Helvetica-Bold').fontSize(12).text('Medicamentos formulados', 56, y);
    y += 18;

    const detalles = Array.isArray(datos.receta?.detalles) && datos.receta.detalles.length > 0
      ? datos.receta.detalles
      : null;

    if (detalles) {
      detalles.forEach((med, idx) => {
        const bloque = [
          `${idx + 1}. ${med.medicamento || 'Medicamento'}`,
          `Dosis: ${med.dosis || 'N/A'}  |  Vía: ${med.via_administracion || 'Oral'}`,
          `Frecuencia: ${med.frecuencia || 'N/A'}  |  Duración: ${med.duracion_tratamiento || 'N/A'}`,
        ].join('\n');

        const altoBloque = doc.heightOfString(bloque, { width: ancho - 124, lineGap: 2 }) + 14;
        if (y + altoBloque > doc.page.height - 140) {
          doc.addPage();
          y = 60;
        }
        doc.rect(54, y - 4, ancho - 108, altoBloque).fill('#f8fafc');
        doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(bloque, 62, y, {
          width: ancho - 124,
          lineGap: 2,
        });
        y += altoBloque + 8;
      });
    } else {
      const textoPlan = datos.plan_manejo || 'No se registraron medicamentos detallados en esta atención.';
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(textoPlan, 56, y, {
        width: ancho - 112,
        lineGap: 2,
      });
      y = doc.y + 12;
    }

    if (datos.receta?.indicaciones_generales) {
      doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(10).text('Indicaciones generales:', 56, y);
      y += 14;
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(datos.receta.indicaciones_generales, 56, y, {
        width: ancho - 112,
        lineGap: 2,
      });
      y = doc.y + 12;
    }

    doc.y = y;
    renderizarPieLegal(doc, ancho, emitida, colorEncabezado);
    doc.end();
  });
}

module.exports = {
  generarPdfAtencionDiagnostico,
  generarPdfRecetaMedica,
};