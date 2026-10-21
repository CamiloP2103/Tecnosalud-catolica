import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app, { JWT_SECRET, resetCitas } from '../src/index.js';

function tokenDe(usuarioId = 1, claims = {}) {
  return jwt.sign({ id: usuarioId, ...claims }, JWT_SECRET, { expiresIn: '1h' });
}

function proximoDiaHabil() {
  const fecha = new Date();
  fecha.setUTCHours(0, 0, 0, 0);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  while (fecha.getUTCDay() === 0 || fecha.getUTCDay() === 6) {
    fecha.setUTCDate(fecha.getUTCDate() + 1);
  }
  return fecha.toISOString().slice(0, 10);
}

let fechaCita;

beforeEach(() => {
  resetCitas();
  fechaCita = proximoDiaHabil();
});

describe('Citas Service', () => {
  it('expone cuatro doctores y disponibilidad por doctor', async () => {
    const doctores = await request(app).get('/api/doctores');
    expect(doctores.status).toBe(200);
    expect(doctores.body).toHaveLength(4);

    const disponibilidad = await request(app)
      .get('/api/disponibilidad')
      .query({ fecha: fechaCita, doctorId: 'doctor-1' });
    expect(disponibilidad.status).toBe(200);
    expect(disponibilidad.body.horarios[0]).toEqual({ hora: '08:00', disponible: true });
  });

  it('requiere autenticación para consultar o crear citas', async () => {
    const consulta = await request(app).get('/api/citas');
    const asignacion = await request(app).post('/api/citas').send({});
    expect(consulta.status).toBe(401);
    expect(asignacion.status).toBe(401);
  });

  it('asigna una cita y evita reservar dos veces el mismo horario del doctor', async () => {
    const datosCita = {
      nombrePaciente: 'Ana Pérez',
      doctorId: 'doctor-1',
      fecha: fechaCita,
      hora: '08:00',
    };
    const asignacion = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe()}`)
      .send(datosCita);
    expect(asignacion.status).toBe(201);
    expect(asignacion.body.estado).toBe('programada');

    const duplicada = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(2)}`)
      .send(datosCita);
    expect(duplicada.status).toBe(409);
  });

  it('solo permite a pacientes consultar sus propias citas', async () => {
    await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nombrePaciente: 'Ana Pérez', doctorId: 'doctor-1', fecha: fechaCita, hora: '08:00' });
    await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(2)}`)
      .send({ nombrePaciente: 'Luis Gómez', doctorId: 'doctor-2', fecha: fechaCita, hora: '08:00' });

    const citasPaciente = await request(app)
      .get('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(1)}`);
    expect(citasPaciente.status).toBe(200);
    expect(citasPaciente.body).toHaveLength(1);
    expect(citasPaciente.body[0].nombrePaciente).toBe('Ana Pérez');
    expect(citasPaciente.body[0].usuarioId).toBe(1);
  });

  it('permite al médico consultar solo las citas asignadas a su agenda', async () => {
    await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nombrePaciente: 'Ana Pérez', doctorId: 'doctor-1', fecha: fechaCita, hora: '08:00' });
    await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(2)}`)
      .send({ nombrePaciente: 'Luis Gómez', doctorId: 'doctor-2', fecha: fechaCita, hora: '08:00' });

    const consulta = await request(app)
      .get('/api/citas')
      .set(
        'Authorization',
        `Bearer ${tokenDe(23, { email: 'doctor@tecnosalud.com.co', rol: 'MEDICO' })}`,
      );

    expect(consulta.status).toBe(200);
    expect(consulta.body).toHaveLength(1);
    expect(consulta.body[0].nombrePaciente).toBe('Ana Pérez');
    expect(consulta.body[0].doctorId).toBe('doctor-1');
  });

  it('rechaza la consulta si el médico no tiene una agenda asignada', async () => {
    const consulta = await request(app)
      .get('/api/citas')
      .set(
        'Authorization',
        `Bearer ${tokenDe(23, { email: 'otro.medico@tecnosalud.com.co', rol: 'MEDICO' })}`,
      );

    expect(consulta.status).toBe(403);
  });

  it('impide que un médico agende, cancele o reprograme citas', async () => {
    const cita = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nombrePaciente: 'Ana Pérez', doctorId: 'doctor-1', fecha: fechaCita, hora: '08:00' });
    const tokenDoctor = tokenDe(23, {
      email: 'doctor@tecnosalud.com.co',
      rol: 'MEDICO',
    });

    const asignacion = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({
        nombrePaciente: 'Otra persona',
        doctorId: 'doctor-1',
        fecha: fechaCita,
        hora: '08:30',
      });
    const cancelacion = await request(app)
      .patch(`/api/citas/${cita.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenDoctor}`);
    const reprogramacion = await request(app)
      .patch(`/api/citas/${cita.body.id}/reprogramar`)
      .set('Authorization', `Bearer ${tokenDoctor}`)
      .send({ hora: '08:30' });

    expect(asignacion.status).toBe(403);
    expect(cancelacion.status).toBe(403);
    expect(reprogramacion.status).toBe(403);

    const consultaPaciente = await request(app)
      .get('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(1)}`);
    expect(consultaPaciente.body[0]).toMatchObject({
      hora: '08:00',
      estado: 'programada',
    });
  });

  it('impide cancelar o reprogramar una cita de otro usuario', async () => {
    const asignacion = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nombrePaciente: 'Ana Pérez', doctorId: 'doctor-1', fecha: fechaCita, hora: '08:00' });

    const cancelacion = await request(app)
      .patch(`/api/citas/${asignacion.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenDe(2)}`);
    const reprogramacion = await request(app)
      .patch(`/api/citas/${asignacion.body.id}/reprogramar`)
      .set('Authorization', `Bearer ${tokenDe(2)}`)
      .send({ hora: '08:30' });

    expect(cancelacion.status).toBe(404);
    expect(reprogramacion.status).toBe(404);
  });

  it('libera el horario cuando se cancela una cita', async () => {
    const asignacion = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe()}`)
      .send({ nombrePaciente: 'Ana Pérez', doctorId: 'doctor-1', fecha: fechaCita, hora: '08:00' });
    const cancelacion = await request(app)
      .patch(`/api/citas/${asignacion.body.id}/cancelar`)
      .set('Authorization', `Bearer ${tokenDe()}`);
    expect(cancelacion.status).toBe(200);
    expect(cancelacion.body.estado).toBe('cancelada');

    const disponibilidad = await request(app)
      .get('/api/disponibilidad')
      .query({ fecha: fechaCita, doctorId: 'doctor-1' });
    expect(disponibilidad.body.horarios[0].disponible).toBe(true);
  });

  it('reprograma una cita y libera el horario anterior', async () => {
    const asignacion = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe()}`)
      .send({ nombrePaciente: 'Ana Pérez', doctorId: 'doctor-1', fecha: fechaCita, hora: '08:00' });
    const reprogramacion = await request(app)
      .patch(`/api/citas/${asignacion.body.id}/reprogramar`)
      .set('Authorization', `Bearer ${tokenDe()}`)
      .send({ hora: '08:30' });
    expect(reprogramacion.status).toBe(200);
    expect(reprogramacion.body.hora).toBe('08:30');

    const disponibilidad = await request(app)
      .get('/api/disponibilidad')
      .query({ fecha: fechaCita, doctorId: 'doctor-1' });
    expect(disponibilidad.body.horarios[0].disponible).toBe(true);
    expect(disponibilidad.body.horarios[1].disponible).toBe(false);
  });

  it('rechaza horarios fuera de jornada y fines de semana', async () => {
    const fueraDeJornada = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe()}`)
      .send({ nombrePaciente: 'Ana Pérez', doctorId: 'doctor-1', fecha: fechaCita, hora: '12:00' });
    expect(fueraDeJornada.status).toBe(400);

    const finDeSemana = new Date(`${fechaCita}T00:00:00.000Z`);
    while (finDeSemana.getUTCDay() !== 6) finDeSemana.setUTCDate(finDeSemana.getUTCDate() + 1);
    const citaFinDeSemana = await request(app)
      .post('/api/citas')
      .set('Authorization', `Bearer ${tokenDe()}`)
      .send({
        nombrePaciente: 'Ana Pérez',
        doctorId: 'doctor-1',
        fecha: finDeSemana.toISOString().slice(0, 10),
        hora: '08:00',
      });
    expect(citaFinDeSemana.status).toBe(400);
  });
});
