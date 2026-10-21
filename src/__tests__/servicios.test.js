import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorServicio, llamarServicio, mensajeDeError, SERVICIO_AUTH } from '../utils/servicios';

const URL_LOGIN = 'http://localhost:3002/api/auth/login';

const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: cuerpo === undefined ? async () => { throw new SyntaxError('no es JSON'); } : async () => cuerpo,
});

afterEach(() => vi.unstubAllGlobals());

describe('llamarServicio', () => {
  it('devuelve los datos cuando el servicio responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { token: 'abc' })));
    await expect(llamarServicio(URL_LOGIN, {}, SERVICIO_AUTH)).resolves.toEqual({ ok: true, status: 200, datos: { token: 'abc' } });
  });

  it('deja pasar los errores de negocio (401) para que la pantalla los muestre', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(401, { error: 'Credenciales inválidas.' })));
    const { ok, datos } = await llamarServicio(URL_LOGIN, {}, SERVICIO_AUTH);
    expect(ok).toBe(false);
    expect(datos.error).toBe('Credenciales inválidas.');
  });

  it('explica que el servicio está apagado cuando no hay conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await llamarServicio(URL_LOGIN, {}, SERVICIO_AUTH).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorServicio);
    expect(error.tipo).toBe('sin-conexion');
    expect(error.message).toContain('No hay conexión con el servicio de autenticación (http://localhost:3002)');
    expect(error.message).toContain('backend/services/auth-service');
  });

  it('muestra la causa de base de datos que envía el servicio (503)', async () => {
    const causa = 'El servicio está encendido, pero no puede usar la base de datos. MySQL no está corriendo.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(503, { error: causa })));
    const error = await llamarServicio(URL_LOGIN, {}, SERVICIO_AUTH).catch((e) => e);
    expect(error.tipo).toBe('base-datos');
    expect(error.message).toBe(causa);
  });

  it('distingue un error interno (500)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(500, { error: 'Error interno en el servidor.' })));
    const error = await llamarServicio(URL_LOGIN, {}, SERVICIO_AUTH).catch((e) => e);
    expect(error.tipo).toBe('error-interno');
    expect(error.message).toContain('error interno (código 500)');
  });

  it('avisa si la respuesta no es JSON (URL equivocada)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(404)));
    const error = await llamarServicio(URL_LOGIN, {}, SERVICIO_AUTH).catch((e) => e);
    expect(error.tipo).toBe('respuesta-invalida');
  });
});

describe('mensajeDeError', () => {
  it('usa un mensaje genérico para errores desconocidos', () => {
    expect(mensajeDeError(new Error('x'), SERVICIO_AUTH)).toContain('error inesperado');
  });
});
