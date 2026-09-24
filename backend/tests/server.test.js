import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app, { resetUsuarios } from '../server.js';

beforeEach(() => resetUsuarios());

describe('API de Tecnosalud', () => {
  it('responde el estado del backend', async () => {
    const respuesta = await request(app).get('/api/health');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.estado).toBe('ok');
  });

  it('rechaza un registro incompleto', async () => {
    const respuesta = await request(app).post('/api/usuarios/registro').send({});
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toMatchObject({
      nombres: 'Los nombres son obligatorios',
      correo: 'El correo electrónico no es válido',
    });
  });

  it('registra un usuario y permite iniciar sesión', async () => {
    const registro = await request(app).post('/api/usuarios/registro').send({
      nombres: 'Ana', apellidos: 'Pérez', tipoDocumento: 'CC', documento: '1234567890',
      correo: 'ana@example.com', telefono: '3001234567', aceptaTratamientoDatos: true,
    });
    expect(registro.status).toBe(201);

    const acceso = await request(app).post('/api/usuarios/acceso').send({
      usuario: 'ana@example.com', contrasena: 'pendiente',
    });
    expect(acceso.status).toBe(200);
    expect(acceso.body.email).toBe('ana@example.com');
  });

  it('valida las credenciales demo', async () => {
    const acceso = await request(app).post('/api/usuarios/acceso').send({
      usuario: 'caenjiro@gmail.com', contrasena: 'incorrecta',
    });
    expect(acceso.status).toBe(401);
  });
});