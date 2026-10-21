import { describe, expect, it } from 'vitest';
import { validarFormula, validarSolicitud } from '../src/validators.js';

const HOY = new Date(2026, 9, 16); // 16 de octubre de 2026
const formula = (fecha) => ({ numero: 'F-1', medico: 'Dra. Rojas', registroMedico: 'RM-123', fecha });

describe('validarSolicitud', () => {
  it('acepta y normaliza una solicitud válida', () => {
    const { errores, datos } = validarSolicitud({
      farmaciaId: '2',
      items: [{ medicamentoId: '1', cantidad: '3' }],
      observaciones: '  Reclama mi hija  ',
    });
    expect(errores).toEqual({});
    expect(datos).toMatchObject({ farmaciaId: 2, items: [{ medicamentoId: 1, cantidad: 3 }], observaciones: 'Reclama mi hija' });
  });

  it.each([
    ['sin medicamentos', { farmaciaId: 1, items: [] }],
    ['cantidad 0', { farmaciaId: 1, items: [{ medicamentoId: 1, cantidad: 0 }] }],
    ['cantidad mayor al máximo', { farmaciaId: 1, items: [{ medicamentoId: 1, cantidad: 11 }] }],
    ['medicamento repetido', { farmaciaId: 1, items: [{ medicamentoId: 1, cantidad: 1 }, { medicamentoId: 1, cantidad: 2 }] }],
    ['más de 10 medicamentos', { farmaciaId: 1, items: Array.from({ length: 11 }, (_, i) => ({ medicamentoId: i + 1, cantidad: 1 })) }],
  ])('rechaza %s', (_, body) => {
    expect(validarSolicitud(body).errores.items).toBeDefined();
  });

  it('limita el largo de las observaciones', () => {
    expect(validarSolicitud({ farmaciaId: 1, items: [{ medicamentoId: 1, cantidad: 1 }], observaciones: 'x'.repeat(301) }).errores.observaciones).toBeDefined();
  });
});

describe('validarFormula', () => {
  it('acepta una fórmula de hoy y una de hace 30 días', () => {
    expect(validarFormula(formula('2026-10-16'), HOY).errores).toEqual({});
    expect(validarFormula(formula('2026-09-16'), HOY).errores).toEqual({});
  });

  it('rechaza fórmulas vencidas, futuras o con fechas imposibles', () => {
    expect(validarFormula(formula('2026-09-15'), HOY).errores.fecha).toContain('venció');
    expect(validarFormula(formula('2026-10-17'), HOY).errores.fecha).toContain('futura');
    expect(validarFormula(formula('2026-02-30'), HOY).errores.fecha).toContain('formato');
  });

  it('exige número, médico y un registro médico válido', () => {
    const { errores } = validarFormula({ fecha: '2026-10-16', registroMedico: '<script>' }, HOY);
    expect(Object.keys(errores).sort()).toEqual(['medico', 'numero', 'registroMedico']);
  });
});

describe('hoyBogota', () => {
  it('usa la fecha de Bogotá aunque en UTC ya sea el día siguiente', async () => {
    const { hoyBogota } = await import('../src/validators.js');
    const fecha = hoyBogota(new Date('2026-10-17T03:00:00Z')); // 16 de octubre, 10 p. m. en Bogotá
    expect([fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]).toEqual([2026, 10, 16]);
  });
});
