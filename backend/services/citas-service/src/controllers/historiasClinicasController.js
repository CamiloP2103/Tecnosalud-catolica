// src/controllers/historiasClinicasController.js
const { crearRepositorio, ErrorNegocio } = require('../repositorio');
const pool = require('../config/db');
const repo = crearRepositorio(pool);

// Registrar la atención completa del paciente
const registrarAtencionMedica = async (req, res) => {
  try {
    const resultado = await repo.registrarAtencionClinicaCompleta(req.body);
    return res.status(201).json({
      ok: true,
      mensaje: 'Atención médica registrada e historia clínica guardada exitosamente',
      historia_clinica_id: resultado.historia_clinica_id
    });
  } catch (error) {
    console.error('Error al registrar atención médica:', error);
    return res.status(500).json({ ok: false, error: 'No se pudo procesar la historia clínica y los documentos.' });
  }
};

// Consultar historial clínico de un paciente
const obtenerHistorialAfiliado = async (req, res) => {
  try {
    const { afiliado_id } = req.params;
    const historias = await repo.listarHistoriasPorAfiliado(afiliado_id);
    return res.json({ ok: true, historias });
  } catch (error) {
    console.error('Error al consultar historial:', error);
    return res.status(500).json({ ok: false, error: 'Error al consultar el historial clínico.' });
  }
};

// Ejemplo en tu controlador de historias
async function obtenerHistoriasPorMedico(req, res) {
  const { medicoId } = req.params;
  try {
    const historias = await repo.obtenerHistoriasPorMedico(medicoId);
    return res.json({ historias });
  } catch (error) {
    console.error('[citas-service] Error en controlador al obtener historial:', error);
    return res.status(500).json({ error: 'Error interno al obtener el historial clínico.' });
  }
}

// Obtener horarios del médico logueado
const obtenerHorarios = async (req, res) => {
  try {
    const { usuarioId } = req.params; // O podemos resolverlo buscando el medico_id por usuario_id
    const [medicoRows] = await pool.query('SELECT id FROM medicos WHERE usuario_id = ? LIMIT 1', [usuarioId]);

    if (medicoRows.length === 0) {
      return res.status(404).json({ ok: false, error: 'No se encontró el perfil de médico para este usuario.' });
    }

    const medicoId = medicoRows[0].id;
    const horarios = await repo.obtenerHorariosMedico(medicoId);
    return res.json({ ok: true, horarios, medicoId });
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    return res.status(500).json({ ok: false, error: 'Error interno al consultar los horarios.' });
  }
};

// Guardar/Actualizar horarios del médico
const actualizarHorarios = async (req, res) => {
  try {
    const { medicoId } = req.params;
    const { horarios } = req.body; // Array de { diaSemana, horaInicio, horaFin }

    const resultado = await repo.guardarHorariosMedico(medicoId, horarios);
    return res.json(resultado);
  } catch (error) {
    console.error('Error al guardar horarios:', error);
    return res.status(500).json({ ok: false, error: 'Error interno al actualizar los horarios.' });
  }
};

// Cancelar cita por inasistencia u otro motivo registrando motivo_cancelacion
const cancelarCitaMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const motivoCancelacion = req.body.motivo_cancelacion ?? req.body.motivoCancelacion ?? '';
    const medicoId = req.body.medico_id || req.body.medicoId || req.usuario?.id || null;

    const citaCancelada = await repo.cancelarCitaMedico(id, medicoId, motivoCancelacion);
    return res.json({
      ok: true,
      mensaje: 'Cita cancelada correctamente.',
      cita: citaCancelada
    });
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.status).json({ ok: false, error: error.message });
    }
    console.error('Error al cancelar cita desde el portal médico:', error);
    return res.status(500).json({ ok: false, error: 'Error interno al cancelar la cita.' });
  }
};

// Exportar correctamente después de declararlas
module.exports = {
  registrarAtencionMedica,
  obtenerHistorialAfiliado,
  obtenerHistoriasPorMedico,
  obtenerHorarios,
  actualizarHorarios,
  cancelarCitaMedico
};