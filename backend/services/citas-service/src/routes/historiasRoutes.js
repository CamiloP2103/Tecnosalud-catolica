const { Router } = require('express');
const router = Router();

// 1. Importar el controlador completo
const historiasController = require('../controllers/historiasClinicasController');

// 2. Extraer las funciones de forma segura
const {
  registrarAtencionMedica,
  obtenerHistorialAfiliado,
  obtenerHistoriasPorMedico,
  obtenerHorarios,
  actualizarHorarios,
  cancelarCitaMedico
} = historiasController;

// 3. Declarar las rutas usando las funciones definidas
router.post('/atencion', registrarAtencionMedica);
router.get('/afiliado/:afiliado_id', obtenerHistorialAfiliado);
router.get('/medico/:medicoId', obtenerHistoriasPorMedico);
router.get('/horarios/usuario/:usuarioId', obtenerHorarios);
router.post('/horarios/medico/:medicoId', actualizarHorarios);
router.patch('/:id/cancelar', cancelarCitaMedico);
router.patch('/citas/:id/cancelar', cancelarCitaMedico);

module.exports = router;