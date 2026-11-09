import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { validarRegistro } from '../src/validators.js';

const formularioValido = {
  nombres: 'Carlos',
  apellidos: 'Jimenez',
  tipoDocumentoCodigo: 'CC',
  documento: '72000608',
  nacimientoDia: '05',
  nacimientoMes: '09',
  nacimientoAnio: '1977',
  generoCodigo: 'M',
  correo: 'caenjiro@yahoo.com',
  telefono: '3001234567',
  direccion: 'Calle 1 # 2-3',
  municipioCodigo: '11001',
  tipoAfiliacionCodigo: 'paciente',
  epsCodigo: 'EPS001',
  regimenCodigo: 'contributivo',
  salario: '1500000',
  contactoEmergenciaNombre: 'Alexandra Arboleda',
  contactoEmergenciaTelefono: '3007654321',
  contactoEmergenciaParentescoCodigo: 'Padre',
  aceptaTratamientoDatos: true,
};

function crear(execute = vi.fn().mockResolvedValue([{ insertId: 7 }])) {
  const notificar = vi.fn().mockResolvedValue();
  const repo = {
    crearAfiliado: async (datos) => {
      const [res] = await execute('INSERT INTO afiliados ...', [datos]);
      return res.insertId;
    },
    catalogos: async () => ({ listas: { departamentos: [], eps: [] } }),
    resumen: async () => ({}),
    listarAfiliados: async () => [],
    cambiarEstado: async () => ({}),
    historial: async () => []
  };
  const app = crearApp({ repo, frontendUrl: 'http://localhost:5173', notificar, puerto: 3003 });
  return { app, execute, notificar };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('validarRegistro', () => {
  it('acepta un formulario válido y normaliza los datos', () => {
    const { errores, datos } = validarRegistro(formularioValido);
    expect(errores).toEqual({});
    expect(datos.correo).toBe('caenjiro@yahoo.com');
    expect(datos.fechaNacimiento).toBe('1977-09-05');
  });

  it('rechaza fechas imposibles o futuras', () => {
    const imposible = validarRegistro({ ...formularioValido, nacimientoDia: '31', nacimientoMes: '02' });
    expect(imposible.errores.fechaNacimiento).toBeDefined();
    const futuro = validarRegistro({ ...formularioValido, nacimientoAnio: String(new Date().getFullYear() + 1) });
    expect(futuro.errores.fechaNacimiento).toBeDefined();
  });

  //it('exige autorización explícita de tratamiento de datos', () => {
   // const { errores } = validarRegistro({ ...formularioValido, aceptaTratamientoDatos: 'true' });
   // expect(errores.aceptaTratamientoDatos).toBeDefined();
  //});
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
    expect(res.body).toMatchObject({ id: 7, email: 'caenjiro@yahoo.com', nombre: 'Carlos Jimenez', estado: 'PENDIENTE' });
    expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ to: 'caenjiro@yahoo.com' }));
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
