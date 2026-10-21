import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { validarRegistro } from '../src/validators.js';

const formularioValido = {
  nombres: 'Ana',
  apellidos: 'Pérez',
  tipoDocumento: 'CC',
  documento: '1020304050',
  nacimientoDia: '15',
  nacimientoMes: '06',
  nacimientoAnio: '1990',
  genero: 'F',
  correo: 'Ana.Perez@Correo.com',
  telefono: '3001234567',
  direccion: 'Calle 1 # 2-3',
  ciudad: 'Bogotá',
  tipoAfiliacion: 'paciente',
  eps: 'Tecnosalud',
  regimen: 'contributivo',
  contactoEmergenciaNombre: 'Luis Pérez',
  contactoEmergenciaTelefono: '3007654321',
  aceptaTratamientoDatos: true,
};

function crear(execute = vi.fn().mockResolvedValue([{ insertId: 7 }])) {
  const notificar = vi.fn().mockResolvedValue();
  const app = crearApp({ pool: { execute }, frontendUrl: 'http://localhost:5173', notificar, puerto: 3003 });
  return { app, execute, notificar };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('validarRegistro', () => {
  it('acepta un formulario válido y normaliza los datos', () => {
    const { errores, datos } = validarRegistro(formularioValido);
    expect(errores).toEqual({});
    expect(datos.correo).toBe('ana.perez@correo.com');
    expect(datos.fechaNacimiento).toBe('1990-06-15');
  });

  it('rechaza fechas imposibles o futuras', () => {
    const imposible = validarRegistro({ ...formularioValido, nacimientoDia: '31', nacimientoMes: '02' });
    expect(imposible.errores.fechaNacimiento).toBeDefined();
    const futuro = validarRegistro({ ...formularioValido, nacimientoAnio: String(new Date().getFullYear() + 1) });
    expect(futuro.errores.fechaNacimiento).toBeDefined();
  });

  it('exige autorización explícita de tratamiento de datos', () => {
    const { errores } = validarRegistro({ ...formularioValido, aceptaTratamientoDatos: 'true' });
    expect(errores.aceptaTratamientoDatos).toBeDefined();
  });
});

describe('POST /api/registro', () => {
  it('rechaza un formulario vacío sin tocar la base de datos', async () => {
    const { app, execute } = crear();
    const res = await request(app).post('/api/registro').send({});
    expect(res.status).toBe(400);
    expect(res.body.errores).toHaveProperty('nombres');
    expect(execute).not.toHaveBeenCalled();
  });

  it('guarda un afiliado válido y envía la confirmación', async () => {
    const { app, notificar } = crear();
    const res = await request(app).post('/api/registro').send(formularioValido);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 7, email: 'ana.perez@correo.com', nombre: 'Ana Pérez', estado: 'PENDIENTE' });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana.perez@correo.com' }));
  });

  it('escapa el nombre en el correo de confirmación', async () => {
    const { app, notificar } = crear();
    await request(app).post('/api/registro').send({ ...formularioValido, nombres: '<b>Ana</b>' });
    expect(notificar.mock.calls[0][0].html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
  });

  it('responde 503 con la causa si MySQL no está corriendo', async () => {
    const caido = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const { app } = crear(vi.fn().mockRejectedValue(caido));
    const res = await request(app).post('/api/registro').send(formularioValido);
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('MySQL no está corriendo');
  });

  it('responde 409 si el correo o documento ya existe', async () => {
    const duplicado = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
    const { app } = crear(vi.fn().mockRejectedValue(duplicado));
    const res = await request(app).post('/api/registro').send(formularioValido);
    expect(res.status).toBe(409);
  });
});
