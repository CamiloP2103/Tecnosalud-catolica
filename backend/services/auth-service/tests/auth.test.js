import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { plantillaAlertaLogin } from '../src/plantillas.js';

const JWT_SECRET = 'secreto-de-prueba';
const CLAVE = 'ClaveSegura1';
const HASH = bcrypt.hashSync(CLAVE, 4);
const CODIGO_OTP = '123456';
const HASH_OTP = bcrypt.hashSync(CODIGO_OTP, 4);

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

const mfaBase = {
  id: 50,
  codigo_hash: HASH_OTP,
  intentos: 0,
  expirado: 0,
};

// Simula mysql2: responde según la consulta SQL recibida
function crearPool({ usuario = usuarioBase, token = null, mfaCodigo = mfaBase } = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('FROM usuarios')) return [usuario ? [usuario] : []];
      if (sql.includes('FROM tokens_recuperacion')) return [token ? [token] : []];
      if (sql.includes('FROM mfa_codigos')) return [mfaCodigo ? [mfaCodigo] : []];
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

function crearTempToken(payload = { id: usuarioBase.id, email: usuarioBase.email, proposito: 'MFA_LOGIN' }, opciones = { expiresIn: '5m' }) {
  return jwt.sign(payload, JWT_SECRET, opciones);
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

  it('con credenciales correctas solicita MFA, devuelve tempToken y envía código OTP por correo', async () => {
    const { app, pool, notificar } = crear();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ usuario: ' Carlos@Tecnosalud.com.co ', contrasena: CLAVE });

    expect(res.status).toBe(200);
    expect(res.body.requiereMfa).toBe(true);
    expect(res.body.token).toBeUndefined();
    expect(jwt.verify(res.body.tempToken, JWT_SECRET)).toMatchObject({
      id: 1,
      email: usuarioBase.email,
      proposito: 'MFA_LOGIN',
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO mfa_codigos'),
      expect.any(Array)
    );
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        to: usuarioBase.email,
        subject: expect.stringContaining('Código de verificación'),
      })
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

describe('POST /api/auth/verificar-mfa', () => {
  it('exige tempToken y un código numérico de 6 dígitos', async () => {
    const { app } = crear();
    const res = await request(app)
      .post('/api/auth/verificar-mfa')
      .send({ tempToken: crearTempToken(), codigo: '123' });
    expect(res.status).toBe(400);
  });

  it('rechaza un tempToken inválido o expirado', async () => {
    const { app } = crear();
    const res = await request(app)
      .post('/api/auth/verificar-mfa')
      .send({ tempToken: 'token-invalido', codigo: CODIGO_OTP });
    expect(res.status).toBe(401);
  });

  it('rechaza un código OTP incorrecto, suma intentos y registra en bitácora', async () => {
    const { app, pool } = crear();
    const res = await request(app)
      .post('/api/auth/verificar-mfa')
      .send({ tempToken: crearTempToken(), codigo: '999999' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('incorrecto');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE mfa_codigos SET intentos = intentos + 1'),
      [mfaBase.id]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO bitacora_acceso'),
      expect.arrayContaining([usuarioBase.id, usuarioBase.email, false, 'MFA_INCORRECTO'])
    );
  });

  it('rechaza un código OTP expirado', async () => {
    const { app } = crear({ mfaCodigo: { ...mfaBase, expirado: 1 } });
    const res = await request(app)
      .post('/api/auth/verificar-mfa')
      .send({ tempToken: crearTempToken(), codigo: CODIGO_OTP });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('expirado');
  });

  it('con código correcto devuelve JWT válido, marca OTP como usado y envía alerta de inicio de sesión', async () => {
    const { app, pool, notificar } = crear();
    const res = await request(app)
      .post('/api/auth/verificar-mfa')
      .send({ tempToken: crearTempToken(), codigo: CODIGO_OTP });

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
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE mfa_codigos SET usado = TRUE'),
      [mfaBase.id]
    );
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('Inicio de sesión') })
    );
  });
});

