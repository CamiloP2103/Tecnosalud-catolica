import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { ErrorNegocio } from '../src/repositorio.js';

const JWT_SECRET = 'secreto-de-prueba';
const token = jwt.sign({ id: 1, email: 'carlos@tecnosalud.com.co', rol: 'PACIENTE' }, JWT_SECRET, { expiresIn: '1h' });
const conSesion = (peticion) => peticion.set('Authorization', `Bearer ${token}`);

const hoy = () => new Date().toISOString().slice(0, 10);
const formulaValida = () => ({ numero: 'F-1234', medico: 'Dra. Laura Rojas', registroMedico: 'RM-56789', fecha: hoy() });

const CATALOGO = {
  1: { id: 1, nombre: 'Acetaminofén', requiere_formula: false, control_especial: false, activo: true },
  18: { id: 18, nombre: 'Amoxicilina', requiere_formula: true, control_especial: false, activo: true },
  80: { id: 80, nombre: 'Clonazepam', requiere_formula: true, control_especial: true, activo: true },
};

const solicitudCreada = {
  id: 7,
  estado: 'PENDIENTE',
  farmacia: { id: 1, nombre: 'Farmatodo Parque 93', direccion: 'Calle 93A # 12-73 Local 5', municipio: 'Bogotá D.C.', horario: '24 horas' },
  items: [{ medicamentoId: 1, nombre: 'Acetaminofén', concentracion: '500 mg', presentacion: 'Caja x 20 tabletas', cantidad: 2, precioUnitario: 3500, subtotal: 7000 }],
  total: 7000,
  requiereFormula: false,
};

function crearRepoFalso() {
  return {
    listarMedicamentos: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Acetaminofén', requiereFormula: false }]),
    listarCategorias: vi.fn().mockResolvedValue([{ categoria: 'Antibióticos', total: 12 }]),
    obtenerMedicamento: vi.fn().mockResolvedValue(null),
    obtenerMedicamentosPorIds: vi.fn(async (ids) => ids.map((id) => CATALOGO[id]).filter(Boolean)),
    listarFarmacias: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Farmatodo Parque 93' }]),
    obtenerFarmacia: vi.fn(async (id) => (id === 1 ? { id: 1, nombre: 'Farmatodo Parque 93' } : null)),
    inventarioFarmacia: vi.fn().mockResolvedValue([]),
    crearSolicitud: vi.fn().mockResolvedValue(solicitudCreada),
    listarSolicitudesUsuario: vi.fn().mockResolvedValue([]),
    cancelarSolicitud: vi.fn().mockResolvedValue({ id: 7, estado: 'CANCELADA' }),
  };
}

