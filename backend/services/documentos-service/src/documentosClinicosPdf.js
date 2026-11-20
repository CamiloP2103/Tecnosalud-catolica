// PDFs clínicos cifrados con AES-256 (contraseña de apertura = número de identificación sin espacios).
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const AZUL = '#145da0';
const MORADO = '#5b21b6';
const AMBAR = '#b45309';
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

const fechaCorta = (valor) => {
  if (!valor) return 'Sin registro';
  const str = String(valor).trim();
  const matchIso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchIso) return matchIso[1];
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('es-CO', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const contrasenaDeDocumento = (documento) =>
  String(documento || '000000').replace(/\s+/g, '');

function iniciarPdf({ titulo, subject, documentoPaciente, colorEncabezado, folio, onListo }) {
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

    onListo(doc, ancho);
    doc.end();
  });
}

function renderizarFirmaMedico(doc, ancho, datos, colorAcento) {
  let y = doc.y + 18;
  if (y + 85 > doc.page.height - 125) {
    doc.addPage();
    y = 60;
  }

  const nombreMedico = datos.medico_nombre || datos.medicoNombre || datos.medico || 'Profesional de la Salud';
  const registroMedico = datos.registro_medico || datos.registroMedico || '';
  const especialidad = datos.especialidad || '';

  doc.moveTo(56, y).lineTo(280, y).strokeColor('#94a3b8').lineWidth(1).stroke();
  y += 8;

  doc.fillColor(colorAcento).font('Helvetica-Bold').fontSize(10.5).text(nombreMedico, 56, y, { width: ancho - 112 });
  y += 14;

  if (especialidad) {
    doc.fillColor('#0f172a').font('Helvetica').fontSize(9.5).text(`Especialidad: ${especialidad}`, 56, y, { width: ancho - 112 });
    y += 13;
  }
  if (registroMedico) {
    doc.fillColor(GRIS).font('Helvetica').fontSize(9.5).text(`Registro Médico / RM: ${registroMedico}`, 56, y, { width: ancho - 112 });
    y += 13;
  }
  doc.fillColor(GRIS).font('Helvetica').fontSize(9).text('Firma digital / Profesional tratante · Tecnosalud Católica', 56, y, { width: ancho - 112 });
  doc.y = y + 12;
}

