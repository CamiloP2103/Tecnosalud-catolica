import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { ErrorNegocio } from '../src/repositorio.js';
import { validarRegistro } from '../src/validators.js';

const JWT_SECRET = 'secreto-de-prueba';
const token = (rol) => `Bearer ${jwt.sign({ id: 7, email: 'admin@tecnosalud.co', doc: '9000000001', rol }, JWT_SECRET)}`;
const HOY = new Date(2026, 9, 16);

const VALIDOS = {
  tiposDocumento: new Set(['CC', 'TI', 'RC', 'CE', 'PA', 'PPT']),
  generos: new Set(['M', 'F', 'Otro']),
  municipios: new Set(['11001', '25754']),
  eps: new Set(['SANITAS', 'NUEVA_EPS']),
  regimenes: new Set(['contributivo', 'subsidiado']),
  tiposAfiliacion: new Set(['paciente']),
  parentescos: new Set(['madre']),
};

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
  municipio: '11001',
  tipoAfiliacion: 'paciente',
  eps: 'SANITAS',
  regimen: 'contributivo',
  contactoEmergenciaNombre: 'Luis Pérez',
  contactoEmergenciaTelefono: '3007654321',
  contactoEmergenciaParentesco: 'madre',
  aceptaTratamientoDatos: true,
};