function crear() {
  const repo = crearRepoFalso();
  const notificar = vi.fn().mockResolvedValue();
  const app = crearApp({ repo, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar, puerto: 3004 });
  return { app, repo, notificar };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('catálogo y farmacias (público)', () => {
  it('responde el health check', async () => {
    const res = await request(crear().app).get('/api/farmacias/health');
    expect(res.body).toMatchObject({ servicio: 'farmacias-service', estado: 'activo' });
  });

  it('lista medicamentos y pasa los filtros al repositorio', async () => {
    const { app, repo } = crear();
    const res = await request(app).get('/api/farmacias/medicamentos?buscar=%20amoxi%20&categoria=Antibióticos&requiereFormula=true');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(repo.listarMedicamentos).toHaveBeenCalledWith({ buscar: 'amoxi', categoria: 'Antibióticos', requiereFormula: true });
  });

  it('lista las categorías', async () => {
    const res = await request(crear().app).get('/api/farmacias/medicamentos/categorias');
    expect(res.body.categorias[0].categoria).toBe('Antibióticos');
  });

  it('responde 404 para un medicamento inexistente o un id inválido', async () => {
    const { app } = crear();
    expect((await request(app).get('/api/farmacias/medicamentos/999')).status).toBe(404);
    expect((await request(app).get('/api/farmacias/medicamentos/abc')).status).toBe(404);
  });

  it('lista farmacias y el inventario de una farmacia', async () => {
    const { app, repo } = crear();
    expect((await request(app).get('/api/farmacias/sedes')).body.total).toBe(1);
    const res = await request(app).get('/api/farmacias/sedes/1/inventario?disponibles=true');
    expect(res.status).toBe(200);
    expect(repo.inventarioFarmacia).toHaveBeenCalledWith(1, { buscar: '', categoria: '', soloDisponibles: true });
    expect((await request(app).get('/api/farmacias/sedes/99/inventario')).status).toBe(404);
  });

  it('responde 503 con la causa si la base de datos no está disponible', async () => {
    const { app, repo } = crear();
    repo.listarFarmacias.mockRejectedValue(Object.assign(new Error('caída'), { code: 'ECONNREFUSED' }));
    const res = await request(app).get('/api/farmacias/sedes');
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('MySQL no está corriendo');
  });
});

describe('POST /api/farmacias/solicitudes', () => {
  const pedido = (extra = {}) => ({ farmaciaId: 1, items: [{ medicamentoId: 1, cantidad: 2 }], ...extra });

  it('exige sesión', async () => {
    const res = await request(crear().app).post('/api/farmacias/solicitudes').send(pedido());
    expect(res.status).toBe(401);
  });

  it('rechaza un token inválido', async () => {
    const res = await request(crear().app)
      .post('/api/farmacias/solicitudes')
      .set('Authorization', `Bearer ${jwt.sign({ id: 1, email: 'x@y.co' }, 'otro-secreto')}`)
      .send(pedido());
    expect(res.status).toBe(401);
  });

  it('valida el cuerpo antes de consultar la base de datos', async () => {
    const { app, repo } = crear();
    const res = await conSesion(request(app).post('/api/farmacias/solicitudes')).send({ items: [] });
    expect(res.status).toBe(400);
    expect(res.body.errores).toHaveProperty('farmaciaId');
    expect(res.body.errores).toHaveProperty('items');
    expect(repo.obtenerMedicamentosPorIds).not.toHaveBeenCalled();
  });

  it('crea una solicitud de venta libre sin fórmula y envía la confirmación', async () => {
    const { app, repo, notificar } = crear();
    const res = await conSesion(request(app).post('/api/farmacias/solicitudes')).send(pedido());
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(7);
    expect(repo.crearSolicitud).toHaveBeenCalledWith(expect.objectContaining({
      usuario: { id: 1, email: 'carlos@tecnosalud.com.co', rol: 'PACIENTE' },
      farmaciaId: 1,
      formula: null,
    }));
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ to: 'carlos@tecnosalud.com.co', subject: expect.stringContaining('#7') }));
  });

  it('exige fórmula para medicamentos que la requieren', async () => {
    const { app, repo } = crear();
    const res = await conSesion(request(app).post('/api/farmacias/solicitudes'))
      .send(pedido({ items: [{ medicamentoId: 18, cantidad: 1 }] }));
    expect(res.status).toBe(422);
    expect(res.body.detalle).toEqual([{ medicamentoId: 18, nombre: 'Amoxicilina' }]);
    expect(repo.crearSolicitud).not.toHaveBeenCalled();
  });

  it('acepta la solicitud con una fórmula válida', async () => {
    const { app, repo } = crear();
    const res = await conSesion(request(app).post('/api/farmacias/solicitudes'))
      .send(pedido({ items: [{ medicamentoId: 18, cantidad: 1 }], formula: formulaValida() }));
    expect(res.status).toBe(201);
    expect(repo.crearSolicitud.mock.calls[0][0].formula).toMatchObject({ numero: 'F-1234', registroMedico: 'RM-56789' });
  });

  it('rechaza una fórmula vencida', async () => {
    const vieja = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
    const res = await conSesion(request(crear().app).post('/api/farmacias/solicitudes'))
      .send(pedido({ items: [{ medicamentoId: 18, cantidad: 1 }], formula: { ...formulaValida(), fecha: vieja } }));
    expect(res.status).toBe(400);
    expect(res.body.errores.formula.fecha).toContain('venció');
  });

  it('no permite solicitar en línea medicamentos de control especial', async () => {
    const res = await conSesion(request(crear().app).post('/api/farmacias/solicitudes'))
      .send(pedido({ items: [{ medicamentoId: 80, cantidad: 1 }], formula: formulaValida() }));
    expect(res.status).toBe(422);
    expect(res.body.error).toContain('control especial');
  });

  it('responde 404 si un medicamento no existe', async () => {
    const res = await conSesion(request(crear().app).post('/api/farmacias/solicitudes'))
      .send(pedido({ items: [{ medicamentoId: 555, cantidad: 1 }] }));
    expect(res.status).toBe(404);
  });

  it('devuelve el detalle cuando no hay existencias suficientes', async () => {
    const { app, repo, notificar } = crear();
    const faltantes = [{ medicamentoId: 1, nombre: 'Acetaminofén', solicitada: 2, disponible: 0 }];
    repo.crearSolicitud.mockRejectedValue(new ErrorNegocio(409, 'No hay existencias suficientes en esta farmacia.', faltantes));
    const res = await conSesion(request(app).post('/api/farmacias/solicitudes')).send(pedido());
    expect(res.status).toBe(409);
    expect(res.body.detalle).toEqual(faltantes);
    expect(notificar).not.toHaveBeenCalled();
  });

  it('responde 400 claro ante un JSON mal formado', async () => {
    const res = await conSesion(request(crear().app).post('/api/farmacias/solicitudes'))
      .set('Content-Type', 'application/json')
      .send('{"farmaciaId": 1,');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('JSON');
  });
});

describe('solicitudes del usuario', () => {
  it('lista solo las solicitudes del usuario de la sesión', async () => {
    const { app, repo } = crear();
    const res = await conSesion(request(app).get('/api/farmacias/solicitudes'));
    expect(res.status).toBe(200);
    expect(repo.listarSolicitudesUsuario).toHaveBeenCalledWith(1);
  });

  it('cancela una solicitud propia', async () => {
    const { app, repo } = crear();
    const res = await conSesion(request(app).patch('/api/farmacias/solicitudes/7/cancelar'));
    expect(res.status).toBe(200);
    expect(repo.cancelarSolicitud).toHaveBeenCalledWith(7, 1);
  });
});
