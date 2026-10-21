import { describe, expect, it, vi } from 'vitest';
import { crearRepositorio, ErrorNegocio } from '../src/repositorio.js';

const farmacia = {
  id: 1, codigo: 'FAR-01', nombre: 'Farmatodo Parque 93', cadena: 'Farmatodo', direccion: 'Calle 93A # 12-73 Local 5',
  localidad: 'Chapinero', municipio: 'Bogotá D.C.', horario: '24 horas', abierta_24h: 1,
};

// Conexión simulada de mysql2: responde según la consulta y registra todo lo ejecutado
function crearConexion({ existencias, solicitud, items = [] }) {
  const conexion = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
    query: vi.fn(async (sql) => {
      if (sql.startsWith('SELECT * FROM farmacias')) return [[farmacia]];
      if (sql.includes('LEFT JOIN inventario')) return [existencias];
      if (sql.startsWith('INSERT INTO solicitudes')) return [{ insertId: 42 }];
      if (sql.startsWith('SELECT id, estado')) return [solicitud ? [solicitud] : []];
      if (sql.startsWith('SELECT medicamento_id, cantidad')) return [items];
      return [{ affectedRows: 1 }];
    }),
  };
  return conexion;
}

const crearPool = (conexion) => ({ getConnection: vi.fn().mockResolvedValue(conexion), query: vi.fn() });
const consultas = (conexion, inicio) => conexion.query.mock.calls.filter(([sql]) => sql.startsWith(inicio));

describe('crearSolicitud', () => {
  const pedido = {
    usuario: { id: 5, email: 'ana@x.co' },
    farmaciaId: 1,
    items: [{ medicamentoId: 1, cantidad: 2 }, { medicamentoId: 18, cantidad: 1 }],
    formula: { numero: 'F-1', medico: 'Dr. Pérez', registroMedico: 'RM-1', fecha: '2026-10-10' },
    observaciones: null,
  };

  it('bloquea el inventario, descuenta existencias, guarda la solicitud y confirma la transacción', async () => {
    const conexion = crearConexion({
      existencias: [
        { id: 1, nombre: 'Acetaminofén', concentracion: '500 mg', presentacion: 'Caja x 20', cantidad: 10, precio: '3500.00' },
        { id: 18, nombre: 'Amoxicilina', concentracion: '500 mg', presentacion: 'Caja x 50', cantidad: 3, precio: '12000.00' },
      ],
    });
    const solicitud = await crearRepositorio(crearPool(conexion)).crearSolicitud(pedido);

    expect(conexion.query.mock.calls.find(([sql]) => sql.includes('LEFT JOIN inventario'))[0]).toContain('FOR UPDATE');
    expect(consultas(conexion, 'UPDATE inventario').map(([, p]) => p)).toEqual([[2, 1, 1], [1, 1, 18]]);
    expect(consultas(conexion, 'INSERT INTO solicitudes')[0][1]).toEqual([5, 'ana@x.co', 1, 'F-1', 'Dr. Pérez', 'RM-1', '2026-10-10', null, 19000]);
    expect(consultas(conexion, 'INSERT INTO solicitud_items')[0][1]).toEqual([[[42, 1, 2, 3500], [42, 18, 1, 12000]]]);
    expect(conexion.commit).toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalled();
    expect(solicitud).toMatchObject({ id: 42, estado: 'PENDIENTE', total: 19000, requiereFormula: true });
    expect(solicitud.farmacia).toMatchObject({ nombre: 'Farmatodo Parque 93', abierta24h: true });
  });

  it('si falta existencia no descuenta nada, revierte y explica qué falta', async () => {
    const conexion = crearConexion({
      existencias: [
        { id: 1, nombre: 'Acetaminofén', cantidad: 10, precio: '3500.00' },
        { id: 18, nombre: 'Amoxicilina', cantidad: null, precio: null }, // no se maneja en esta farmacia
      ],
    });
    const error = await crearRepositorio(crearPool(conexion)).crearSolicitud(pedido).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorNegocio);
    expect(error.status).toBe(409);
    expect(error.detalle).toEqual([{ medicamentoId: 18, nombre: 'Amoxicilina', solicitada: 1, disponible: 0 }]);
    expect(consultas(conexion, 'UPDATE inventario')).toHaveLength(0);
    expect(consultas(conexion, 'INSERT')).toHaveLength(0);
    expect(conexion.rollback).toHaveBeenCalled();
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalled();
  });
});

describe('cancelarSolicitud', () => {
  it('devuelve las unidades al inventario y marca la solicitud como cancelada', async () => {
    const conexion = crearConexion({
      existencias: [],
      solicitud: { id: 42, estado: 'PENDIENTE', farmacia_id: 3 },
      items: [{ medicamento_id: 1, cantidad: 2 }],
    });
    const resultado = await crearRepositorio(crearPool(conexion)).cancelarSolicitud(42, 5);

    expect(consultas(conexion, 'SELECT id, estado')[0][1]).toEqual([42, 5]); // solo solicitudes del usuario
    expect(consultas(conexion, 'UPDATE inventario SET cantidad = cantidad +')[0][1]).toEqual([2, 3, 1]);
    expect(consultas(conexion, "UPDATE solicitudes SET estado = 'CANCELADA'")).toHaveLength(1);
    expect(resultado).toEqual({ id: 42, estado: 'CANCELADA' });
  });

  it('no cancela solicitudes que ya no están pendientes', async () => {
    const conexion = crearConexion({ existencias: [], solicitud: { id: 42, estado: 'ENTREGADA', farmacia_id: 3 } });
    const error = await crearRepositorio(crearPool(conexion)).cancelarSolicitud(42, 5).catch((e) => e);
    expect(error.status).toBe(409);
    expect(conexion.rollback).toHaveBeenCalled();
  });

  it('responde 404 si la solicitud no es del usuario', async () => {
    const conexion = crearConexion({ existencias: [], solicitud: null });
    const error = await crearRepositorio(crearPool(conexion)).cancelarSolicitud(42, 99).catch((e) => e);
    expect(error.status).toBe(404);
  });
});

describe('consultas de catálogo', () => {
  it('normaliza DECIMAL y BOOLEAN de MySQL y escapa los comodines de búsqueda', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue([[{
        id: 1, codigo: 'MED-001', nombre: 'Acetaminofén', concentracion: '500 mg', forma_farmaceutica: 'Tableta',
        presentacion: 'Caja x 20 tabletas', categoria: 'Analgésicos y antiinflamatorios', requiere_formula: 0,
        control_especial: 0, precio_referencia: '3500.00', descripcion: 'Dolor', unidades_disponibles: '120',
        farmacias_con_existencias: 6,
      }]]),
    };
    const [medicamento] = await crearRepositorio(pool).listarMedicamentos({ buscar: '50%_' });

    expect(medicamento).toMatchObject({ requiereFormula: false, precioReferencia: 3500, unidadesDisponibles: 120 });
    expect(pool.query.mock.calls[0][1]).toEqual(['%50\\%\\_%', '%50\\%\\_%']);
  });
});
