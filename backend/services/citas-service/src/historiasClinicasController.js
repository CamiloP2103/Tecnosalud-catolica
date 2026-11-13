const db = require('../config/db'); // Conexión a db_citas

// Registrar la atención completa del paciente (Historia Clínica + Documentos)
const registrarAtencionMedica = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      cita_id,
      afiliado_id,
      medico_id,
      motivo_consulta,
      enfermedad_actual,
      antecedentes,
      examen_fisico,
      diagnostico_principal,
      diagnostico_secundario,
      plan_manejo,
      observaciones,
      receta,        // Objeto opcional con { indicaciones_generales, detalles: [...] }
      incapacidad,   // Objeto opcional con { fecha_inicio, fecha_fin, dias, causa_externa }
      orden_proc,    // Objeto opcional con { tipo_procedimiento, descripcion_clinica, recomendaciones }
      certificado    // Objeto opcional con { tipo_certificado, contenido, validez_dias }
    } = req.body;

    // 1. Insertar la Historia Clínica
    const [resultHC] = await connection.query(
      `INSERT INTO historias_clinicas 
      (cita_id, afiliado_id, medico_id, motivo_consulta, enfermedad_actual, antecedentes, examen_fisico, diagnostico_principal, diagnostico_secundario, plan_manejo, observaciones) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cita_id, afiliado_id, medico_id, motivo_consulta, enfermedad_actual, antecedentes, examen_fisico, diagnostico_principal, diagnostico_secundario, plan_manejo, observaciones]
    );

    const historia_clinica_id = resultHC.insertId;

    // 2. Si hay Receta Médica, registrarla y sus detalles
    if (receta && receta.detalles && receta.detalles.length > 0) {
      const [resultReceta] = await connection.query(
        `INSERT INTO recetas_medicas (historia_clinica_id, afiliado_id, medico_id, indicaciones_generales) VALUES (?, ?, ?, ?)`,
        [historia_clinica_id, afiliado_id, medico_id, receta.indicaciones_generales || '']
      );
      const receta_id = resultReceta.insertId;

      for (const item of receta.detalles) {
        await connection.query(
          `INSERT INTO detalles_receta (receta_id, medicamento, concentracion, forma_farmaceutica, dosis, via_administracion, frecuencia, duracion_tratamiento, cantidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [receta_id, item.medicamento, item.concentracion, item.forma_farmaceutica, item.dosis, item.via_administracion, item.frecuencia, item.duracion_tratamiento, item.cantidad]
        );
      }
      
      // Registrar trazabilidad en documentos clínicos
      await connection.query(
        `INSERT INTO documentos_clinicos (afiliado_id, medico_id, tipo_documento, referencia_id) VALUES (?, ?, 'RECETA', ?)`,
        [afiliado_id, medico_id, receta_id]
      );
    }

    // 3. Si hay Incapacidad, registrarla
    if (incapacidad) {
      const [resultIncap] = await connection.query(
        `INSERT INTO incapacidades (historia_clinica_id, afiliado_id, medico_id, fecha_inicio, fecha_fin, dias, diagnostico, causa_externa, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [historia_clinica_id, afiliado_id, medico_id, incapacidad.fecha_inicio, incapacidad.fecha_fin, incapacidad.dias, diagnostico_principal, incapacidad.causa_externa || 'Enfermedad general', incapacidad.observaciones || '']
      );

      await connection.query(
        `INSERT INTO documentos_clinicos (afiliado_id, medico_id, tipo_documento, referencia_id) VALUES (?, ?, 'INCAPACIDAD', ?)`,
        [afiliado_id, medico_id, resultIncap.insertId]
      );
    }

    // 4. Si hay Orden de Procedimiento
    if (orden_proc) {
      const [resultOrd] = await connection.query(
        `INSERT INTO ordenes_procedimientos (historia_clinica_id, afiliado_id, medico_id, tipo_procedimiento, descripcion_clinica, recomendaciones) VALUES (?, ?, ?, ?, ?, ?)`,
        [historia_clinica_id, afiliado_id, medico_id, orden_proc.tipo_procedimiento, orden_proc.descripcion_clinica, orden_proc.recomendaciones || '']
      );

      await connection.query(
        `INSERT INTO documentos_clinicos (afiliado_id, medico_id, tipo_documento, referencia_id) VALUES (?, ?, 'ORDEN', ?)`,
        [afiliado_id, medico_id, resultOrd.insertId]
      );
    }

    // 5. Si hay Certificado Médico
    if (certificado) {
      const [resultCert] = await connection.query(
        `INSERT INTO certificados_medicos (historia_clinica_id, afiliado_id, medico_id, tipo_certificado, contenido, validez_dias) VALUES (?, ?, ?, ?, ?, ?)`,
        [historia_clinica_id, afiliado_id, medico_id, certificado.tipo_certificado, certificado.contenido, certificado.validez_dias || 30]
      );

      await connection.query(
        `INSERT INTO documentos_clinicos (afiliado_id, medico_id, tipo_documento, referencia_id) VALUES (?, ?, 'CERTIFICADO', ?)`,
        [afiliado_id, medico_id, resultCert.insertId]
      );
    }

    // Actualizar estado de la cita a 'ATENDIDA'
    await connection.query(`UPDATE citas SET estado = 'ATENDIDA' WHERE id = ?`, [cita_id]);

    await connection.commit();
    res.status(201).json({ ok: true, mensaje: 'Atención médica registrada e historia clínica guardada exitosamente', historia_clinica_id });

  } catch (error) {
    await connection.rollback();
    console.error('Error al registrar atención médica:', error);
    res.status(500).json({ ok: false, error: 'No se pudo procesar la historia clínica y los documentos.' });
  } finally {
    connection.release();
  }
};

// Consultar historial clínico de un paciente
const obtenerHistorialAfiliado = async (req, res) => {
  try {
    const { afiliado_id } = req.params;
    const [historias] = await db.query(
      `SELECT hc.*, m.nombres AS medico_nombres, m.apellidos AS medico_apellidos 
       FROM historias_clinicas hc
       JOIN medicos m ON hc.medico_id = m.id
       WHERE hc.afiliado_id = ? 
       ORDER BY hc.fecha_atencion DESC`,
      [afiliado_id]
    );
    res.json({ ok: true, historias });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Error al consultar el historial clínico.' });
  }
};

module.exports = {
  registrarAtencionMedica,
  obtenerHistorialAfiliado
};