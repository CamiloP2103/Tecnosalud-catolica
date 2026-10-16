// Cálculo de la agenda: fechas en hora de Bogotá y franjas (horarios libres) de cada médico.
// Son funciones puras, sin base de datos, para poder probarlas con cualquier fecha.

const ZONA_HORARIA = 'America/Bogota';
const DIAS_MAXIMOS_ANTICIPACION = 60;

// Fecha (AAAA-MM-DD) y minutos del día actuales en Bogotá
function ahoraBogota(instante = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instante).map((p) => [p.type, p.value])
  );
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

function aFechaUtc(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function sumarDias(fecha, dias) {
  const d = aFechaUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// 1 = lunes ... 7 = domingo
function diaSemana(fecha) {
  return aFechaUtc(fecha).getUTCDay() || 7;
}

function esFechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return false;
  return aFechaUtc(fecha).toISOString().slice(0, 10) === fecha;
}

const aMinutos = (hora) => {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
};
const aHora = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// Horas de inicio de consulta dentro de los bloques de un médico para un día de la semana
function horasDelDia(bloques, dia, duracion) {
  const horas = [];
  for (const b of bloques.filter((x) => Number(x.dia_semana) === dia)) {
    for (let m = aMinutos(b.hora_inicio); m + duracion <= aMinutos(b.hora_fin); m += duracion) {
      horas.push(aHora(m));
    }
  }
  return horas.sort();
}

/**
 * Franjas libres entre `desde` y `desde + dias - 1`.
 * - medicos: [{ id, duracion_min }]
 * - horarios: [{ medico_id, dia_semana, hora_inicio, hora_fin }]
 * - ocupadas: Set con claves "medicoId|AAAA-MM-DD|HH:MM" de citas PROGRAMADAS
 * - ahora: { fecha, minutos } en Bogotá; se descartan las franjas que ya pasaron
 */
function franjasLibres({ medicos, horarios, ocupadas, desde, dias, ahora }) {
  const libres = [];
  for (let i = 0; i < dias; i += 1) {
    const fecha = sumarDias(desde, i);
    if (fecha < ahora.fecha) continue;
    const dia = diaSemana(fecha);
    for (const medico of medicos) {
      const bloques = horarios.filter((h) => Number(h.medico_id) === Number(medico.id));
      for (const hora of horasDelDia(bloques, dia, Number(medico.duracion_min))) {
        if (fecha === ahora.fecha && aMinutos(hora) <= ahora.minutos) continue;
        if (ocupadas.has(`${medico.id}|${fecha}|${hora}`)) continue;
        libres.push({ fecha, hora, medicoId: medico.id });
      }
    }
  }
  return libres.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora) || a.medicoId - b.medicoId);
}

/** Valida que una fecha y hora pedidas correspondan a una franja real del médico y no estén en el pasado. */
function validarFranja({ medico, horarios, fecha, hora, ahora }) {
  if (!esFechaValida(fecha) || !/^\d{2}:\d{2}$/.test(String(hora))) {
    return 'La fecha (AAAA-MM-DD) o la hora (HH:MM) no son válidas.';
  }
  if (fecha < ahora.fecha || (fecha === ahora.fecha && aMinutos(hora) <= ahora.minutos)) {
    return 'No se pueden reservar citas en el pasado.';
  }
  if (fecha > sumarDias(ahora.fecha, DIAS_MAXIMOS_ANTICIPACION)) {
    return `Las citas se reservan con máximo ${DIAS_MAXIMOS_ANTICIPACION} días de anticipación.`;
  }
  const bloques = horarios.filter((h) => Number(h.medico_id) === Number(medico.id));
  if (!horasDelDia(bloques, diaSemana(fecha), Number(medico.duracion_min)).includes(hora)) {
    return 'El médico no atiende en esa fecha y hora.';
  }
  return null;
}

module.exports = {
  ahoraBogota, sumarDias, diaSemana, esFechaValida, horasDelDia, franjasLibres, validarFranja, aHora, aMinutos,
  DIAS_MAXIMOS_ANTICIPACION,
};
