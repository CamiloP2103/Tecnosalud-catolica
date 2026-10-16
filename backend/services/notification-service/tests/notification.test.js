import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';

const API_KEY = 'clave-de-prueba';
const correo = { to: 'afiliado@x.co', subject: 'Hola', html: '<p>Hola</p>' };

function crear() {
  const transporter = { sendMail: vi.fn().mockResolvedValue({ messageId: 'id-1' }) };
  const app = crearApp({ transporter, apiKey: API_KEY, emailFrom: 'no-reply@tecnosalud.co', puerto: 3005 });
  return { app, transporter };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('notification-service', () => {
  it('responde el health check sin clave', async () => {
    const res = await request(crear().app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('activo');
  });

  it.each([
    ['sin clave', undefined],
    ['con clave incorrecta', 'otra'],
  ])('rechaza peticiones %s', async (_, clave) => {
    const { app, transporter } = crear();
    const peticion = request(app).post('/api/notifications/email');
    if (clave) peticion.set('x-api-key', clave);
    const res = await peticion.send(correo);
    expect(res.status).toBe(401);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it('valida los campos obligatorios', async () => {
    const res = await request(crear().app)
      .post('/api/notifications/email')
      .set('x-api-key', API_KEY)
      .send({ to: 'a@b.co' });
    expect(res.status).toBe(400);
  });

  it('envía el correo con el remitente configurado', async () => {
    const { app, transporter } = crear();
    const res = await request(app).post('/api/notifications/email').set('x-api-key', API_KEY).send(correo);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ exito: true, messageId: 'id-1' });
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ ...correo, from: 'no-reply@tecnosalud.co' })
    );
  });

  it('no expone el detalle del error SMTP', async () => {
    const { app, transporter } = crear();
    transporter.sendMail.mockRejectedValue(new Error('535 credenciales SMTP inválidas'));
    const res = await request(app).post('/api/notifications/email').set('x-api-key', API_KEY).send(correo);
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('535');
  });
});
