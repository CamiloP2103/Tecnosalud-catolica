const MAX_ITEMS = 10;
const MAX_UNIDADES_POR_ITEM = 10;
const MAX_OBSERVACIONES = 300;
const VIGENCIA_FORMULA_DIAS = 30;

// Fecha de hoy en Bogotá (como fecha local a medianoche), sin depender de la zona horaria del servidor
function hoyBogota(instante = new Date()) {
  const [anio, mes, dia] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(instante).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const enteroPositivo = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Valida la forma del cuerpo de una solicitud (sin consultar la base de datos).
 * Devuelve { errores, datos }. Las reglas que dependen del catálogo (fórmula, control especial,
 * existencias) se validan después con validarReglasMedicamentos y en el repositorio.
 */
function validarSolicitud(body = {}) {
  const errores = {};

  const farmaciaId = enteroPositivo(body.farmaciaId);
  if (!farmaciaId) errores.farmaciaId = 'Debes elegir una farmacia válida';

  const items = [];
  if (!Array.isArray(body.items) || body.items.length === 0) {
    errores.items = 'Debes solicitar al menos un medicamento';
  } else if (body.items.length > MAX_ITEMS) {
    errores.items = `Puedes solicitar máximo ${MAX_ITEMS} medicamentos diferentes por solicitud`;
  } else {
    const vistos = new Set();
    for (const item of body.items) {
      const medicamentoId = enteroPositivo(item && item.medicamentoId);
      const cantidad = enteroPositivo(item && item.cantidad);
      if (!medicamentoId || !cantidad) {
        errores.items = 'Cada medicamento debe tener un id y una cantidad mayor que 0';
        break;
      }
      if (cantidad > MAX_UNIDADES_POR_ITEM) {
        errores.items = `La cantidad máxima por medicamento es ${MAX_UNIDADES_POR_ITEM}`;
        break;
      }
      if (vistos.has(medicamentoId)) {
        errores.items = 'No repitas el mismo medicamento; ajusta la cantidad';
        break;
      }
      vistos.add(medicamentoId);
      items.push({ medicamentoId, cantidad });
    }
  }

  const observaciones = texto(body.observaciones);
  if (observaciones.length > MAX_OBSERVACIONES) {
    errores.observaciones = `Las observaciones pueden tener máximo ${MAX_OBSERVACIONES} caracteres`;
  }

  return {
    errores,
    datos: {
      farmaciaId,
      items,
      observaciones: observaciones || null,
      formula: body.formula && typeof body.formula === 'object' ? body.formula : null,
    },
  };
}

/** Valida los datos de la fórmula médica. Devuelve { errores, formula }. */
function validarFormula(formula, hoy = hoyBogota()) {
  const errores = {};
  const numero = texto(formula && formula.numero);
  const medico = texto(formula && formula.medico);
  const registroMedico = texto(formula && formula.registroMedico);
  const fechaTexto = texto(formula && formula.fecha);

  if (!numero) errores.numero = 'El número de la fórmula es obligatorio';
  if (!medico) errores.medico = 'El nombre del médico que formula es obligatorio';
  if (!/^[A-Za-z0-9-]{3,20}$/.test(registroMedico)) {
    errores.registroMedico = 'El registro médico debe tener entre 3 y 20 letras, números o guiones';
  }

  let fecha = null;
  const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaTexto);
  if (coincide) {
    const [anio, mes, dia] = coincide.slice(1).map(Number);
    const candidata = new Date(anio, mes - 1, dia);
    if (candidata.getFullYear() === anio && candidata.getMonth() === mes - 1 && candidata.getDate() === dia) {
      fecha = candidata;
    }
  }
  if (!fecha) {
    errores.fecha = 'La fecha de la fórmula debe tener el formato AAAA-MM-DD';
  } else {
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const dias = Math.round((inicioHoy - fecha) / 86400000);
    if (dias < 0) errores.fecha = 'La fecha de la fórmula no puede ser futura';
    else if (dias > VIGENCIA_FORMULA_DIAS) {
      errores.fecha = `La fórmula venció: tiene más de ${VIGENCIA_FORMULA_DIAS} días`;
    }
  }

  return { errores, formula: { numero, medico, registroMedico, fecha: fechaTexto } };
}

/**
 * Aplica las reglas que dependen del catálogo: medicamentos existentes y activos, control especial
 * y fórmula médica. `medicamentos` son las filas de la base de datos para los ids pedidos.
 * Devuelve { status, error, detalle } si algo falla, o { formula } (null si no hace falta).
 */
function validarReglasMedicamentos(items, medicamentos, formulaRecibida, hoy = hoyBogota()) {
  const porId = new Map(medicamentos.map((m) => [m.id, m]));

  const inexistentes = items.filter((i) => !porId.has(i.medicamentoId) || !porId.get(i.medicamentoId).activo);
  if (inexistentes.length > 0) {
    return {
      status: 404,
      error: 'Algunos medicamentos no existen en el catálogo',
      detalle: inexistentes.map((i) => ({ medicamentoId: i.medicamentoId })),
    };
  }

  const controlados = items.map((i) => porId.get(i.medicamentoId)).filter((m) => m.control_especial);
  if (controlados.length > 0) {
    return {
      status: 422,
      error:
        'Los medicamentos de control especial no se pueden solicitar en línea. ' +
        'Debes presentar la fórmula oficial en original directamente en la farmacia.',
      detalle: controlados.map((m) => ({ medicamentoId: m.id, nombre: m.nombre })),
    };
  }

  const conFormula = items.map((i) => porId.get(i.medicamentoId)).filter((m) => m.requiere_formula);
  if (conFormula.length === 0) return { formula: null };

  if (!formulaRecibida) {
    return {
      status: 422,
      error: 'Algunos medicamentos requieren fórmula médica. Ingresa los datos de tu fórmula.',
      detalle: conFormula.map((m) => ({ medicamentoId: m.id, nombre: m.nombre })),
    };
  }

  const { errores, formula } = validarFormula(formulaRecibida, hoy);
  if (Object.keys(errores).length > 0) {
    return { status: 400, error: 'Los datos de la fórmula médica no son válidos', errores: { formula: errores } };
  }
  return { formula };
}

module.exports = {
  hoyBogota,
  validarSolicitud,
  validarFormula,
  validarReglasMedicamentos,
  MAX_ITEMS,
  MAX_UNIDADES_POR_ITEM,
  VIGENCIA_FORMULA_DIAS,
};
