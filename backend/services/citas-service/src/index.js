import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3003);
const JWT_SECRET = process.env.JWT_SECRET || 'tecnosalud_secret_jwt_key_2026';
const DOCTORES = [
  { id: 'doctor-1', nombre: 'Doctor de Prueba' },
  { id: 'doctor-2', nombre: 'Doctor 2' },
  { id: 'doctor-3', nombre: 'Doctor 3' },
  { id: 'doctor-4', nombre: 'Doctor 4' },
];
const DOCTOR_ID_POR_CORREO = {
  'doctor@tecnosalud.com.co': 'doctor-1',
};
const HORAS_ATENCION = [
  { inicio: 8, fin: 12 },
  { inicio: 14, fin: 18 },
];
const DURACION_CITA_MINUTOS = 30;
const app = express();
let citas = [];
let siguienteId = 1;

app.use(cors());
app.use(express.json());

function esDiaHabil(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return false;
  const fechaUtc = new Date(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(fechaUtc.getTime()) || fechaUtc.toISOString().slice(0, 10) !== fecha) return false;
  return fechaUtc.getUTCDay() > 0 && fechaUtc.getUTCDay() < 6;
}

function obtenerHorasDisponibles() {
  return HORAS_ATENCION.flatMap(({ inicio, fin }) => {
    const horas = [];
    for (let minutos = inicio * 60; minutos < fin * 60; minutos += DURACION_CITA_MINUTOS) {
      const hora = String(Math.floor(minutos / 60)).padStart(2, '0');
      const minuto = String(minutos % 60).padStart(2, '0');
      horas.push(`${hora}:${minuto}`);
    }
    return horas;
  });
}

function esHorarioValido(fecha, hora) {
  return esDiaHabil(fecha) && obtenerHorasDisponibles().includes(hora);
}

function estaOcupado({ doctorId, fecha, hora, excluirId }) {
  return citas.some((cita) => (
    cita.id !== excluirId
    && cita.estado === 'programada'
    && cita.doctorId === doctorId
    && cita.fecha === fecha
    && cita.hora === hora
  ));
}

function obtenerDisponibilidad(doctorId, fecha) {
  return obtenerHorasDisponibles().map((hora) => ({
    hora,
    disponible: !estaOcupado({ doctorId, fecha, hora }),
  }));
}

function responderError(res, status, error) {
  return res.status(status).json({ error });
}

function obtenerDoctorAsignado(usuario) {
  if (usuario.rol !== 'MEDICO' || typeof usuario.email !== 'string') return null;
  const doctorId = DOCTOR_ID_POR_CORREO[usuario.email.toLowerCase()];
  return DOCTORES.find((doctor) => doctor.id === doctorId) || null;
}

function verificarToken(req, res, next) {
  const [esquema, token] = (req.get('authorization') || '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return responderError(res, 401, 'Se requiere un token de acceso');
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    if (!req.usuario.id) return responderError(res, 401, 'El token no identifica un usuario');
    return next();
  } catch {
    return responderError(res, 401, 'El token de acceso no es válido');
  }
}

app.get('/health', (req, res) => {
  res.json({ servicio: 'citas-service', estado: 'activo' });
});

app.get('/api/doctores', (req, res) => {
  res.json(DOCTORES);
});

app.get('/api/disponibilidad', (req, res) => {
  const { fecha, doctorId } = req.query;
  if (!esDiaHabil(fecha)) {
    return responderError(res, 400, 'La fecha debe ser un día hábil válido en formato AAAA-MM-DD');
  }

  if (doctorId) {
    const doctor = DOCTORES.find((item) => item.id === doctorId);
    if (!doctor) return responderError(res, 404, 'El doctor no existe');
    return res.json({ fecha, doctor, horarios: obtenerDisponibilidad(doctorId, fecha) });
  }

  return res.json({
    fecha,
    doctores: DOCTORES.map((doctor) => ({
      doctor,
      horarios: obtenerDisponibilidad(doctor.id, fecha),
    })),
  });
});

