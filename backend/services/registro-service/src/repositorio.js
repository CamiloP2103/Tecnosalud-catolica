// Acceso a db_registro: catálogos colombianos, afiliados e historial de estados.

class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.status = status;
  }
}

const DIEZ_MINUTOS = 10 * 60 * 1000;
const ESTADOS = ['PENDIENTE', 'ACTIVO', 'RECHAZADO'];

const COLUMNAS_AFILIADO = `a.id, a.nombres, a.apellidos, 
  COALESCE(a.tipo_documento_codigo, 'SD') AS tipoDocumento, 
  COALESCE(td.nombre, 'Sin documento') AS tipoDocumentoNombre,
  a.documento, DATE_FORMAT(a.fecha_nacimiento, '%Y-%m-%d') AS fechaNacimiento, 
  COALESCE(g.nombre, 'Sin género') AS genero, a.correo, a.telefono,
  a.direccion, m.codigo AS municipioCodigo, 
  COALESCE(m.nombre, 'Sin municipio') AS municipio, 
  COALESCE(d.nombre, 'Sin departamento') AS departamento,
  COALESCE(ta.nombre, 'Sin tipo') AS tipoAfiliacion, 
  COALESCE(e.nombre, 'Sin EPS') AS eps, 
  COALESCE(r.nombre, 'Sin régimen') AS regimen,
  a.contacto_emergencia_nombre AS contactoEmergenciaNombre, a.contacto_emergencia_telefono AS contactoEmergenciaTelefono,
  COALESCE(p.nombre, 'Sin parentesco') AS contactoEmergenciaParentesco, 
  a.estado, a.creado_en AS creadoEn`;

const DESDE_AFILIADO = `FROM afiliados a
  LEFT JOIN tipos_documento td ON td.codigo = a.tipo_documento_codigo
  LEFT JOIN generos g ON g.codigo = a.genero_codigo
  LEFT JOIN municipios m ON m.codigo = a.municipio_codigo
  LEFT JOIN departamentos d ON d.codigo = m.departamento_codigo
  LEFT JOIN tipos_afiliacion ta ON ta.codigo = a.tipo_afiliacion_codigo
  LEFT JOIN eps e ON e.codigo = a.eps_codigo
  LEFT JOIN regimenes r ON r.codigo = a.regimen_codigo
  LEFT JOIN parentescos p ON p.codigo = a.contacto_emergencia_parentesco_codigo`;