function renderizarPieLegal(doc, ancho, emitida, colorAcento) {
  let y = Math.min(doc.y + 14, doc.page.height - 125);
  if (y > doc.page.height - 115) {
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
  return iniciarPdf({
    titulo: 'Resumen de Atención y Diagnóstico',
    subject: 'Historia clínica - Diagnóstico y plan de manejo',
    documentoPaciente: datos.afiliado_documento || datos.documento,
    colorEncabezado: AZUL,
    folio,
    onListo: (doc, ancho) => {
      doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(17).text(
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

        if (y + altoFila > doc.page.height - 150) {
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
      renderizarFirmaMedico(doc, ancho, datos, AZUL);
      renderizarPieLegal(doc, ancho, emitida, AZUL);
    },
  });
}

/**
 * 2. PDF de Receta Médica
 */
function generarPdfRecetaMedica(datos, { emitida = new Date() } = {}) {
  const folio = `RX-${String(datos.historia_clinica_id || datos.id || '000000').padStart(6, '0')}`;
  return iniciarPdf({
    titulo: 'Receta Médica',
    subject: 'Prescripción y receta médica',
    documentoPaciente: datos.afiliado_documento || datos.documento,
    colorEncabezado: MORADO,
    folio,
    onListo: (doc, ancho) => {
      doc.fillColor(MORADO).font('Helvetica-Bold').fontSize(17).text(
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
      doc.fillColor(MORADO).font('Helvetica-Bold').fontSize(12).text('Medicamentos formulados', 56, y);
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
          if (y + altoBloque > doc.page.height - 150) {
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
        doc.fillColor(GRIS).font('Helvetica').fontSize(10).text(
          'No se registraron medicamentos formulados en esta atención.',
          56,
          y,
          { width: ancho - 112, lineGap: 2 }
        );
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
      renderizarFirmaMedico(doc, ancho, datos, MORADO);
      renderizarPieLegal(doc, ancho, emitida, MORADO);
    },
  });
}

/**
 * 3. PDF de Incapacidad Médica
 */
function generarPdfIncapacidadMedica(datos, { emitida = new Date() } = {}) {
  const folio = `INC-${String(datos.historia_clinica_id || datos.id || '000000').padStart(6, '0')}`;
  const inc = datos.dias_incapacidad && typeof datos.incapacidad === 'object' ? datos.incapacidad : {};

  const diasRaw = datos.dias_incapacidad ?? inc.dias ?? inc.dias_incapacidad ?? null;
  const textoDias = diasRaw !== null && diasRaw !== ''
    ? `${diasRaw} ${Number(diasRaw) === 1 ? 'día' : 'días'}`
    : 'No especificados';

  const fechaInicio = fechaCorta(
    datos.fecha_inicio_incapacidad || inc.fecha_inicio || inc.fechaInicio || datos.fecha_atencion || datos.fecha || emitida
  );
  const fechaFin = fechaCorta(
    datos.fecha_fin_incapacidad || inc.fecha_fin || inc.fechaFin || ''
  );

  const esProrroga = Boolean(datos.prorroga ?? inc.prorroga ?? false);
  const tipoIncapacidad = datos.tipo_incapacidad || inc.tipo || inc.origen || 'Enfermedad general';
  const observacionesInc = datos.observaciones_incapacidad || inc.observaciones || datos.observaciones || 'Sin observaciones adicionales';

  return iniciarPdf({
    titulo: 'Certificado de Incapacidad Médica',
    subject: 'Certificado de incapacidad médica temporal',
    documentoPaciente: datos.afiliado_documento || datos.documento,
    colorEncabezado: AMBAR,
    folio,
    onListo: (doc, ancho) => {
      doc.fillColor(AMBAR).font('Helvetica-Bold').fontSize(17).text(
        'Certificado de Incapacidad Médica',
        56,
        140
      );
      doc.moveDown(0.35);
      doc.fillColor(GRIS).font('Helvetica').fontSize(10.5).text(
        'Soporte clínico de incapacidad laboral o académica emitido en Tecnosalud Católica.',
        { width: ancho - 112, lineGap: 2 }
      );

      const campos = [
        ['Paciente', datos.afiliado_nombre || datos.nombre_paciente || 'Paciente'],
        ['Documento', datos.afiliado_documento || datos.documento || 'N/A'],
        ['Fecha de atención', fechaLarga(datos.fecha_atencion || datos.fecha || emitida)],
        ['Diagnóstico principal', datos.diagnostico_principal || 'No especificado'],
        ['Tipo / Origen', tipoIncapacidad],
        ['Duración', textoDias],
        ['Fecha de inicio', fechaInicio],
        ['Fecha de terminación', fechaFin],
        ['Prórroga', esProrroga ? 'Sí' : 'No'],
        ['Observaciones', observacionesInc],
      ];

      let y = doc.y + 18;
      const xEtiqueta = 56;
      const xValor = 215;
      const anchoValor = ancho - xValor - 56;

      campos.forEach(([etiqueta, valor], i) => {
        const textoValor = String(valor ?? '');
        const altoTexto = doc.heightOfString(textoValor, { width: anchoValor, lineGap: 2 });
        const altoFila = Math.max(24, altoTexto + 10);

        if (y + altoFila > doc.page.height - 150) {
          doc.addPage();
          y = 60;
        }

        if (i % 2 === 0) {
          doc.rect(xEtiqueta - 6, y - 4, ancho - 106, altoFila).fill('#fffbeb');
        }
        doc.fillColor(GRIS).font('Helvetica-Bold').fontSize(10).text(etiqueta, xEtiqueta, y, { width: xValor - xEtiqueta - 10 });
        doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text(textoValor, xValor, y, {
          width: anchoValor,
          lineGap: 2,
        });
        y += altoFila + 4;
      });

      doc.y = y;
      renderizarFirmaMedico(doc, ancho, datos, AMBAR);
      renderizarPieLegal(doc, ancho, emitida, AMBAR);
    },
  });
}

module.exports = {
  generarPdfAtencionDiagnostico,
  generarPdfRecetaMedica,
  generarPdfIncapacidadMedica,
};