app.get('/api/citas', verificarToken, (req, res) => {
  const { fecha, doctorId } = req.query;
  if (req.usuario.rol === 'MEDICO') {
    const doctor = obtenerDoctorAsignado(req.usuario);
    if (!doctor) return responderError(res, 403, 'No tienes un médico asignado para consultar citas');

    const citasAsignadas = citas.filter((cita) => (
      cita.doctorId === doctor.id
      && (!fecha || cita.fecha === fecha)
      && (!doctorId || doctor.id === doctorId)
    ));
    return res.json(citasAsignadas);
  }

  const resultado = citas.filter((cita) => (
    cita.usuarioId === req.usuario.id
    &&
    (!fecha || cita.fecha === fecha)
    && (!doctorId || cita.doctorId === doctorId)
  ));
  res.json(resultado);
});

app.post('/api/citas', verificarToken, (req, res) => {
  if (req.usuario.rol === 'MEDICO') {
    return responderError(res, 403, 'Los médicos no pueden agendar citas');
  }

  const nombrePaciente = typeof req.body?.nombrePaciente === 'string'
    ? req.body.nombrePaciente.trim()
    : '';
  const { doctorId, fecha, hora } = req.body || {};

  if (!nombrePaciente || !doctorId || !fecha || !hora) {
    return responderError(res, 400, 'nombrePaciente, doctorId, fecha y hora son obligatorios');
  }

  const doctor = DOCTORES.find((item) => item.id === doctorId);
  if (!doctor) return responderError(res, 404, 'El doctor no existe');
  if (!esHorarioValido(fecha, hora)) {
    return responderError(res, 400, 'La cita debe ser en día hábil y dentro del horario disponible');
  }
  if (estaOcupado({ doctorId, fecha, hora })) {
    return responderError(res, 409, 'El horario ya está ocupado para este doctor');
  }

  const cita = {
    id: siguienteId++,
    usuarioId: req.usuario.id,
    nombrePaciente,
    doctorId,
    nombreDoctor: doctor.nombre,
    fecha,
    hora,
    estado: 'programada',
  };
  citas.push(cita);
  return res.status(201).json(cita);
});

app.patch('/api/citas/:id/cancelar', verificarToken, (req, res) => {
  if (req.usuario.rol === 'MEDICO') {
    return responderError(res, 403, 'Los médicos no pueden modificar citas');
  }

  const cita = citas.find((item) => item.id === Number(req.params.id) && item.usuarioId === req.usuario.id);
  if (!cita) return responderError(res, 404, 'La cita no existe');
  if (cita.estado === 'cancelada') return responderError(res, 409, 'La cita ya está cancelada');

  cita.estado = 'cancelada';
  return res.json(cita);
});

app.patch('/api/citas/:id/reprogramar', verificarToken, (req, res) => {
  if (req.usuario.rol === 'MEDICO') {
    return responderError(res, 403, 'Los médicos no pueden modificar citas');
  }

  const cita = citas.find((item) => item.id === Number(req.params.id) && item.usuarioId === req.usuario.id);
  if (!cita) return responderError(res, 404, 'La cita no existe');
  if (cita.estado !== 'programada') return responderError(res, 409, 'Solo se pueden reprogramar citas activas');

  const doctorId = req.body?.doctorId ?? cita.doctorId;
  const fecha = req.body?.fecha ?? cita.fecha;
  const hora = req.body?.hora ?? cita.hora;
  const doctor = DOCTORES.find((item) => item.id === doctorId);

  if (!doctor) return responderError(res, 404, 'El doctor no existe');
  if (!esHorarioValido(fecha, hora)) {
    return responderError(res, 400, 'La cita debe ser en día hábil y dentro del horario disponible');
  }
  if (estaOcupado({ doctorId, fecha, hora, excluirId: cita.id })) {
    return responderError(res, 409, 'El horario ya está ocupado para este doctor');
  }

  cita.doctorId = doctorId;
  cita.nombreDoctor = doctor.nombre;
  cita.fecha = fecha;
  cita.hora = hora;
  return res.json(cita);
});

export function resetCitas() {
  citas = [];
  siguienteId = 1;
}

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => console.log(`Citas Service activo en http://localhost:${PORT}`));
}