function crear() {
  const repo = {
    catalogos: vi.fn().mockResolvedValue({ listas: { tiposDocumento: [{ codigo: 'CC' }], departamentos: [] }, validos: VALIDOS }),
    crearAfiliado: vi.fn().mockResolvedValue(7),
    resumen: vi.fn().mockResolvedValue({ total: 3, pendientes: 2 }),
    listarAfiliados: vi.fn().mockResolvedValue([{ id: 7 }]),
    cambiarEstado: vi.fn().mockResolvedValue({ id: 7, estadoAnterior: 'PENDIENTE', estado: 'ACTIVO' }),
    historial: vi.fn().mockResolvedValue([]),
  };
  const notificar = vi.fn().mockResolvedValue();
  const app = crearApp({ repo, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar, puerto: 3003 });
  return { app, repo, notificar };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('validarRegistro con catálogos', () => {
  it('acepta un formulario válido y normaliza los datos', () => {
    const { errores, datos } = validarRegistro(formularioValido, VALIDOS, HOY);
    expect(errores).toEqual({});
    expect(datos).toMatchObject({ correo: 'ana.perez@correo.com', fechaNacimiento: '1990-06-15', municipio: '11001', eps: 'SANITAS' });
  });

  it.each([
    ['municipio', { municipio: '99999' }],
    ['eps', { eps: 'EPS_INVENTADA' }],
    ['tipoDocumento', { tipoDocumento: 'XX' }],
    ['regimen', { regimen: 'otro' }],
    ['contactoEmergenciaParentesco', { contactoEmergenciaParentesco: 'vecino' }],
  ])('rechaza valores que no están en el catálogo (%s)', (campo, cambio) => {
    expect(validarRegistro({ ...formularioValido, ...cambio }, VALIDOS, HOY).errores[campo]).toBeDefined();
  });

  it('el parentesco es opcional', () => {
    const { errores, datos } = validarRegistro({ ...formularioValido, contactoEmergenciaParentesco: '' }, VALIDOS, HOY);
    expect(errores).toEqual({});
    expect(datos.contactoEmergenciaParentesco).toBeNull();
  });

  it('exige que el tipo de documento corresponda a la edad', () => {
    const menor = { nacimientoDia: '01', nacimientoMes: '01', nacimientoAnio: '2015' };
    expect(validarRegistro({ ...formularioValido, ...menor }, VALIDOS, HOY).errores.tipoDocumento).toContain('mayores de 18');
    expect(validarRegistro({ ...formularioValido, ...menor, tipoDocumento: 'TI' }, VALIDOS, HOY).errores).toEqual({});
    expect(validarRegistro({ ...formularioValido, tipoDocumento: 'RC' }, VALIDOS, HOY).errores.tipoDocumento).toContain('menores de 7');
  });

  it('valida teléfonos colombianos y documentos alfanuméricos solo para pasaporte, CE y PPT', () => {
    expect(validarRegistro({ ...formularioValido, telefono: '1234567890' }, VALIDOS, HOY).errores.telefono).toBeDefined();
    expect(validarRegistro({ ...formularioValido, telefono: '6015551234' }, VALIDOS, HOY).errores.telefono).toBeUndefined();
    expect(validarRegistro({ ...formularioValido, documento: 'AB12345' }, VALIDOS, HOY).errores.documento).toBeDefined();
    expect(validarRegistro({ ...formularioValido, tipoDocumento: 'PA', documento: 'ab12345' }, VALIDOS, HOY).errores).toEqual({});
  });

  it('rechaza fechas imposibles o futuras y exige autorización de datos', () => {
    expect(validarRegistro({ ...formularioValido, nacimientoDia: '31', nacimientoMes: '02' }, VALIDOS, HOY).errores.fechaNacimiento).toBeDefined();
    expect(validarRegistro({ ...formularioValido, nacimientoAnio: '2027' }, VALIDOS, HOY).errores.fechaNacimiento).toBeDefined();
    expect(validarRegistro({ ...formularioValido, aceptaTratamientoDatos: 'true' }, VALIDOS, HOY).errores.aceptaTratamientoDatos).toBeDefined();
  });
});

describe('rutas públicas', () => {
  it('entrega los catálogos para el formulario', async () => {
    const res = await request(crear().app).get('/api/registro/catalogos');
    expect(res.status).toBe(200);
    expect(res.body.tiposDocumento[0].codigo).toBe('CC');
  });

  it('rechaza un formulario vacío sin tocar la base de datos', async () => {
    const { app, repo } = crear();
    const res = await request(app).post('/api/registro').send({});
    expect(res.status).toBe(400);
    expect(res.body.errores).toHaveProperty('municipio');
    expect(repo.crearAfiliado).not.toHaveBeenCalled();
  });

  it('guarda un afiliado válido y envía la confirmación con el nombre escapado', async () => {
    const { app, repo, notificar } = crear();
    const res = await request(app).post('/api/registro').send({ ...formularioValido, nombres: '<b>Ana</b>' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 7, email: 'ana.perez@correo.com', nombre: '<b>Ana</b> Pérez', estado: 'PENDIENTE' });
    expect(repo.crearAfiliado).toHaveBeenCalledWith(expect.objectContaining({ municipio: '11001', eps: 'SANITAS', contactoEmergenciaParentesco: 'madre' }));
    expect(notificar.mock.calls[0][0].html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
  });

  it('responde 409 si el correo o documento ya existe', async () => {
    const { app, repo } = crear();
    repo.crearAfiliado.mockRejectedValue(new ErrorNegocio(409, 'El correo o el documento ya está registrado.'));
    expect((await request(app).post('/api/registro').send(formularioValido)).status).toBe(409);
  });

  it('responde 503 con la causa si MySQL no está corriendo', async () => {
    const { app, repo } = crear();
    repo.catalogos.mockRejectedValue(Object.assign(new Error('caída'), { code: 'ECONNREFUSED' }));
    const res = await request(app).post('/api/registro').send(formularioValido);
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('MySQL no está corriendo');
  });
});

describe('administración de afiliados', () => {
  it('exige sesión y rol ADMIN', async () => {
    const { app } = crear();
    expect((await request(app).get('/api/registro/admin/resumen')).status).toBe(401);
    expect((await request(app).get('/api/registro/admin/resumen').set('Authorization', token('PACIENTE'))).status).toBe(403);
    expect((await request(app).get('/api/registro/admin/resumen').set('Authorization', token('ADMIN'))).body.total).toBe(3);
  });

  it('filtra la lista de afiliados', async () => {
    const { app, repo } = crear();
    await request(app).get('/api/registro/admin/afiliados?estado=PENDIENTE&buscar=%20ana%20').set('Authorization', token('ADMIN'));
    expect(repo.listarAfiliados).toHaveBeenCalledWith({ estado: 'PENDIENTE', buscar: 'ana' });
  });

  it('cambia el estado registrando qué administrador lo hizo', async () => {
    const { app, repo } = crear();
    const res = await request(app).patch('/api/registro/admin/afiliados/7/estado').set('Authorization', token('ADMIN'))
      .send({ estado: 'activo', observacion: 'Documentos verificados' });
    expect(res.body.estado).toBe('ACTIVO');
    expect(repo.cambiarEstado).toHaveBeenCalledWith(7, 'ACTIVO', { cambiadoPor: 'admin@tecnosalud.co', observacion: 'Documentos verificados' });
  });
});

describe('script SQL de db_registro', () => {
  const script = readFileSync(fileURLToPath(new URL('../database/Script_Creacion_BasedeDatosRegistro.sql', import.meta.url)), 'utf8');

  it('crea los catálogos, afiliados e historial', () => {
    for (const tabla of ['tipos_documento', 'generos', 'departamentos', 'municipios', 'regimenes', 'eps', 'tipos_afiliacion', 'parentescos', 'afiliados', 'historial_estados']) {
      expect(script).toContain(`CREATE TABLE IF NOT EXISTS ${tabla}`);
    }
  });

  it('relaciona afiliados con cada catálogo mediante llaves foráneas', () => {
    for (const fk of ['fk_afiliado_tipo_documento', 'fk_afiliado_genero', 'fk_afiliado_municipio', 'fk_afiliado_tipo_afiliacion', 'fk_afiliado_eps', 'fk_afiliado_regimen', 'fk_afiliado_parentesco', 'fk_municipio_departamento', 'fk_historial_afiliado']) {
      expect(script).toContain(fk);
    }
  });

  it('carga los 33 departamentos y municipios con código DANE coherente con su departamento', () => {
    const departamentos = [...script.matchAll(/\('(\d{2})', '[^']+'\)/g)].map((m) => m[1]);
    expect(new Set(departamentos).size).toBe(33);
    const municipios = [...script.matchAll(/\('(\d{5})', '[^']+', '(\d{2})'\)/g)];
    expect(municipios.length).toBeGreaterThanOrEqual(80);
    for (const [, codigo, departamento] of municipios) {
      expect(codigo.slice(0, 2), `municipio ${codigo}`).toBe(departamento);
      expect(departamentos).toContain(departamento);
    }
  });
});
