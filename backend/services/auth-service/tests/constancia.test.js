import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';
import { contrasenaDe, generarConstancia } from '../src/constancia.js';
import { crearEnvioConstancias } from '../src/envioConstancias.js';

const JWT_SECRET = 'secreto-de-prueba';
const token = (rol, id = 7) => `Bearer ${jwt.sign({ id, email: 'admin@tecnosalud.co', doc: '9000000001', rol }, JWT_SECRET)}`;

const USUARIO = {
  id: 6, nombre: 'Juan Esteban Peña', email: 'juan@x.co', tipoDoc: 'CC', documento: '1000000001', rol: 'PACIENTE',
  activo: 1, creadoEn: '2026-10-16T22:00:00Z', ultimoAcceso: null,
};

function crearPool({ usuario = USUARIO } = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('FROM usuarios u INNER JOIN roles r ON r.id = u.rol_id WHERE u.id = ?')) return [usuario ? [usuario] : []];
      if (sql.startsWith('SELECT id FROM usuarios WHERE activo')) return [[{ id: 6 }, { id: 7 }]];
      return [{ affectedRows: 1 }];
    }),
  };
}

const registros = (pool) => pool.query.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO constancias_enviadas')).map(([, p]) => p);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('generarConstancia', () => {
  it('produce un PDF cifrado con AES-256 sin datos legibles en claro', async () => {
    const pdf = await generarConstancia(USUARIO);
    const texto = pdf.toString('latin1');
    expect(texto.startsWith('%PDF-')).toBe(true);
    expect(texto).toContain('/Encrypt');
    expect(texto).toMatch(/\/V 5/); // AES-256
    expect(texto).not.toContain('Juan Esteban');
    expect(texto).not.toContain('juan@x.co');
  });

  it('usa el número de identificación (sin espacios) como contraseña', () => {
    expect(contrasenaDe({ documento: ' 1000 000 001 ' })).toBe('1000000001');
  });
});

describe('envío de constancias', () => {
  it('adjunta el PDF al correo y registra el envío', async () => {
    const pool = crearPool();
    const notificar = vi.fn().mockResolvedValue();
    const resultado = await crearEnvioConstancias({ pool, notificar }).enviar(6, 'admin@tecnosalud.co');

    expect(resultado).toEqual({ usuarioId: 6, email: 'juan@x.co', estado: 'ENVIADA' });
    const [{ to, html, adjuntos }] = notificar.mock.calls[0];
    expect(to).toBe('juan@x.co');
    expect(html).toContain('número de identificación');
    expect(html).not.toContain('1000000001'); // el correo no revela la contraseña
    expect(adjuntos[0]).toMatchObject({ nombre: 'constancia-registro-tecnosalud.pdf', tipo: 'application/pdf' });
    expect(Buffer.from(adjuntos[0].contenidoBase64, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
    expect(registros(pool)).toEqual([[6, 'admin@tecnosalud.co', 'ENVIADA', null]]);
  });

  it('registra el fallo si el correo no sale', async () => {
    const pool = crearPool();
    const notificar = vi.fn().mockRejectedValue(new Error('notification-service respondió 500'));
    const resultado = await crearEnvioConstancias({ pool, notificar }).enviar(6, 'admin@tecnosalud.co');
    expect(resultado.estado).toBe('FALLIDA');
    expect(registros(pool)[0].slice(0, 3)).toEqual([6, 'admin@tecnosalud.co', 'FALLIDA']);
  });

  it('informa cuando el usuario no existe', async () => {
    const resultado = await crearEnvioConstancias({ pool: crearPool({ usuario: null }), notificar: vi.fn() }).enviar(99, 'x');
    expect(resultado.estado).toBe('NO_EXISTE');
  });

  it('envía a todos los usuarios activos y resume el resultado', async () => {
    const notificar = vi.fn().mockResolvedValueOnce().mockRejectedValueOnce(new Error('caído'));
    const resumen = await crearEnvioConstancias({ pool: crearPool(), notificar }).enviarATodos('admin@tecnosalud.co');
    expect(resumen).toMatchObject({ total: 2, enviadas: 1, fallidas: 1 });
  });
});

describe('rutas de constancias', () => {
  function crear(notificar = vi.fn().mockResolvedValue()) {
    const pool = crearPool();
    const app = crearApp({ pool, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar });
    return { app, pool, notificar };
  }

  it('el administrador envía la constancia de un usuario', async () => {
    const { app, notificar } = crear();
    const res = await request(app).post('/api/auth/admin/usuarios/6/constancia').set('Authorization', token('ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ENVIADA');
    expect(notificar).toHaveBeenCalledTimes(1);
  });

  it('un paciente no puede enviar constancias de otros', async () => {
    const res = await request(crear().app).post('/api/auth/admin/usuarios/6/constancia').set('Authorization', token('PACIENTE'));
    expect(res.status).toBe(403);
  });

  it('responde 502 si el correo falla y permite el envío masivo', async () => {
    const fallido = crear(vi.fn().mockRejectedValue(new Error('caído')));
    expect((await request(fallido.app).post('/api/auth/admin/usuarios/6/constancia').set('Authorization', token('ADMIN'))).status).toBe(502);
    const masivo = await request(crear().app).post('/api/auth/admin/constancias').set('Authorization', token('ADMIN'));
    expect(masivo.body).toMatchObject({ total: 2, enviadas: 2 });
  });

  it('cada usuario puede pedir su propia constancia, con límite de 3 por hora', async () => {
    const { app } = crear();
    expect((await request(app).post('/api/auth/mi-constancia')).status).toBe(401);
    const propia = token('PACIENTE', 6);
    for (let i = 0; i < 3; i += 1) {
      const ok = await request(app).post('/api/auth/mi-constancia').set('Authorization', propia);
      expect(ok.status).toBe(200);
      expect(ok.body.mensaje).toContain('número de identificación');
    }
    expect((await request(app).post('/api/auth/mi-constancia').set('Authorization', propia)).status).toBe(429);
  });
});
