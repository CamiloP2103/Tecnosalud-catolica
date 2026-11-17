// src/controllers/historiasClinicasController.js
const { crearRepositorio } = require('../repositorio');
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
    const historias = await repositorio.obtenerHistoriasPorMedico(medicoId);
    return res.json({ historias });
  } catch (error) {
    console.error('[citas-service] Error en controlador al obtener historial:', error);
    return res.status(500).json({ error: 'Error interno al obtener el historial clínico.' });
  }
}

// Exportar correctamente después de declararlas
module.exports = {
  registrarAtencionMedica,
  obtenerHistorialAfiliado,
  obtenerHistoriasPorMedico
};