const express = require('express');
const router = express.Router();
const { registrarAtencionMedica, obtenerHistorialAfiliado } = require('../controllers/historiasClinicasController');

// Endpoint para guardar la historia clínica y emitir documentos en la consulta
router.post('/atencion', registrarAtencionMedica);

// Endpoint para consultar las historias clínicas de un paciente específico
router.get('/afiliado/:afiliado_id', obtenerHistorialAfiliado);

module.exports = router;