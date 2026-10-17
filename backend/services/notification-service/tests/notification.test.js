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

describe('historial de envíos (db_notificaciones)', () => {
  function crearConHistorial() {
    const transporter = { sendMail: vi.fn().mockResolvedValue({ messageId: 'id-1' }) };
    const historial = { registrar: vi.fn().mockResolvedValue(), listar: vi.fn().mockResolvedValue([{ id: 1, estado: 'ENVIADA' }]) };
    const app = crearApp({ transporter, apiKey: API_KEY, emailFrom: 'no-reply@tecnosalud.co', puerto: 3005, historial });
    return { app, transporter, historial };
  }

  it('registra los correos enviados con el servicio de origen', async () => {
    const { app, historial } = crearConHistorial();
    await request(app).post('/api/notifications/email').set('x-api-key', API_KEY).set('x-servicio-origen', 'farmacias-service').send(correo);
    expect(historial.registrar).toHaveBeenCalledWith(expect.objectContaining({
      destinatario: 'afiliado@x.co', asunto: 'Hola', servicioOrigen: 'farmacias-service', estado: 'ENVIADA', messageId: 'id-1',
    }));
  });

  it('registra los correos fallidos con el motivo', async () => {
    const { app, transporter, historial } = crearConHistorial();
    transporter.sendMail.mockRejectedValue(Object.assign(new Error('auth failed'), { code: 'EAUTH' }));
    await request(app).post('/api/notifications/email').set('x-api-key', API_KEY).send(correo);
    expect(historial.registrar).toHaveBeenCalledWith(expect.objectContaining({ estado: 'FALLIDA', error: 'EAUTH', servicioOrigen: 'desconocido' }));
  });

  it('envía el correo aunque la base de datos del historial falle', async () => {
    const { app, historial } = crearConHistorial();
    historial.registrar.mockRejectedValue(Object.assign(new Error('caída'), { code: 'ECONNREFUSED' }));
    const res = await request(app).post('/api/notifications/email').set('x-api-key', API_KEY).send(correo);
    expect(res.status).toBe(200);
  });

  it('consulta el historial solo con la clave y responde 503 si MySQL no está disponible', async () => {
    const { app, historial } = crearConHistorial();
    expect((await request(app).get('/api/notifications/historial')).status).toBe(401);
    const ok = await request(app).get('/api/notifications/historial?limite=500&estado=ENVIADA').set('x-api-key', API_KEY);
    expect(ok.body.total).toBe(1);
    expect(historial.listar).toHaveBeenCalledWith({ limite: 200, destinatario: undefined, estado: 'ENVIADA' });

    historial.listar.mockRejectedValue(Object.assign(new Error('caída'), { code: 'ECONNREFUSED' }));
    const caido = await request(app).get('/api/notifications/historial').set('x-api-key', API_KEY);
    expect(caido.status).toBe(503);
  });
});

describe('resumen para el panel de administración', () => {
  const JWT = 'secreto-de-prueba';
  const firmar = async (rol) => {
    const { default: jwt } = await import('jsonwebtoken');
    return `Bearer ${jwt.sign({ id: 7, email: 'admin@x.co', rol }, JWT)}`;
  };
  function crearPanel() {
    const historial = { registrar: vi.fn(), listar: vi.fn(), resumen: vi.fn().mockResolvedValue({ total: 4, enviadas: 3, fallidas: 1 }) };
    const app = crearApp({ transporter: { sendMail: vi.fn() }, apiKey: API_KEY, emailFrom: 'x', puerto: 3005, historial, jwtSecret: JWT, frontendUrl: 'http://localhost:5173' });
    return { app, historial };
  }

  it('no usa x-api-key: exige el JWT de un ADMIN', async () => {
    const { app } = crearPanel();
    expect((await request(app).get('/api/notifications/admin/resumen')).status).toBe(401);
    expect((await request(app).get('/api/notifications/admin/resumen').set('Authorization', await firmar('PACIENTE'))).status).toBe(403);
    const res = await request(app).get('/api/notifications/admin/resumen').set('Authorization', await firmar('ADMIN'));
    expect(res.body).toEqual({ total: 4, enviadas: 3, fallidas: 1 });
  });

  it('permite CORS solo desde el frontend en esta ruta', async () => {
    const { app } = crearPanel();
    const res = await request(app).get('/api/notifications/admin/resumen').set('Origin', 'http://localhost:5173').set('Authorization', await firmar('ADMIN'));
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const envio = await request(app).post('/api/notifications/email').set('Origin', 'http://localhost:5173').send({});
    expect(envio.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('adjuntos PDF', () => {
  const pdf = Buffer.from('%PDF-1.7\n%prueba').toString('base64');
  const conAdjunto = (adjuntos) => ({ ...correo, adjuntos });

  it('envía un PDF adjunto a nodemailer', async () => {
    const { app, transporter } = crear();
    const res = await request(app).post('/api/notifications/email').set('x-api-key', API_KEY)
      .send(conAdjunto([{ nombre: 'constancia-registro.pdf', tipo: 'application/pdf', contenidoBase64: pdf }]));
    expect(res.status).toBe(200);
    const [{ attachments }] = transporter.sendMail.mock.calls[0];
    expect(attachments[0]).toMatchObject({ filename: 'constancia-registro.pdf', contentType: 'application/pdf' });
    expect(attachments[0].content.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it.each([
    ['un tipo distinto de PDF', [{ nombre: 'virus.exe', tipo: 'application/octet-stream', contenidoBase64: pdf }]],
    ['un nombre con rutas', [{ nombre: '../../etc/passwd.pdf', tipo: 'application/pdf', contenidoBase64: pdf }]],
    ['contenido que no es PDF', [{ nombre: 'falso.pdf', tipo: 'application/pdf', contenidoBase64: Buffer.from('hola').toString('base64') }]],
    ['más de 3 adjuntos', Array.from({ length: 4 }, (_, i) => ({ nombre: `a${i}.pdf`, tipo: 'application/pdf', contenidoBase64: pdf }))],
  ])('rechaza %s', async (_, adjuntos) => {
    const { app, transporter } = crear();
    const res = await request(app).post('/api/notifications/email').set('x-api-key', API_KEY).send(conAdjunto(adjuntos));
    expect(res.status).toBe(400);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });
});
