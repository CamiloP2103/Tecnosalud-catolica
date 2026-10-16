import { describe, expect, it } from 'vitest';
import { ahoraBogota, diaSemana, franjasLibres, horasDelDia, sumarDias, validarFranja } from '../src/agenda.js';

const MEDICO = { id: 1, duracion_min: 30 };
// Lunes a viernes de 07:00 a 09:00 (4 franjas de 30 min por día)
const HORARIOS = [1, 2, 3, 4, 5].map((dia) => ({ medico_id: 1, dia_semana: dia, hora_inicio: '07:00', hora_fin: '09:00' }));
const LUNES_19 = '2026-10-19';

describe('fechas', () => {
  it('usa la hora de Bogotá', () => {
    expect(ahoraBogota(new Date('2026-10-19T04:30:00Z'))).toEqual({ fecha: '2026-10-18', minutos: 23 * 60 + 30 });
    expect(diaSemana(LUNES_19)).toBe(1);
    expect(diaSemana('2026-10-25')).toBe(7);
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('franjas', () => {
  it('divide los bloques según la duración de la consulta', () => {
    expect(horasDelDia(HORARIOS, 1, 30)).toEqual(['07:00', '07:30', '08:00', '08:30']);
    expect(horasDelDia(HORARIOS, 1, 20)).toEqual(['07:00', '07:20', '07:40', '08:00', '08:20', '08:40']);
    expect(horasDelDia(HORARIOS, 6, 30)).toEqual([]);
  });

  it('descarta las ocupadas, las que ya pasaron y los fines de semana', () => {
    const libres = franjasLibres({
      medicos: [MEDICO],
      horarios: HORARIOS,
      ocupadas: new Set(['1|2026-10-19|08:00']),
      desde: '2026-10-17', // sábado
      dias: 3, // sábado, domingo y lunes
      ahora: { fecha: LUNES_19, minutos: 7 * 60 + 15 }, // lunes 07:15
    });
    expect(libres.map((f) => `${f.fecha} ${f.hora}`)).toEqual(['2026-10-19 07:30', '2026-10-19 08:30']);
  });
});

describe('validarFranja', () => {
  const ahora = { fecha: '2026-10-16', minutos: 10 * 60 };

  it('acepta una franja real del médico', () => {
    expect(validarFranja({ medico: MEDICO, horarios: HORARIOS, fecha: LUNES_19, hora: '07:30', ahora })).toBeNull();
  });

  it.each([
    ['fuera del horario', LUNES_19, '10:00', 'no atiende'],
    ['desalineada con la duración', LUNES_19, '07:15', 'no atiende'],
    ['en domingo', '2026-10-18', '07:00', 'no atiende'],
    ['en el pasado', '2026-10-15', '07:00', 'pasado'],
    ['hoy a una hora que ya pasó', '2026-10-16', '07:00', 'pasado'],
    ['con más de 60 días', '2026-12-21', '07:00', '60 días'],
    ['con fecha imposible', '2026-02-30', '07:00', 'no son válidas'],
  ])('rechaza una cita %s', (_, fecha, hora, mensaje) => {
    expect(validarFranja({ medico: MEDICO, horarios: HORARIOS, fecha, hora, ahora })).toContain(mensaje);
  });
});
