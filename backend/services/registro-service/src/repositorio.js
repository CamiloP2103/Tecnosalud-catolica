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

const COLUMNAS_AFILIADO = `a.id, a.nombres, a.apellidos, a.tipo_documento_codigo AS tipoDocumento, td.nombre AS tipoDocumentoNombre,
  a.documento, DATE_FORMAT(a.fecha_nacimiento, '%Y-%m-%d') AS fechaNacimiento, g.nombre AS genero, a.correo, a.telefono,
  a.direccion, m.codigo AS municipioCodigo, m.nombre AS municipio, d.nombre AS departamento,
  ta.nombre AS tipoAfiliacion, e.nombre AS eps, r.nombre AS regimen,
  a.contacto_emergencia_nombre AS contactoEmergenciaNombre, a.contacto_emergencia_telefono AS contactoEmergenciaTelefono,
  p.nombre AS contactoEmergenciaParentesco, a.estado, a.creado_en AS creadoEn`;

const DESDE_AFILIADO = `FROM afiliados a
  INNER JOIN tipos_documento td ON td.codigo = a.tipo_documento_codigo
  INNER JOIN generos g ON g.codigo = a.genero_codigo
  INNER JOIN municipios m ON m.codigo = a.municipio_codigo
  INNER JOIN departamentos d ON d.codigo = m.departamento_codigo
  INNER JOIN tipos_afiliacion ta ON ta.codigo = a.tipo_afiliacion_codigo
  INNER JOIN eps e ON e.codigo = a.eps_codigo
  INNER JOIN regimenes r ON r.codigo = a.regimen_codigo
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
          // Departamentos con sus municipios, para la lista dependiente del formulario
          departamentos: departamentos.map((d) => ({
            ...d,
            municipios: municipios.filter((m) => m.departamento === d.codigo).map(({ codigo, nombre }) => ({ codigo, nombre })),
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
      cache = { valor, cargado: reloj() };
      return valor;
    },

    async crearAfiliado(datos) {
      try {
        const [resultado] = await pool.execute(
          `INSERT INTO afiliados
            (nombres, apellidos, tipo_documento_codigo, documento, fecha_nacimiento, genero_codigo, correo, telefono,
             direccion, municipio_codigo, tipo_afiliacion_codigo, eps_codigo, regimen_codigo,
             contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco_codigo,
             acepta_tratamiento_datos)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            datos.nombres, datos.apellidos, datos.tipoDocumento, datos.documento, datos.fechaNacimiento,
            datos.genero, datos.correo, datos.telefono, datos.direccion, datos.municipio,
            datos.tipoAfiliacion, datos.eps, datos.regimen,
            datos.contactoEmergenciaNombre, datos.contactoEmergenciaTelefono, datos.contactoEmergenciaParentesco,
          ]
        );
        return resultado.insertId;
      } catch (error) {
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
        `SELECT c.nombre, COUNT(a.id) AS total FROM afiliados a INNER JOIN ${tabla} c ON ${union}
         GROUP BY c.nombre ORDER BY total DESC, c.nombre LIMIT 10`
      ))[0].map((f) => ({ nombre: f.nombre, total: Number(f.total) }));
      const [porEps, porRegimen, porTipoAfiliacion, porDepartamento] = await Promise.all([
        agrupar('eps', 'eps', 'c.codigo = a.eps_codigo'),
        agrupar('regimen', 'regimenes', 'c.codigo = a.regimen_codigo'),
        agrupar('tipo', 'tipos_afiliacion', 'c.codigo = a.tipo_afiliacion_codigo'),
        (async () => (await pool.query(
          `SELECT d.nombre, COUNT(a.id) AS total FROM afiliados a
           INNER JOIN municipios m ON m.codigo = a.municipio_codigo
           INNER JOIN departamentos d ON d.codigo = m.departamento_codigo
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
      if (estado) { condiciones.push('a.estado = ?'); parametros.push(estado); }
      if (buscar) {
        condiciones.push('(a.nombres LIKE ? OR a.apellidos LIKE ? OR a.documento LIKE ? OR a.correo LIKE ?)');
        const patron = `%${buscar.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        parametros.push(patron, patron, patron, patron);
      }
      parametros.push(limite);
      const [filas] = await pool.query(
        `SELECT ${COLUMNAS_AFILIADO} ${DESDE_AFILIADO}
         ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
         ORDER BY a.creado_en DESC, a.id DESC LIMIT ?`,
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
