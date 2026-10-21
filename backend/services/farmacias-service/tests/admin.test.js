import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { crearRepositorio } from '../src/repositorio.js';

const JWT_SECRET = 'secreto-de-prueba';
const token = (rol) => `Bearer ${jwt.sign({ id: 7, email: 'admin@tecnosalud.co', rol }, JWT_SECRET)}`;

const PEDIDO = {
  id: 3, estadoAnterior: 'PENDIENTE', estado: 'LISTA', usuarioEmail: 'paciente@x.co', total: 7000,
  farmacia: { nombre: 'Farmatodo Parque 93', direccion: 'Calle 93A # 12-73 Local 5', horario: '24 horas' },
};

function crear() {
  const repo = {
    resumenAdmin: vi.fn().mockResolvedValue({ inventario: { unidades: 100 } }),
    listarSolicitudesAdmin: vi.fn().mockResolvedValue([{ id: 3 }]),
    cambiarEstadoSolicitud: vi.fn().mockResolvedValue(PEDIDO),
  };
  const reabastecedor = { estado: vi.fn().mockResolvedValue({ proximo: '2026-10-19' }) };
  const notificar = vi.fn().mockResolvedValue();
  const app = crearApp({ repo, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar, puerto: 3004, reabastecedor });
  return { app, repo, notificar };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('rutas de administración de farmacias', () => {
  it('exigen rol ADMIN', async () => {
    const { app } = crear();
    expect((await request(app).get('/api/farmacias/admin/resumen')).status).toBe(401);
    expect((await request(app).get('/api/farmacias/admin/resumen').set('Authorization', token('PACIENTE'))).status).toBe(403);
  });

  it('el resumen incluye el estado del reabastecimiento', async () => {
    const res = await request(crear().app).get('/api/farmacias/admin/resumen').set('Authorization', token('ADMIN'));
    expect(res.body).toEqual({ inventario: { unidades: 100 }, reabastecimiento: { proximo: '2026-10-19' } });
  });

  it('filtra pedidos por estado válido', async () => {
    const { app, repo } = crear();
    await request(app).get('/api/farmacias/admin/solicitudes?estado=PENDIENTE').set('Authorization', token('ADMIN'));
    await request(app).get('/api/farmacias/admin/solicitudes?estado=BORRADO').set('Authorization', token('ADMIN'));
    expect(repo.listarSolicitudesAdmin.mock.calls).toEqual([[{ estado: 'PENDIENTE' }], [{ estado: undefined }]]);
  });

  it('marca un pedido como listo y avisa al usuario por correo', async () => {
    const { app, repo, notificar } = crear();
    const res = await request(app).patch('/api/farmacias/admin/solicitudes/3/estado').set('Authorization', token('ADMIN')).send({ estado: 'lista' });
    expect(res.body.estado).toBe('LISTA');
    expect(repo.cambiarEstadoSolicitud).toHaveBeenCalledWith(3, 'LISTA');
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ to: 'paciente@x.co', subject: expect.stringContaining('listo para reclamar') }));
  });

  it('rechaza estados que el administrador no puede asignar', async () => {
    const res = await request(crear().app).patch('/api/farmacias/admin/solicitudes/3/estado').set('Authorization', token('ADMIN')).send({ estado: 'CANCELADA' });
    expect(res.status).toBe(400);
  });
});

describe('cambiarEstadoSolicitud (transacción)', () => {
  function crearConexion(estadoActual) {
    return {
      beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
      query: vi.fn(async (sql) => {
        if (sql.includes('FOR UPDATE')) {
          return [[{ id: 3, estado: estadoActual, farmacia_id: 2, usuario_email: 'p@x.co', total: '7000.00', farmacia: 'F', direccion: 'D', horario: 'H' }]];
        }
        if (sql.startsWith('SELECT medicamento_id')) return [[{ medicamento_id: 1, cantidad: 2 }]];
        return [{ affectedRows: 1 }];
      }),
    };
  }
  const repoCon = (conexion) => crearRepositorio({ getConnection: vi.fn().mockResolvedValue(conexion), query: vi.fn() });

  it('al rechazar devuelve las unidades al inventario', async () => {
    const conexion = crearConexion('PENDIENTE');
    const pedido = await repoCon(conexion).cambiarEstadoSolicitud(3, 'RECHAZADA');
    expect(conexion.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE inventario'))[1]).toEqual([2, 2, 1]);
    expect(pedido).toMatchObject({ estado: 'RECHAZADA', estadoAnterior: 'PENDIENTE', usuarioEmail: 'p@x.co', total: 7000 });
    expect(conexion.commit).toHaveBeenCalled();
  });

  it('al marcar como entregado no toca el inventario', async () => {
    const conexion = crearConexion('LISTA');
    await repoCon(conexion).cambiarEstadoSolicitud(3, 'ENTREGADA');
    expect(conexion.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE inventario'))).toBe(false);
  });

  it.each([
    ['PENDIENTE', 'ENTREGADA'],
    ['ENTREGADA', 'RECHAZADA'],
    ['CANCELADA', 'LISTA'],
  ])('no permite pasar de %s a %s', async (actual, nuevo) => {
    const conexion = crearConexion(actual);
    const error = await repoCon(conexion).cambiarEstadoSolicitud(3, nuevo).catch((e) => e);
    expect(error.status).toBe(409);
    expect(conexion.rollback).toHaveBeenCalled();
  });
});
