import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { plantillaAlertaLogin } from '../src/plantillas.js';

const JWT_SECRET = 'secreto-de-prueba';
const CLAVE = 'ClaveSegura1';
const HASH = bcrypt.hashSync(CLAVE, 4);

const usuarioBase = {
  id: 1,
  tipo_doc: 'CC',
  documento: '72000607',
  email: 'carlos@tecnosalud.com.co',
  contrasena_hash: HASH,
  nombre: 'Carlos Jiménez',
  activo: 1,
  rol: 'afiliado',
};

// Simula mysql2: responde según la consulta SQL recibida
function crearPool({ usuario = usuarioBase, token = null } = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('FROM usuarios')) return [usuario ? [usuario] : []];
      if (sql.includes('FROM tokens_recuperacion')) return [token ? [token] : []];
      return [{ affectedRows: 1 }];
    }),
  };
}

function crear(opciones) {
  const pool = crearPool(opciones);
  const notificar = vi.fn().mockResolvedValue();
  const app = crearApp({ pool, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar });
  return { app, pool, notificar };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/auth/login', () => {
  it('exige usuario y contraseña', async () => {
    const { app } = crear();
    const res = await request(app).post('/api/auth/login').send({ usuario: 'a@b.co' });
    expect(res.status).toBe(400);
  });

  it('responde un error genérico si el correo no existe y no envía correo', async () => {
    const { app, notificar } = crear({ usuario: null });
    const res = await request(app).post('/api/auth/login').send({ usuario: 'nadie@x.co', contrasena: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas.');
    expect(notificar).not.toHaveBeenCalled();
  });

  it('con contraseña errada responde 401 y envía alerta de seguridad', async () => {
    const { app, notificar } = crear();
    const res = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: 'mala' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas.');
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ to: usuarioBase.email, subject: expect.stringContaining('Alerta') })
    );
  });

  it('con credenciales correctas devuelve un JWT válido sin datos sensibles', async () => {
    const { app, notificar } = crear();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ usuario: ' Carlos@Tecnosalud.com.co ', contrasena: CLAVE });
    expect(res.status).toBe(200);
    expect(jwt.verify(res.body.token, JWT_SECRET)).toMatchObject({ id: 1, email: usuarioBase.email });
    expect(res.body.usuario).toEqual({
      id: 1,
      nombre: 'Carlos Jiménez',
      email: usuarioBase.email,
      tipoDoc: 'CC',
      documento: '72000607',
      rol: 'afiliado',
    });
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('Inicio de sesión') })
    );
  });

  it('solo informa que la cuenta está inactiva si la contraseña es correcta', async () => {
    const { app } = crear({ usuario: { ...usuarioBase, activo: 0 } });
    const mala = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: 'mala' });
    expect(mala.status).toBe(401);
    const buena = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: CLAVE });
    expect(buena.status).toBe(403);
  });

  it('bloquea con 429 después de 5 intentos fallidos', async () => {
    const { app } = crear();
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: 'mala' });
    }
    const res = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: CLAVE });
    expect(res.status).toBe(429);
  });
});

describe('POST /api/auth/recuperar-clave/solicitar', () => {
  it('responde igual aunque el correo no exista, sin guardar token ni enviar correo', async () => {
    const { app, pool, notificar } = crear({ usuario: null });
    const res = await request(app).post('/api/auth/recuperar-clave/solicitar').send({ email: 'nadie@x.co' });
    expect(res.status).toBe(200);
    expect(res.body.mensaje).toMatch(/Si el correo está registrado/);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(notificar).not.toHaveBeenCalled();
  });

  it('con un correo registrado guarda el token y envía el enlace', async () => {
    const { app, pool, notificar } = crear();
    const res = await request(app).post('/api/auth/recuperar-clave/solicitar').send({ email: usuarioBase.email });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tokens_recuperacion'),
      expect.any(Array)
    );
    expect(notificar.mock.calls[0][0].html).toContain('http://localhost:5173/#restablecer-clave?token=');
  });

  it('no revela si el envío falló', async () => {
    const { app, notificar } = crear();
    notificar.mockRejectedValue(new Error('SMTP caído'));
    const res = await request(app).post('/api/auth/recuperar-clave/solicitar').send({ email: usuarioBase.email });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/recuperar-clave/restablecer', () => {
  const tokenVigente = { id: 9, usuario_id: 1, expira_en: new Date(Date.now() + 60000), usado: 0 };

  it('exige mínimo 8 caracteres', async () => {
    const { app } = crear({ token: tokenVigente });
    const res = await request(app)
      .post('/api/auth/recuperar-clave/restablecer')
      .send({ token: 't', nuevaContrasena: '1234567' });
    expect(res.status).toBe(400);
  });

  it.each([
    ['inexistente', null, 'inválido'],
    ['usado', { ...tokenVigente, usado: 1 }, 'utilizado'],
    ['expirado', { ...tokenVigente, expira_en: new Date(Date.now() - 1000) }, 'expirado'],
  ])('rechaza un token %s', async (_, token, mensaje) => {
    const { app } = crear({ token });
    const res = await request(app)
      .post('/api/auth/recuperar-clave/restablecer')
      .send({ token: 't', nuevaContrasena: 'NuevaClave1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain(mensaje);
  });

  it('con un token vigente actualiza la contraseña y marca el token como usado', async () => {
    const { app, pool } = crear({ token: tokenVigente });
    const res = await request(app)
      .post('/api/auth/recuperar-clave/restablecer')
      .send({ token: 't', nuevaContrasena: 'NuevaClave1' });
    expect(res.status).toBe(200);
    const [, [nuevoHash, usuarioId]] = pool.query.mock.calls.find(([sql]) => sql.includes('UPDATE usuarios'));
    expect(usuarioId).toBe(1);
    expect(bcrypt.compareSync('NuevaClave1', nuevoHash)).toBe(true);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE tokens_recuperacion'), [9]);
  });
});

describe('base de datos no disponible', () => {
  it.each([
    ['ECONNREFUSED', 'MySQL no está corriendo'],
    ['ER_ACCESS_DENIED_ERROR', 'DB_USER/DB_PASSWORD'],
    ['ER_NO_SUCH_TABLE', 'Faltan tablas'],
  ])('responde 503 con la causa cuando MySQL falla con %s', async (code, causa) => {
    const pool = { query: vi.fn().mockRejectedValue(Object.assign(new Error('fallo'), { code })) };
    const app = crearApp({ pool, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar: vi.fn() });
    const res = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: CLAVE });
    expect(res.status).toBe(503);
    expect(res.body.error).toContain(causa);
  });

  it('mantiene 500 para errores que no son de conexión', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('otro')) };
    const app = crearApp({ pool, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar: vi.fn() });
    const res = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: CLAVE });
    expect(res.status).toBe(500);
  });
});

describe('plantillas de correo', () => {
  it('escapan el nombre del usuario', () => {
    const html = plantillaAlertaLogin({
      nombreUsuario: '<script>x</script>',
      exito: true,
      ipCliente: '1.1.1.1',
      fechaHora: 'hoy',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