describe('POST /api/auth/reenviar-mfa', () => {
  it('rechaza si falta tempToken o es inválido', async () => {
    const { app } = crear();
    const sinToken = await request(app).post('/api/auth/reenviar-mfa').send({});
    expect(sinToken.status).toBe(400);

    const invalido = await request(app).post('/api/auth/reenviar-mfa').send({ tempToken: 'malo' });
    expect(invalido.status).toBe(401);
  });

  it('con tempToken válido genera y envía un nuevo código OTP', async () => {
    const { app, pool, notificar } = crear();
    const res = await request(app)
      .post('/api/auth/reenviar-mfa')
      .send({ tempToken: crearTempToken() });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO mfa_codigos'),
      expect.any(Array)
    );
    expect(notificar).toHaveBeenCalledWith(
      expect.objectContaining({
        to: usuarioBase.email,
        subject: expect.stringContaining('Código de verificación'),
      })
    );
  });
});

describe('bitácora de accesos y bloqueo de cuenta en db_auth', () => {
  const sentencias = (pool, inicio) => pool.query.mock.calls.filter(([sql]) => sql.trim().startsWith(inicio));
  const motivos = (pool) => sentencias(pool, 'INSERT INTO bitacora_acceso').map(([, p]) => [p[3], p[4]]);

  it('reinicia intentos fallidos en login y registra el acceso exitoso tras verificar MFA', async () => {
    const { app, pool } = crear();
    const paso1 = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: CLAVE });
    expect(sentencias(pool, 'UPDATE usuarios SET intentos_fallidos = 0')[0][1]).toEqual([1]);

    await request(app)
      .post('/api/auth/verificar-mfa')
      .send({ tempToken: paso1.body.tempToken, codigo: CODIGO_OTP });

    expect(motivos(pool)).toEqual([[true, null]]);
  });

  it('suma el intento fallido en la base y lo registra con su motivo', async () => {
    const { app, pool } = crear();
    await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: 'mala' });
    const [sql, parametros] = sentencias(pool, 'UPDATE usuarios')[0];
    expect(sql).toContain('DATE_ADD(NOW(), INTERVAL 15 MINUTE)');
    expect(parametros).toEqual([5, 5, 1]);
    expect(motivos(pool)).toEqual([[false, 'CLAVE_INCORRECTA']]);
  });

  it('registra los correos inexistentes sin usuario asociado', async () => {
    const { app, pool } = crear({ usuario: null });
    await request(app).post('/api/auth/login').send({ usuario: 'nadie@x.co', contrasena: 'x' });
    const [, parametros] = sentencias(pool, 'INSERT INTO bitacora_acceso')[0];
    expect(parametros[0]).toBeNull();
    expect(parametros[4]).toBe('USUARIO_NO_EXISTE');
  });

  it('rechaza una cuenta bloqueada sin revisar la contraseña, aunque sea correcta', async () => {
    const { app, pool, notificar } = crear({ usuario: { ...usuarioBase, esta_bloqueado: 1, minutos_bloqueo: 12 } });
    const res = await request(app).post('/api/auth/login').send({ usuario: usuarioBase.email, contrasena: CLAVE });
    expect(res.status).toBe(429);
    expect(res.body.error).toContain('12 minuto');
    expect(res.body.token).toBeUndefined();
    expect(motivos(pool)).toEqual([[false, 'CUENTA_BLOQUEADA']]);
    expect(notificar).not.toHaveBeenCalled();
  });

  it('no falla la verificación de login si no se puede escribir en la bitácora', async () => {
    const { app, pool } = crear();
    const consultaOriginal = pool.query.getMockImplementation();
    pool.query.mockImplementation(async (sql, parametros) => {
      if (sql.includes('INSERT INTO bitacora_acceso')) throw Object.assign(new Error('tabla'), { code: 'ER_NO_SUCH_TABLE' });
      return consultaOriginal(sql, parametros);
    });
    const res = await request(app)
      .post('/api/auth/verificar-mfa')
      .send({ tempToken: crearTempToken(), codigo: CODIGO_OTP });
    expect(res.status).toBe(200);
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
    // Restablecer la contraseña también desbloquea la cuenta
    expect(pool.query.mock.calls.find(([sql]) => sql.includes('UPDATE usuarios'))[0]).toContain('bloqueado_hasta = NULL');
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