import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { ErrorNegocio } from '../src/repositorio.js';

const JWT_SECRET = 'secreto-de-prueba';
const firmar = (rol) => jwt.sign({ id: 6, email: 'paciente@x.co', doc: '1000000001', rol }, JWT_SECRET, { expiresIn: '1h' });
const PACIENTE = `Bearer ${firmar('PACIENTE')}`;
const ADMIN = `Bearer ${firmar('ADMIN')}`;

// Viernes 16 de octubre de 2026, 10:00 en Bogotá
const RELOJ = () => new Date('2026-10-16T15:00:00Z');

const MEDICO = {
  id: 1, nombre: 'Dr. Alejandro Morales', especialidadId: 1, especialidad: 'Medicina General', duracion_min: 30, sedeId: 1, sede: 'Sede Principal - Chapinero',
};
const HORARIOS = [1, 2, 3, 4, 5].map((dia) => ({ medico_id: 1, dia_semana: dia, hora_inicio: '07:00', hora_fin: '09:00' }));
const CITA = { id: 9, fecha: '2026-10-19', hora: '07:30', estado: 'PROGRAMADA', medico: MEDICO.nombre, especialidad: 'Medicina General', sede: MEDICO.sede };

function crear() {
  const repo = {
    listarEspecialidades: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Medicina General', medicos: 1 }]),
    listarSedes: vi.fn().mockResolvedValue([]),
    listarMedicos: vi.fn(async ({ medicoId } = {}) => (medicoId && medicoId !== 1 ? [] : [MEDICO])),
    horarios: vi.fn().mockResolvedValue(HORARIOS),
    ocupadas: vi.fn().mockResolvedValue(new Set(['1|2026-10-19|07:00'])),
    crearCita: vi.fn().mockResolvedValue(CITA),
    listarCitasUsuario: vi.fn().mockResolvedValue([CITA]),
    cancelarCita: vi.fn().mockResolvedValue({ ...CITA, estado: 'CANCELADA' }),
    listarCitasAdmin: vi.fn().mockResolvedValue([CITA]),
    cambiarEstado: vi.fn().mockResolvedValue({ ...CITA, estado: 'ATENDIDA' }),
    conteosPorEstado: vi.fn().mockResolvedValue({ PROGRAMADA: 1 }),
  };
  const notificar = vi.fn().mockResolvedValue();
  const app = crearApp({ repo, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar, puerto: 3007, reloj: RELOJ });
  return { app, repo, notificar };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('disponibilidad (pública)', () => {
  it('devuelve las franjas libres sin las ocupadas ni el fin de semana', async () => {
    const res = await request(crear().app).get('/api/citas/disponibilidad?especialidadId=1&dias=4');
    expect(res.status).toBe(200);
    // Viernes 16 (desde las 10:00 ya no hay franjas), sábado, domingo y lunes 19 sin las 07:00
    expect(res.body.franjas.map((f) => `${f.fecha} ${f.hora}`)).toEqual(['2026-10-19 07:30', '2026-10-19 08:00', '2026-10-19 08:30']);
    expect(res.body.franjas[0]).toMatchObject({ medico: { id: 1 }, especialidad: 'Medicina General', sede: { nombre: MEDICO.sede } });
  });
});

describe('reservar citas', () => {
  it('exige sesión', async () => {
    expect((await request(crear().app).post('/api/citas/citas').send({})).status).toBe(401);
  });

  it('reserva una franja válida y envía la confirmación', async () => {
    const { app, repo, notificar } = crear();
    const res = await request(app).post('/api/citas/citas').set('Authorization', PACIENTE)
      .send({ medicoId: 1, fecha: '2026-10-19', hora: '07:30', motivo: ' Control ' });
    expect(res.status).toBe(201);
    expect(repo.crearCita).toHaveBeenCalledWith(expect.objectContaining({
      usuario: expect.objectContaining({ id: 6, doc: '1000000001' }), medicoId: 1, fecha: '2026-10-19', hora: '07:30', motivo: 'Control', hoy: '2026-10-16',
    }));
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ to: 'paciente@x.co', subject: expect.stringContaining('Cita programada') }));
  });

  it('rechaza horarios en los que el médico no atiende', async () => {
    const { app, repo } = crear();
    const res = await request(app).post('/api/citas/citas').set('Authorization', PACIENTE).send({ medicoId: 1, fecha: '2026-10-19', hora: '11:00' });
    expect(res.status).toBe(400);
    expect(repo.crearCita).not.toHaveBeenCalled();
  });

  it('responde 404 si el médico no existe', async () => {
    const res = await request(crear().app).post('/api/citas/citas').set('Authorization', PACIENTE).send({ medicoId: 77, fecha: '2026-10-19', hora: '07:30' });
    expect(res.status).toBe(404);
  });

  it('informa cuando otra persona ganó el horario', async () => {
    const { app, repo, notificar } = crear();
    repo.crearCita.mockRejectedValue(new ErrorNegocio(409, 'Ese horario acaba de ser reservado por otra persona. Elige otro.'));
    const res = await request(app).post('/api/citas/citas').set('Authorization', PACIENTE).send({ medicoId: 1, fecha: '2026-10-19', hora: '07:30' });
    expect(res.status).toBe(409);
    expect(notificar).not.toHaveBeenCalled();
  });

  it('lista y cancela las citas propias', async () => {
    const { app, repo } = crear();
    expect((await request(app).get('/api/citas/citas').set('Authorization', PACIENTE)).body.total).toBe(1);
    const res = await request(app).patch('/api/citas/citas/9/cancelar').set('Authorization', PACIENTE);
    expect(res.body.estado).toBe('CANCELADA');
    expect(repo.cancelarCita).toHaveBeenCalledWith(9, 6, { fecha: '2026-10-16', minutos: 600 });
  });

  it('responde 503 si MySQL no está disponible', async () => {
    const { app, repo } = crear();
    repo.listarMedicos.mockRejectedValue(Object.assign(new Error('caída'), { code: 'ECONNREFUSED' }));
    expect((await request(app).get('/api/citas/disponibilidad')).status).toBe(503);
  });
});

describe('administración', () => {
  it('no deja entrar a un paciente', async () => {
    const res = await request(crear().app).get('/api/citas/admin/resumen').set('Authorization', PACIENTE);
    expect(res.status).toBe(403);
  });

  it('entrega el resumen de la semana con ocupación y próxima franja por especialidad', async () => {
    const res = await request(crear().app).get('/api/citas/admin/resumen').set('Authorization', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ hoy: '2026-10-16', medicos: 1, semana: { desde: '2026-10-16', hasta: '2026-10-22' } });
    expect(res.body.ocupacion.reservadas).toBe(1);
    expect(res.body.ocupacion.libres).toBeGreaterThan(0);
    expect(res.body.porEspecialidad[0]).toMatchObject({ nombre: 'Medicina General', proximaDisponible: { fecha: '2026-10-19', hora: '07:30' } });
    expect(res.body.citasHoy).toHaveLength(1);
  });

  it('cambia el estado de una cita y valida el estado pedido', async () => {
    const { app, repo } = crear();
    const ok = await request(app).patch('/api/citas/admin/citas/9/estado').set('Authorization', ADMIN).send({ estado: 'atendida' });
    expect(ok.body.estado).toBe('ATENDIDA');
    expect(repo.cambiarEstado).toHaveBeenCalledWith(9, 'ATENDIDA');
    expect((await request(app).patch('/api/citas/admin/citas/9/estado').set('Authorization', ADMIN).send({ estado: 'BORRADA' })).status).toBe(400);
  });
});