function crearRepositorio(pool, { reloj = () => Date.now() } = {}) {
  let cache = null;

  return {
    /**
     * Catálogos para el formulario y para validar. Se guardan en memoria 10 minutos porque casi no cambian.
     * Devuelve { listas, validos }: `listas` para el navegador y `validos` (Sets de códigos) para validar.
     */
    async catalogos() {
      if (cache && reloj() - cache.cargado < DIEZ_MINUTOS) return cache.valor;
      const consulta = async (sql) => (await pool.query(sql))[0];
      const [tiposDocumento, generos, departamentos, municipios, eps, regimenes, tiposAfiliacion, parentescos] = await Promise.all([
        consulta('SELECT codigo, nombre, descripcion FROM tipos_documento ORDER BY FIELD(codigo, "CC", "TI", "RC", "CE", "PA", "PPT")'),
        consulta('SELECT codigo, nombre FROM generos ORDER BY nombre'),
        consulta('SELECT codigo, nombre FROM departamentos ORDER BY nombre'),
        consulta('SELECT codigo, nombre, departamento_codigo AS departamento FROM municipios ORDER BY nombre'),
        consulta('SELECT codigo, nombre FROM eps WHERE activa = TRUE ORDER BY codigo IN ("REGIMEN_EXCEPCION", "NINGUNA"), nombre'),
        consulta('SELECT codigo, nombre, descripcion FROM regimenes'),
        consulta('SELECT codigo, nombre FROM tipos_afiliacion'),
        consulta('SELECT codigo, nombre FROM parentescos'),
      ]);
      const codigos = (filas) => new Set(filas.map((f) => f.codigo));
      const valor = {
        listas: {
          tiposDocumento,
          generos,
          // Departamentos con sus municipios, con comparación robusta de tipos y espacios
          departamentos: departamentos.map((d) => ({
            ...d,
            municipios: municipios
              .filter((m) => String(m.departamento || '').trim() === String(d.codigo || '').trim())
              .map(({ codigo, nombre }) => ({ codigo, nombre })),
          })).filter((d) => d.municipios.length > 0),
          eps,
          regimenes,
          tiposAfiliacion,
          parentescos,
        },
        validos: {
          tiposDocumento: codigos(tiposDocumento),
          generos: codigos(generos),
          municipios: codigos(municipios),
          eps: codigos(eps),
          regimenes: codigos(regimenes),
          tiposAfiliacion: codigos(tiposAfiliacion),
          parentescos: codigos(parentescos),
        },
      };
// ---- COLOCA ESTO TEMPORALMENTE AQUÍ ----
      console.log('[DEBUG CATALOGOS] Primer departamento:', departamentos[0]);
      console.log('[DEBUG CATALOGOS] Primer municipio:', municipios[0]);
      console.log('[DEBUG CATALOGOS] Resultado mapeado:', JSON.stringify(valor.listas.departamentos[0], null, 2));
      // ----------------------------------------

      cache = { valor, cargado: reloj() };
      return valor;
    },

    async crearAfiliado(datos) {
      try {
        if (!datos) {
          throw new ErrorNegocio(400, 'No se recibieron datos para el registro.');
        }

        // Extracción estricta de códigos
        const tipoDoc = datos.tipoDocumentoCodigo || datos.tipoDocumento || null;
        const documento = datos.documento || null;
        const fechaNacimiento = datos.fechaNacimiento || null;
        const genero = datos.generoCodigo || datos.genero || null;
        const correo = datos.correo || null;
        const telefono = datos.telefono || null;
        const direccion = datos.direccion || null;
        
        // --- BLINDAJE ABSOLUTO PARA MUNICIPIO ---
        // Si por alguna razón el frontend mandó un texto largo en lugar de un código corto, 
        // lo cortamos de emergencia a máximo 10 caracteres para que nunca vuelva a dar ER_DATA_TOO_LONG.
        let municipio = datos.municipioCodigo || datos.municipio || datos.ciudad || null;
        if (municipio && typeof municipio === 'string' && municipio.length > 10) {
          console.erta?.(`[ALERTA] municipio_codigo recibió un texto largo inesperado: "${municipio}". Se ignorará o recortará.`);
          municipio = null; 
        }

        const tipoAfiliacion = datos.tipoAfiliacionCodigo || datos.tipoAfiliacion || null;
        const eps = datos.epsCodigo || datos.eps || null;
        const regimen = datos.regimenCodigo || datos.regimen || null;
        
        const regimenTexto = regimen ? String(regimen).trim().toUpperCase() : '';
        const esContributivo = regimenTexto === 'CONTRIBUTIVO';
        const salarioGuardar = esContributivo && datos.salario !== undefined && datos.salario !== null && String(datos.salario).trim() !== ''
          ? Number(datos.salario)
          : null;

        const contactoNombre = datos.contactoEmergenciaNombre || null;
        const contactoTelefono = datos.contactoEmergenciaTelefono || null;
        const parentesco = datos.contactoEmergenciaParentescoCodigo || datos.contactoEmergenciaParentesco || null;

        const parametros = [
          datos.nombres || null,                  // 1
          datos.apellidos || null,                // 2
          tipoDoc,                                // 3 -> tipo_documento_codigo
          documento,                              // 4 -> documento
          fechaNacimiento,                        // 5 -> fecha_nacimiento
          genero,                                 // 6 -> genero_codigo
          correo,                                 // 7 -> correo
          telefono,                               // 8 -> telefono
          direccion,                              // 9 -> direccion
          municipio,                              // 10 -> municipio_codigo
          tipoAfiliacion,                         // 11 -> tipo_afiliacion_codigo
          eps,                                    // 12 -> eps_codigo
          regimen,                                // 13 -> regimen_codigo
          salarioGuardar,                         // 14 -> salario
          contactoNombre,                         // 15 -> contacto_emergencia_nombre
          contactoTelefono,                       // 16 -> contacto_emergencia_telefono
          parentesco                              // 17 -> contacto_emergencia_parentesco_codigo
        ];

        const parametrosSeguros = parametros.map(valor => (valor === undefined || valor === '' ? null : valor));

        // LOG DE DEPURACIÓN DEFINITIVA: Imprime en consola exactamente qué se va a insertar y en qué orden
        console.log('[DEBUG-REGISTRO] Parámetros listos para INSERT:', JSON.stringify(parametrosSeguros, null, 2));

        const [resultado] = await pool.execute(
          `INSERT INTO afiliados
            (nombres, apellidos, tipo_documento_codigo, documento, fecha_nacimiento, genero_codigo, correo, telefono,
             direccion, municipio_codigo, tipo_afiliacion_codigo, eps_codigo, regimen_codigo, salario,
             contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco_codigo, acepta_tratamiento_datos, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'PENDIENTE')`,
          parametrosSeguros
        );

        return resultado.insertId;
      } catch (error) {
        console.error('[ERROR-SQL-INSERT]', error);
        if (error.code === 'ER_DUP_ENTRY') throw new ErrorNegocio(409, 'El correo o el documento ya está registrado.');
        throw error;
      }
    },

    // ---- Administración ----
    async resumen() {
      const [[totales]] = await pool.query(
        `SELECT COUNT(*) AS total,
                SUM(estado = 'PENDIENTE') AS pendientes, SUM(estado = 'ACTIVO') AS activos, SUM(estado = 'RECHAZADO') AS rechazados,
                SUM(creado_en >= NOW() - INTERVAL 7 DAY) AS ultimos7Dias
         FROM afiliados`
      );
      const agrupar = async (columna, tabla, union) => (await pool.query(
        `SELECT c.nombre, COUNT(a.id) AS total FROM afiliados a LEFT JOIN ${tabla} c ON ${union}
         GROUP BY c.nombre ORDER BY total DESC, c.nombre LIMIT 10`
      ))[0].map((f) => ({ nombre: f.nombre, total: Number(f.total) }));
      const [porEps, porRegimen, porTipoAfiliacion, porDepartamento] = await Promise.all([
        agrupar('eps', 'eps', 'c.codigo = a.eps_codigo'),
        agrupar('regimen', 'regimenes', 'c.codigo = a.regimen_codigo'),
        agrupar('tipo', 'tipos_afiliacion', 'c.codigo = a.tipo_afiliacion_codigo'),
        (async () => (await pool.query(
          `SELECT d.nombre, COUNT(a.id) AS total FROM afiliados a
           LEFT JOIN municipios m ON m.codigo = a.municipio_codigo
           LEFT JOIN departamentos d ON d.codigo = m.departamento_codigo
           GROUP BY d.nombre ORDER BY total DESC LIMIT 10`
        ))[0].map((f) => ({ nombre: f.nombre, total: Number(f.total) })))(),
      ]);
      const numero = (v) => Number(v || 0);
      return {
        total: numero(totales.total),
        pendientes: numero(totales.pendientes),
        activos: numero(totales.activos),
        rechazados: numero(totales.rechazados),
        ultimos7Dias: numero(totales.ultimos7Dias),
        porEps,
        porRegimen,
        porTipoAfiliacion,
        porDepartamento,
      };
    },

    async listarAfiliados({ estado, buscar, limite = 50 } = {}) {
      const condiciones = [];
      const parametros = [];
      
      if (estado) { 
        condiciones.push('a.estado = ?'); 
        parametros.push(estado); 
      }
      
      if (buscar) {
        condiciones.push('(a.nombres LIKE ? OR a.apellidos LIKE ? OR a.documento LIKE ? OR a.correo LIKE ?)');
        const patron = `%${buscar.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        parametros.push(patron, patron, patron, patron);
      }
      
      // Eliminamos el parametros.push(limite) para evitar el bug de mysql2
      // e inyectamos Number(limite) directamente en la cadena SQL de forma segura.
      
      const [filas] = await pool.query(
        `SELECT ${COLUMNAS_AFILIADO} ${DESDE_AFILIADO}
         ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
         ORDER BY a.creado_en DESC, a.id DESC LIMIT ${Number(limite)}`,
        parametros
      );
      
      return filas;
    },

    async cambiarEstado(id, estadoNuevo, { cambiadoPor, observacion }) {
      if (!ESTADOS.includes(estadoNuevo)) throw new ErrorNegocio(400, `Estado inválido. Usa: ${ESTADOS.join(', ')}.`);
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        const [filas] = await conexion.query('SELECT estado FROM afiliados WHERE id = ? FOR UPDATE', [id]);
        if (filas.length === 0) throw new ErrorNegocio(404, 'El afiliado no existe.');
        const estadoAnterior = filas[0].estado;
        if (estadoAnterior === estadoNuevo) throw new ErrorNegocio(409, `El afiliado ya está ${estadoNuevo}.`);
        await conexion.query('UPDATE afiliados SET estado = ? WHERE id = ?', [estadoNuevo, id]);
        await conexion.query(
          'INSERT INTO historial_estados (afiliado_id, estado_anterior, estado_nuevo, cambiado_por, observacion) VALUES (?, ?, ?, ?, ?)',
          [id, estadoAnterior, estadoNuevo, cambiadoPor, observacion || null]
        );
        await conexion.commit();
        return { id, estadoAnterior, estado: estadoNuevo };
      } catch (error) {
        await conexion.rollback();
        throw error;
      } finally {
        conexion.release();
      }
    },

    async historial(id) {
      const [filas] = await pool.query(
        `SELECT estado_anterior AS estadoAnterior, estado_nuevo AS estadoNuevo, cambiado_por AS cambiadoPor, observacion, creado_en AS creadoEn
         FROM historial_estados WHERE afiliado_id = ? ORDER BY creado_en DESC, id DESC`,
        [id]
      );
      return filas;
    },
  };
}

module.exports = { crearRepositorio, ErrorNegocio, ESTADOS };