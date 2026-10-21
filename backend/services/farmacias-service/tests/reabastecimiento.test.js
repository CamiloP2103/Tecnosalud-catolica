import { describe, expect, it, vi } from 'vitest';
import { crearReabastecedor, fechaBogota, proximoLunes, semanaIso } from '../src/reabastecimiento.js';

// Bogotá es UTC-5 todo el año
const LUNES_10AM = new Date('2026-10-19T15:00:00Z');
const VIERNES = new Date('2026-10-16T15:00:00Z');
const DOMINGO_1130PM_BOGOTA = new Date('2026-10-19T04:30:00Z'); // en UTC ya es lunes

function crearConexion({ duplicado = false, filas = 120, unidades = 3400 } = {}) {
  return {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
    query: vi.fn(async (sql) => {
      if (sql.startsWith('INSERT INTO reabastecimientos') && duplicado) {
        throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      }
      if (sql.startsWith('SELECT COUNT(*)')) return [[{ filas, unidades: String(unidades) }]];
      return [{ affectedRows: 1 }];
    }),
  };
}

const crearPool = (conexion) => ({ getConnection: vi.fn().mockResolvedValue(conexion), query: vi.fn() });

describe('fechas en hora de Bogotá', () => {
  it('reconoce el lunes según Bogotá y no según UTC', () => {
    expect(fechaBogota(LUNES_10AM)).toMatchObject({ iso: '2026-10-19', esLunes: true });
    expect(fechaBogota(DOMINGO_1130PM_BOGOTA)).toMatchObject({ iso: '2026-10-18', esLunes: false });
  });

  it('calcula la semana ISO y el próximo lunes', () => {
    expect(semanaIso({ anio: 2026, mes: 10, dia: 19 })).toBe('2026-W43');
    expect(semanaIso({ anio: 2027, mes: 1, dia: 1 })).toBe('2026-W53');
    expect(proximoLunes(VIERNES)).toBe('2026-10-19');
    expect(proximoLunes(LUNES_10AM)).toBe('2026-10-19');
  });
});

describe('reabastecer', () => {
  it('no reabastece si no es lunes y dice cuándo es el próximo', async () => {
    const conexion = crearConexion();
    const reabastecedor = crearReabastecedor({ pool: crearPool(conexion), reloj: () => VIERNES });
    const error = await reabastecedor.reabastecer().catch((e) => e);
    expect(error.codigo).toBe('NO_ES_LUNES');
    expect(error.message).toContain('2026-10-19');
    expect(conexion.query).not.toHaveBeenCalled();
  });

  it('el lunes rellena el inventario hasta el objetivo y lo registra', async () => {
    const conexion = crearConexion();
    const reabastecedor = crearReabastecedor({ pool: crearPool(conexion), objetivo: 60, reloj: () => LUNES_10AM });
    const resultado = await reabastecedor.reabastecer({ origen: 'MANUAL' });

    expect(resultado).toEqual({
      semana: '2026-W43', fecha: '2026-10-19', origen: 'MANUAL', objetivo: 60, filasActualizadas: 120, unidadesAgregadas: 3400,
    });
    const sentencias = conexion.query.mock.calls.map(([sql, p]) => [sql.split(' ').slice(0, 3).join(' '), p]);
    expect(sentencias[0]).toEqual(['INSERT INTO reabastecimientos', ['2026-W43', '2026-10-19', 'MANUAL', 60]]);
    expect(conexion.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE inventario'))[1]).toEqual([60, 60]);
    expect(conexion.commit).toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalled();
  });

  it('solo reabastece una vez por semana', async () => {
    const conexion = crearConexion({ duplicado: true });
    const reabastecedor = crearReabastecedor({ pool: crearPool(conexion), reloj: () => LUNES_10AM });
    const error = await reabastecedor.reabastecer().catch((e) => e);
    expect(error.codigo).toBe('YA_REABASTECIDO');
    expect(conexion.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE inventario'))).toBe(false);
    expect(conexion.rollback).toHaveBeenCalled();
  });
});

describe('programación automática', () => {
  it('reabastece sola al revisar un lunes', async () => {
    const conexion = crearConexion();
    const reabastecedor = crearReabastecedor({ pool: crearPool(conexion), reloj: () => LUNES_10AM });
    const registro = { log: vi.fn(), error: vi.fn() };
    const detener = reabastecedor.iniciarProgramacion({ intervaloMs: 3600000, registro });
    await vi.waitFor(() => expect(registro.log).toHaveBeenCalled());
    detener();
    expect(registro.log.mock.calls[0][0]).toContain('2026-W43');
    expect(conexion.query.mock.calls[0][1][2]).toBe('AUTOMATICO');
  });

  it('no hace nada los demás días', async () => {
    const conexion = crearConexion();
    const pool = crearPool(conexion);
    const reabastecedor = crearReabastecedor({ pool, reloj: () => VIERNES });
    const detener = reabastecedor.iniciarProgramacion({ intervaloMs: 3600000, registro: { log: vi.fn(), error: vi.fn() } });
    await new Promise((r) => setTimeout(r, 20));
    detener();
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});

describe('estado', () => {
  it('informa el último reabastecimiento y el próximo lunes', async () => {
    const pool = { query: vi.fn().mockResolvedValue([[{ semana: '2026-W42', fecha: '2026-10-12', origen: 'AUTOMATICO' }]]) };
    const estado = await crearReabastecedor({ pool, reloj: () => VIERNES }).estado();
    // El viernes 16 es de la misma semana ISO que el lunes 12: ya se hizo esta semana
    expect(estado).toMatchObject({ objetivo: 60, hoyEsLunes: false, hechoEstaSemana: true, proximo: '2026-10-19' });
    expect(estado.ultimo.semana).toBe('2026-W42');
  });

  it('si ya se hizo este lunes, el próximo es el lunes siguiente', async () => {
    const pool = { query: vi.fn().mockResolvedValue([[{ semana: '2026-W43', fecha: '2026-10-19' }]]) };
    const estado = await crearReabastecedor({ pool, reloj: () => LUNES_10AM }).estado();
    expect(estado).toMatchObject({ hoyEsLunes: true, hechoEstaSemana: true, proximo: '2026-10-26' });
  });
});
