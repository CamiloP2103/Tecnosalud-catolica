import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../src/app.js';

const JWT_SECRET = 'secreto-de-prueba';
const token = (rol, id = 7) => `Bearer ${jwt.sign({ id, email: 'admin@tecnosalud.co', doc: '9000000001', rol }, JWT_SECRET)}`;

// Pool simulado: responde según la consulta
function crearPool() {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('AS nuevos7Dias')) return [[{ total: 7, activos: '6', inactivos: '1', bloqueados: '1', nuevos7Dias: '2' }]];
      if (sql.includes('FROM roles r LEFT JOIN')) return [[{ rol: 'PACIENTE', total: 3 }, { rol: 'MEDICO', total: 1 }, { rol: 'ADMIN', total: 3 }]];
      if (sql.includes('INTERVAL 1 DAY')) return [[{ total: 10, exitosos: '8', fallidos: '2' }]];
      if (sql.includes('GROUP BY motivo_fallo')) return [[{ motivo: 'CLAVE_INCORRECTA', total: 2 }]];
      if (sql.includes('FROM bitacora_acceso b LEFT JOIN')) return [[{ email: 'a@b.co', exitoso: 1 }]];
      if (sql.includes('FROM usuarios u INNER JOIN roles r')) return [[{ id: 6, nombre: 'Juan', activo: 1, bloqueado: 0 }]];
      if (sql.startsWith('UPDATE usuarios')) return [{ affectedRows: 1 }];
      return [[]];
    }),
  };
}

function crear() {
  const pool = crearPool();
  const app = crearApp({ pool, jwtSecret: JWT_SECRET, frontendUrl: 'http://localhost:5173', notificar: vi.fn().mockResolvedValue() });
  return { app, pool };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('administración de usuarios (auth-service)', () => {
  it('exige sesión y rol ADMIN', async () => {
    const { app } = crear();
    expect((await request(app).get('/api/auth/admin/resumen')).status).toBe(401);
    expect((await request(app).get('/api/auth/admin/resumen').set('Authorization', token('MEDICO'))).status).toBe(403);
  });

  it('entrega el resumen de usuarios y accesos con números', async () => {
    const res = await request(crear().app).get('/api/auth/admin/resumen').set('Authorization', token('ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.usuarios).toMatchObject({ total: 7, activos: 6, bloqueados: 1, nuevos7Dias: 2 });
    expect(res.body.usuarios.porRol).toHaveLength(3);
    expect(res.body.accesos24h).toEqual({ total: 10, exitosos: 8, fallidos: 2 });
    expect(res.body.accesosRecientes[0].exitoso).toBe(true);
  });

  it('lista usuarios con búsqueda escapada y filtro por rol', async () => {
    const { app, pool } = crear();
    const res = await request(app).get('/api/auth/admin/usuarios?buscar=50%25&rol=PACIENTE').set('Authorization', token('ADMIN'));
    expect(res.body.usuarios[0]).toMatchObject({ id: 6, activo: true, bloqueado: false });
    const [, parametros] = pool.query.mock.calls.find(([sql]) => sql.includes('FROM usuarios u INNER JOIN roles r'));
    expect(parametros).toEqual(['%50\\%%', '%50\\%%', '%50\\%%', 'PACIENTE']);
  });

  it('activa, desactiva y desbloquea cuentas', async () => {
    const { app, pool } = crear();
    expect((await request(app).patch('/api/auth/admin/usuarios/6/activo').set('Authorization', token('ADMIN')).send({ activo: false })).body).toEqual({ id: 6, activo: false });
    expect((await request(app).post('/api/auth/admin/usuarios/6/desbloquear').set('Authorization', token('ADMIN'))).body).toEqual({ id: 6, bloqueado: false });
    expect(pool.query).toHaveBeenCalledWith('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?', [6]);
  });

  it('no deja que el administrador se desactive a sí mismo ni acepta valores ambiguos', async () => {
    const { app } = crear();
    expect((await request(app).patch('/api/auth/admin/usuarios/7/activo').set('Authorization', token('ADMIN', 7)).send({ activo: false })).status).toBe(409);
    expect((await request(app).patch('/api/auth/admin/usuarios/6/activo').set('Authorization', token('ADMIN')).send({ activo: 'no' })).status).toBe(400);
  });
});
