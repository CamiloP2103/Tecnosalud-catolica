const { Router } = require('express');
const router = Router();

// 1. Importar el controlador completo
const historiasController = require('../controllers/historiasClinicasController');

// 2. Extraer las funciones de forma segura
const { registrarAtencionMedica, obtenerHistorialAfiliado, obtenerHistoriasPorMedico } = historiasController;

// 3. Declarar las rutas usando las funciones definidas
router.post('/atencion', registrarAtencionMedica);
router.get('/afiliado/:afiliado_id', obtenerHistorialAfiliado);
router.get('/medico/:medicoId', obtenerHistoriasPorMedico);

module.exports = router;