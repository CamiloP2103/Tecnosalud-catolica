// Acceso a db_citas. Fechas y horas se devuelven como texto (AAAA-MM-DD y HH:MM) para evitar
// conversiones de zona horaria del driver de MySQL.

class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.status = status;
  }
}

const MAX_CITAS_ACTIVAS = 5;

const COLUMNAS_CITA = `c.id, DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha, TIME_FORMAT(c.hora, '%H:%i') AS hora,
  c.estado, c.motivo, c.usuario_id AS usuarioId, c.usuario_email AS usuarioEmail, c.usuario_doc AS usuarioDoc,
  m.id AS medicoId, m.nombre AS medico, e.nombre AS especialidad, s.nombre AS sede, s.zona AS sedeZona`;

const DESDE_CITA = `FROM citas c
  INNER JOIN medicos m ON m.id = c.medico_id
  INNER JOIN especialidades e ON e.id = m.especialidad_id
  INNER JOIN sedes s ON s.id = m.sede_id`;

function crearRepositorio(pool) {
  return {
    async listarEspecialidades() {
      const [filas] = await pool.query(
        `SELECT e.id, e.nombre, e.descripcion, e.duracion_min AS duracionMin, COUNT(m.id) AS medicos
         FROM especialidades e LEFT JOIN medicos m ON m.especialidad_id = e.id AND m.activo = TRUE
         WHERE e.activa = TRUE GROUP BY e.id ORDER BY e.nombre`
      );
      return filas.map((f) => ({ ...f, medicos: Number(f.medicos) }));
    },

    async listarSedes() {
      const [filas] = await pool.query('SELECT id, nombre, zona, municipio FROM sedes WHERE activa = TRUE ORDER BY nombre');
      return filas;
    },

    async listarMedicos({ especialidadId, sedeId, medicoId } = {}) {
      const condiciones = ['m.activo = TRUE'];
      const parametros = [];
      if (especialidadId) { condiciones.push('m.especialidad_id = ?'); parametros.push(especialidadId); }
      if (sedeId) { condiciones.push('m.sede_id = ?'); parametros.push(sedeId); }
      if (medicoId) { condiciones.push('m.id = ?'); parametros.push(medicoId); }
      const [filas] = await pool.query(
        `SELECT m.id, m.nombre, m.registro_medico AS registroMedico, e.id AS especialidadId, e.nombre AS especialidad,
                e.duracion_min, s.id AS sedeId, s.nombre AS sede, s.zona AS sedeZona
         FROM medicos m
         INNER JOIN especialidades e ON e.id = m.especialidad_id
         INNER JOIN sedes s ON s.id = m.sede_id
         WHERE ${condiciones.join(' AND ')} ORDER BY e.nombre, m.nombre`,
        parametros
      );
      return filas;
    },

    async horarios(medicoIds) {
      if (medicoIds.length === 0) return [];
      const [filas] = await pool.query(
        `SELECT medico_id, dia_semana, TIME_FORMAT(hora_inicio, '%H:%i') AS hora_inicio, TIME_FORMAT(hora_fin, '%H:%i') AS hora_fin
         FROM horarios WHERE medico_id IN (?)`,
        [medicoIds]
      );
      return filas;
    },

    async ocupadas(medicoIds, desde, hasta) {
      if (medicoIds.length === 0) return new Set();
      const [filas] = await pool.query(
        `SELECT medico_id, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, TIME_FORMAT(hora, '%H:%i') AS hora
         FROM citas WHERE estado = 'PROGRAMADA' AND medico_id IN (?) AND fecha BETWEEN ? AND ?`,
        [medicoIds, desde, hasta]
      );
      return new Set(filas.map((f) => `${f.medico_id}|${f.fecha}|${f.hora}`));
    },

    async crearCita({ usuario, medicoId, fecha, hora, motivo, hoy }) {
      const [[conteo]] = await pool.query(
        "SELECT COUNT(*) AS activas FROM citas WHERE usuario_id = ? AND estado = 'PROGRAMADA' AND fecha >= ?",
        [usuario.id, hoy]
      );
      if (Number(conteo.activas) >= MAX_CITAS_ACTIVAS) {
        throw new ErrorNegocio(409, `Ya tienes ${MAX_CITAS_ACTIVAS} citas programadas. Cancela una para reservar otra.`);
      }
      const [cruce] = await pool.query(
        "SELECT id FROM citas WHERE usuario_id = ? AND estado = 'PROGRAMADA' AND fecha = ? AND hora = ? LIMIT 1",
        [usuario.id, fecha, hora]
      );
      if (cruce.length > 0) throw new ErrorNegocio(409, 'Ya tienes otra cita programada a esa misma hora.');

      try {
        const [resultado] = await pool.query(
          `INSERT INTO citas (usuario_id, usuario_email, usuario_doc, medico_id, fecha, hora, motivo)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [usuario.id, usuario.email, usuario.doc || '', medicoId, fecha, hora, motivo]
        );
        return this.obtenerCita(resultado.insertId);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new ErrorNegocio(409, 'Ese horario acaba de ser reservado por otra persona. Elige otro.');
        }
        throw error;
      }
    },

    async obtenerCita(id) {
      const [filas] = await pool.query(`SELECT ${COLUMNAS_CITA} ${DESDE_CITA} WHERE c.id = ?`, [id]);
      return filas[0] || null;
    },

    async listarCitasUsuario(usuarioId) {
      const [filas] = await pool.query(
        `SELECT ${COLUMNAS_CITA} ${DESDE_CITA} WHERE c.usuario_id = ? ORDER BY c.fecha DESC, c.hora DESC LIMIT 100`,
        [usuarioId]
      );
      return filas;
    },

    // ➕ Listar citas asignadas a un médico específico (Soporta ID de médico o ID de usuario)
    async listarCitasMedico(medicoId) {
      const [filas] = await pool.query(
        `SELECT ${COLUMNAS_CITA} ${DESDE_CITA} WHERE (m.id = ? OR m.usuario_id = ?) ORDER BY c.fecha ASC, c.hora ASC LIMIT 200`,
        [medicoId, medicoId]
      );
      return filas;
    },

    async cancelarCita(id, usuarioId, ahora) {
      const cita = await this.obtenerCita(id);
      if (!cita || Number(cita.usuarioId) !== Number(usuarioId)) throw new ErrorNegocio(404, 'La cita no existe.');
      if (cita.estado !== 'PROGRAMADA') throw new ErrorNegocio(409, `Solo se pueden cancelar citas programadas (esta está ${cita.estado}).`);
      if (cita.fecha < ahora.fecha) throw new ErrorNegocio(409, 'La cita ya pasó.');
      await pool.query("UPDATE citas SET estado = 'CANCELADA' WHERE id = ?", [id]);
      return { ...cita, estado: 'CANCELADA' };
    },

    // ---- Administración ----
    async listarCitasAdmin({ desde, hasta, estado } = {}) {
      const condiciones = ['c.fecha BETWEEN ? AND ?'];
      const parametros = [desde, hasta];
      if (estado) { condiciones.push('c.estado = ?'); parametros.push(estado); }
      const [filas] = await pool.query(
        `SELECT ${COLUMNAS_CITA} ${DESDE_CITA} WHERE ${condiciones.join(' AND ')} ORDER BY c.fecha, c.hora LIMIT 300`,
        parametros
      );
      return filas;
    },

    async cambiarEstado(id, estado) {
      const cita = await this.obtenerCita(id);
      if (!cita) throw new ErrorNegocio(404, 'La cita no existe.');
      if (cita.estado !== 'PROGRAMADA') throw new ErrorNegocio(409, `La cita ya está ${cita.estado}; solo se cambian citas programadas.`);
      await pool.query('UPDATE citas SET estado = ? WHERE id = ?', [estado, id]);
      return { ...cita, estado };
    },

    async conteosPorEstado(desde, hasta) {
      const [filas] = await pool.query(
        'SELECT estado, COUNT(*) AS total FROM citas WHERE fecha BETWEEN ? AND ? GROUP BY estado',
        [desde, hasta]
      );
      return Object.fromEntries(filas.map((f) => [f.estado, Number(f.total)]));
    },

    // ---- Historias Clínicas y Documentos Médicos (Transaccionales) ----
    async registrarAtencionClinicaCompleta({
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
      receta,
      incapacidad,
      orden_proc,
      certificado
    }) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 1. Insertar la Historia Clínica
        const [resultHC] = await connection.query(
          `INSERT INTO historias_clinicas 
          (cita_id, afiliado_id, medico_id, motivo_consulta, enfermedad_actual, antecedentes, examen_fisico, diagnostico_principal, diagnostico_secundario, plan_manejo, observaciones) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cita_id, afiliado_id, medico_id, motivo_consulta, enfermedad_actual, antecedentes, examen_fisico, diagnostico_principal, diagnostico_secundario, plan_manejo, observaciones]
        );

        const historia_clinica_id = resultHC.insertId;

        // 2. Si hay Receta Médica
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

          await connection.query(
            `INSERT INTO documentos_clinicos (afiliado_id, medico_id, tipo_documento, referencia_id) VALUES (?, ?, 'RECETA', ?)`,
            [afiliado_id, medico_id, receta_id]
          );
        }

        // 3. Si hay Incapacidad
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
        return { historia_clinica_id };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async listarHistoriasPorAfiliado(afiliado_id) {
      const [filas] = await pool.query(
        `SELECT hc.*, m.nombres AS medico_nombres, m.apellidos AS medico_apellidos 
         FROM historias_clinicas hc
         JOIN medicos m ON hc.medico_id = m.id
         WHERE hc.afiliado_id = ? 
         ORDER BY hc.fecha_atencion DESC`,
        [afiliado_id]
      );
      return filas;
    },
    async obtenerHistoriasPorMedico(medicoId) {
      const [rows] = await pool.query(
        `SELECT h.*, a.nombre AS afiliado_nombre, a.documento AS afiliado_documento 
        FROM historias_clinicas h 
        INNER JOIN db_auth.usuarios a ON h.afiliado_id = a.id
        INNER JOIN medicos m ON m.id  = h.medico_id 
        WHERE m.usuario_id = ? ORDER BY h.fecha_atencion DESC`,
        [medicoId]
      );
      return rows;
    },

    // ---- Gestión de Horarios del Médico ----
    async obtenerHorariosMedico(medicoId) {
      const [filas] = await pool.query(
        `SELECT id, medico_id AS medicoId, dia_semana AS diaSemana, 
                TIME_FORMAT(hora_inicio, '%H:%i') AS horaInicio, 
                TIME_FORMAT(hora_fin, '%H:%i') AS horaFin 
         FROM horarios WHERE medico_id = ? ORDER BY (dia_semana)`,
        [medicoId]
      );
      const mapaDias = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' };

      return filas.map(f => ({
        ...f,
        diaSemana: mapaDias[f.diaSemana] || 'Lunes'
      }));
    },

    async guardarHorariosMedico(medicoId, horariosNuevos) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Por simplicidad en la configuración semanal, borramos los horarios anteriores del médico y reinsertamos los nuevos
        await connection.query(`DELETE FROM horarios WHERE medico_id = ?`, [medicoId]);

        const mapaInverso = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 7 };        

        if (horariosNuevos && horariosNuevos.length > 0) {
          for (const item of horariosNuevos) {
            const diaNum = mapaInverso[item.diaSemana] || Number(item.diaSemana) || 1;
            await connection.query(
              `INSERT INTO horarios (medico_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)`,
              [medicoId, diaNum, item.horaInicio, item.horaFin]
            );
          }
        }

        await connection.commit();
        return { ok: true, mensaje: 'Horarios actualizados correctamente.' };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
 
  };
}

module.exports = { crearRepositorio, ErrorNegocio, MAX_CITAS_ACTIVAS };