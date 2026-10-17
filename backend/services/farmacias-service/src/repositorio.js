// Acceso a db_farmacias. Todas las consultas usan parámetros (?) para evitar inyección SQL.

class ErrorNegocio extends Error {
  constructor(status, mensaje, detalle) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.status = status;
    this.detalle = detalle;
  }
}

// mysql2 devuelve DECIMAL como texto y BOOLEAN como 0/1: se normalizan para el JSON de respuesta
const numero = (v) => (v === null || v === undefined ? null : Number(v));
const booleano = (v) => Boolean(Number(v));

function medicamentoDesdeFila(f) {
  return {
    id: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    concentracion: f.concentracion,
    formaFarmaceutica: f.forma_farmaceutica,
    presentacion: f.presentacion,
    categoria: f.categoria,
    requiereFormula: booleano(f.requiere_formula),
    controlEspecial: booleano(f.control_especial),
    precioReferencia: numero(f.precio_referencia),
    descripcion: f.descripcion,
  };
}

function farmaciaDesdeFila(f) {
  return {
    id: f.id,
    codigo: f.codigo,
    nombre: f.nombre,
    cadena: f.cadena,
    direccion: f.direccion,
    localidad: f.localidad,
    municipio: f.municipio,
    horario: f.horario,
    abierta24h: booleano(f.abierta_24h),
  };
}

// Escapa los comodines de LIKE para que la búsqueda sea literal
const patronBusqueda = (texto) => `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function crearRepositorio(pool) {
  async function enTransaccion(trabajo) {
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const resultado = await trabajo(conexion);
      await conexion.commit();
      return resultado;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  return {
    async listarMedicamentos({ buscar, categoria, requiereFormula } = {}) {
      const condiciones = ['m.activo = TRUE'];
      const parametros = [];
      if (buscar) {
        condiciones.push('(m.nombre LIKE ? OR m.descripcion LIKE ?)');
        parametros.push(patronBusqueda(buscar), patronBusqueda(buscar));
      }
      if (categoria) {
        condiciones.push('m.categoria = ?');
        parametros.push(categoria);
      }
      if (typeof requiereFormula === 'boolean') {
        condiciones.push('m.requiere_formula = ?');
        parametros.push(requiereFormula);
      }

      const [filas] = await pool.query(
        `SELECT m.*,
                COALESCE(SUM(i.cantidad), 0) AS unidades_disponibles,
                COUNT(CASE WHEN i.cantidad > 0 THEN 1 END) AS farmacias_con_existencias
         FROM medicamentos m
         LEFT JOIN inventario i
           ON i.medicamento_id = m.id
          AND i.farmacia_id IN (SELECT id FROM farmacias WHERE activa = TRUE)
         WHERE ${condiciones.join(' AND ')}
         GROUP BY m.id
         ORDER BY m.nombre, m.concentracion`,
        parametros
      );
      return filas.map((f) => ({
        ...medicamentoDesdeFila(f),
        unidadesDisponibles: numero(f.unidades_disponibles),
        farmaciasConExistencias: numero(f.farmacias_con_existencias),
      }));
    },

    async listarCategorias() {
      const [filas] = await pool.query(
        `SELECT categoria, COUNT(*) AS total
         FROM medicamentos WHERE activo = TRUE
         GROUP BY categoria ORDER BY categoria`
      );
      return filas.map((f) => ({ categoria: f.categoria, total: numero(f.total) }));
    },

    async obtenerMedicamento(id) {
      const [filas] = await pool.query('SELECT * FROM medicamentos WHERE id = ? AND activo = TRUE', [id]);
      if (filas.length === 0) return null;

      const [disponibilidad] = await pool.query(
        `SELECT f.*, i.cantidad, i.precio
         FROM inventario i
         INNER JOIN farmacias f ON f.id = i.farmacia_id
         WHERE i.medicamento_id = ? AND f.activa = TRUE
         ORDER BY (i.cantidad > 0) DESC, i.precio, f.nombre`,
        [id]
      );
      return {
        ...medicamentoDesdeFila(filas[0]),
        disponibilidad: disponibilidad.map((f) => ({
          farmacia: farmaciaDesdeFila(f),
          cantidad: numero(f.cantidad),
          precio: numero(f.precio),
        })),
      };
    },

    async obtenerMedicamentosPorIds(ids) {
      if (ids.length === 0) return [];
      const [filas] = await pool.query(
        'SELECT id, nombre, requiere_formula, control_especial, activo FROM medicamentos WHERE id IN (?)',
        [ids]
      );
      return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        requiere_formula: booleano(f.requiere_formula),
        control_especial: booleano(f.control_especial),
        activo: booleano(f.activo),
      }));
    },

    async listarFarmacias({ municipio } = {}) {
      const condiciones = ['f.activa = TRUE'];
      const parametros = [];
      if (municipio) {
        condiciones.push('f.municipio = ?');
        parametros.push(municipio);
      }
      const [filas] = await pool.query(
        `SELECT f.*, COUNT(CASE WHEN i.cantidad > 0 THEN 1 END) AS medicamentos_disponibles
         FROM farmacias f
         LEFT JOIN inventario i ON i.farmacia_id = f.id
         WHERE ${condiciones.join(' AND ')}
         GROUP BY f.id
         ORDER BY (f.municipio = 'Bogotá D.C.') DESC, f.municipio, f.nombre`,
        parametros
      );
      return filas.map((f) => ({
        ...farmaciaDesdeFila(f),
        medicamentosDisponibles: numero(f.medicamentos_disponibles),
      }));
    },

    async obtenerFarmacia(id) {
      const [filas] = await pool.query('SELECT * FROM farmacias WHERE id = ? AND activa = TRUE', [id]);
      return filas.length > 0 ? farmaciaDesdeFila(filas[0]) : null;
    },

    async inventarioFarmacia(farmaciaId, { buscar, categoria, soloDisponibles } = {}) {
      const condiciones = ['i.farmacia_id = ?', 'm.activo = TRUE'];
      const parametros = [farmaciaId];
      if (buscar) {
        condiciones.push('m.nombre LIKE ?');
        parametros.push(patronBusqueda(buscar));
      }
      if (categoria) {
        condiciones.push('m.categoria = ?');
        parametros.push(categoria);
      }
      if (soloDisponibles) condiciones.push('i.cantidad > 0');

      const [filas] = await pool.query(
        `SELECT m.*, i.cantidad, i.precio
         FROM inventario i
         INNER JOIN medicamentos m ON m.id = i.medicamento_id
         WHERE ${condiciones.join(' AND ')}
         ORDER BY m.nombre, m.concentracion`,
        parametros
      );
      return filas.map((f) => ({
        medicamento: medicamentoDesdeFila(f),
        cantidad: numero(f.cantidad),
        precio: numero(f.precio),
      }));
    },

    // Descuenta existencias y registra la solicitud en una sola transacción.
    // FOR UPDATE bloquea las filas de inventario para que dos solicitudes simultáneas no vendan
    // las mismas unidades.
    async crearSolicitud({ usuario, farmaciaId, items, formula, observaciones }) {
      return enTransaccion(async (conexion) => {
        const [farmacias] = await conexion.query(
          'SELECT * FROM farmacias WHERE id = ? AND activa = TRUE',
          [farmaciaId]
        );
        if (farmacias.length === 0) throw new ErrorNegocio(404, 'La farmacia seleccionada no existe.');

        const ids = items.map((i) => i.medicamentoId);
        const [existencias] = await conexion.query(
          `SELECT m.id, m.nombre, m.concentracion, m.presentacion, i.cantidad, i.precio
           FROM medicamentos m
           LEFT JOIN inventario i ON i.medicamento_id = m.id AND i.farmacia_id = ?
           WHERE m.id IN (?)
           FOR UPDATE`,
          [farmaciaId, ids]
        );
        const porId = new Map(existencias.map((e) => [e.id, e]));

        const faltantes = items
          .map((item) => {
            const fila = porId.get(item.medicamentoId);
            const disponible = fila && fila.cantidad !== null ? numero(fila.cantidad) : 0;
            return { item, fila, disponible };
          })
          .filter(({ item, disponible }) => disponible < item.cantidad)
          .map(({ item, fila, disponible }) => ({
            medicamentoId: item.medicamentoId,
            nombre: fila ? fila.nombre : null,
            solicitada: item.cantidad,
            disponible,
          }));
        if (faltantes.length > 0) {
          throw new ErrorNegocio(409, 'No hay existencias suficientes en esta farmacia.', faltantes);
        }

        const detalle = items.map((item) => {
          const fila = porId.get(item.medicamentoId);
          const precioUnitario = numero(fila.precio);
          return {
            medicamentoId: item.medicamentoId,
            nombre: fila.nombre,
            concentracion: fila.concentracion,
            presentacion: fila.presentacion,
            cantidad: item.cantidad,
            precioUnitario,
            subtotal: precioUnitario * item.cantidad,
          };
        });
        const total = detalle.reduce((suma, d) => suma + d.subtotal, 0);

        for (const item of items) {
          await conexion.query(
            'UPDATE inventario SET cantidad = cantidad - ? WHERE farmacia_id = ? AND medicamento_id = ?',
            [item.cantidad, farmaciaId, item.medicamentoId]
          );
        }

        const [resultado] = await conexion.query(
          `INSERT INTO solicitudes
             (usuario_id, usuario_email, farmacia_id, formula_numero, formula_medico,
              formula_registro_medico, formula_fecha, observaciones, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            usuario.id, usuario.email, farmaciaId,
            formula ? formula.numero : null, formula ? formula.medico : null,
            formula ? formula.registroMedico : null, formula ? formula.fecha : null,
            observaciones, total,
          ]
        );

        await conexion.query(
          'INSERT INTO solicitud_items (solicitud_id, medicamento_id, cantidad, precio_unitario) VALUES ?',
          [detalle.map((d) => [resultado.insertId, d.medicamentoId, d.cantidad, d.precioUnitario])]
        );

        return {
          id: resultado.insertId,
          estado: 'PENDIENTE',
          farmacia: farmaciaDesdeFila(farmacias[0]),
          items: detalle,
          total,
          requiereFormula: Boolean(formula),
        };
      });
    },

    async listarSolicitudesUsuario(usuarioId) {
      const [solicitudes] = await pool.query(
        `SELECT s.*, f.nombre AS farmacia_nombre, f.direccion AS farmacia_direccion,
                f.municipio AS farmacia_municipio, f.horario AS farmacia_horario
         FROM solicitudes s
         INNER JOIN farmacias f ON f.id = s.farmacia_id
         WHERE s.usuario_id = ?
         ORDER BY s.creado_en DESC, s.id DESC
         LIMIT 50`,
        [usuarioId]
      );
      if (solicitudes.length === 0) return [];

      const [items] = await pool.query(
        `SELECT si.*, m.nombre, m.concentracion, m.presentacion
         FROM solicitud_items si
         INNER JOIN medicamentos m ON m.id = si.medicamento_id
         WHERE si.solicitud_id IN (?)`,
        [solicitudes.map((s) => s.id)]
      );

      return solicitudes.map((s) => ({
        id: s.id,
        estado: s.estado,
        creadoEn: s.creado_en,
        total: numero(s.total),
        observaciones: s.observaciones,
        formula: s.formula_numero
          ? { numero: s.formula_numero, medico: s.formula_medico, registroMedico: s.formula_registro_medico }
          : null,
        farmacia: {
          id: s.farmacia_id,
          nombre: s.farmacia_nombre,
          direccion: s.farmacia_direccion,
          municipio: s.farmacia_municipio,
          horario: s.farmacia_horario,
        },
        items: items
          .filter((i) => i.solicitud_id === s.id)
          .map((i) => ({
            medicamentoId: i.medicamento_id,
            nombre: i.nombre,
            concentracion: i.concentracion,
            presentacion: i.presentacion,
            cantidad: i.cantidad,
            precioUnitario: numero(i.precio_unitario),
          })),
      }));
    },

    // Cancela una solicitud PENDIENTE del usuario y devuelve las unidades al inventario
    async cancelarSolicitud(id, usuarioId) {
      return enTransaccion(async (conexion) => {
        const [filas] = await conexion.query(
          'SELECT id, estado, farmacia_id FROM solicitudes WHERE id = ? AND usuario_id = ? FOR UPDATE',
          [id, usuarioId]
        );
        if (filas.length === 0) throw new ErrorNegocio(404, 'La solicitud no existe.');
        if (filas[0].estado !== 'PENDIENTE') {
          throw new ErrorNegocio(409, `Solo puedes cancelar solicitudes pendientes (esta está ${filas[0].estado}).`);
        }

        const [items] = await conexion.query(
          'SELECT medicamento_id, cantidad FROM solicitud_items WHERE solicitud_id = ?',
          [id]
        );
        for (const item of items) {
          await conexion.query(
            'UPDATE inventario SET cantidad = cantidad + ? WHERE farmacia_id = ? AND medicamento_id = ?',
            [item.cantidad, filas[0].farmacia_id, item.medicamento_id]
          );
        }
        await conexion.query("UPDATE solicitudes SET estado = 'CANCELADA' WHERE id = ?", [id]);
        return { id, estado: 'CANCELADA' };
      });
    },

    // ---- Administración ----

    // Panorama del inventario, de los pedidos y de los medicamentos más pedidos
    async resumenAdmin({ umbralBajo = 10 } = {}) {
      const [[catalogo]] = await pool.query(
        `SELECT COUNT(*) AS medicamentos, SUM(requiere_formula = TRUE) AS conFormula, SUM(control_especial = TRUE) AS controlEspecial
         FROM medicamentos WHERE activo = TRUE`
      );
      const [[inventario]] = await pool.query(
        `SELECT COALESCE(SUM(cantidad), 0) AS unidades, SUM(cantidad = 0) AS agotados, SUM(cantidad > 0 AND cantidad < ?) AS bajos,
                COALESCE(SUM(cantidad * precio), 0) AS valor
         FROM inventario`,
        [umbralBajo]
      );
      const [porFarmacia] = await pool.query(
        `SELECT f.id, f.nombre, f.municipio, f.abierta_24h, COALESCE(SUM(i.cantidad), 0) AS unidades,
                SUM(i.cantidad = 0) AS agotados, SUM(i.cantidad > 0 AND i.cantidad < ?) AS bajos, COUNT(i.medicamento_id) AS productos
         FROM farmacias f LEFT JOIN inventario i ON i.farmacia_id = f.id
         WHERE f.activa = TRUE GROUP BY f.id ORDER BY f.nombre`,
        [umbralBajo]
      );
      const [bajoStock] = await pool.query(
        `SELECT f.nombre AS farmacia, m.nombre AS medicamento, m.concentracion, i.cantidad
         FROM inventario i INNER JOIN farmacias f ON f.id = i.farmacia_id INNER JOIN medicamentos m ON m.id = i.medicamento_id
         WHERE i.cantidad < ? ORDER BY i.cantidad, m.nombre LIMIT 25`,
        [umbralBajo]
      );
      const [porEstado] = await pool.query('SELECT estado, COUNT(*) AS total, COALESCE(SUM(total), 0) AS valor FROM solicitudes GROUP BY estado');
      const [masPedidos] = await pool.query(
        `SELECT m.nombre, m.concentracion, SUM(si.cantidad) AS unidades
         FROM solicitud_items si INNER JOIN solicitudes s ON s.id = si.solicitud_id INNER JOIN medicamentos m ON m.id = si.medicamento_id
         WHERE s.estado <> 'CANCELADA' GROUP BY m.id ORDER BY unidades DESC LIMIT 8`
      );
      const conteo = Object.fromEntries(porEstado.map((f) => [f.estado, { total: numero(f.total), valor: numero(f.valor) }]));
      return {
        catalogo: { medicamentos: numero(catalogo.medicamentos), conFormula: numero(catalogo.conFormula), controlEspecial: numero(catalogo.controlEspecial) },
        inventario: {
          unidades: numero(inventario.unidades),
          productosAgotados: numero(inventario.agotados),
          productosBajos: numero(inventario.bajos),
          valorEstimado: numero(inventario.valor),
          umbralBajo,
        },
        porFarmacia: porFarmacia.map((f) => ({
          id: f.id, nombre: f.nombre, municipio: f.municipio, abierta24h: booleano(f.abierta_24h),
          unidades: numero(f.unidades), productos: numero(f.productos), agotados: numero(f.agotados), bajos: numero(f.bajos),
        })),
        bajoStock: bajoStock.map((f) => ({ ...f, cantidad: numero(f.cantidad) })),
        solicitudes: {
          porEstado: conteo,
          total: porEstado.reduce((s, f) => s + numero(f.total), 0),
          ventas: ['PENDIENTE', 'LISTA', 'ENTREGADA'].reduce((s, e) => s + (conteo[e]?.valor || 0), 0),
        },
        masPedidos: masPedidos.map((f) => ({ ...f, unidades: numero(f.unidades) })),
      };
    },

    async listarSolicitudesAdmin({ estado } = {}) {
      const [filas] = await pool.query(
        `SELECT s.id, s.usuario_email AS usuarioEmail, s.estado, s.total, s.formula_numero AS formulaNumero, s.creado_en AS creadoEn,
                f.nombre AS farmacia, f.municipio, COUNT(si.medicamento_id) AS productos, COALESCE(SUM(si.cantidad), 0) AS unidades
         FROM solicitudes s INNER JOIN farmacias f ON f.id = s.farmacia_id LEFT JOIN solicitud_items si ON si.solicitud_id = s.id
         ${estado ? 'WHERE s.estado = ?' : ''}
         GROUP BY s.id ORDER BY s.creado_en DESC, s.id DESC LIMIT 100`,
        estado ? [estado] : []
      );
      return filas.map((f) => ({ ...f, total: numero(f.total), productos: numero(f.productos), unidades: numero(f.unidades) }));
    },

    /**
     * Avanza un pedido: PENDIENTE -> LISTA -> ENTREGADA, o PENDIENTE/LISTA -> RECHAZADA.
     * Al rechazar, las unidades vuelven al inventario. Devuelve el pedido con el correo del usuario.
     */
    async cambiarEstadoSolicitud(id, estadoNuevo) {
      const permitidas = { PENDIENTE: ['LISTA', 'RECHAZADA'], LISTA: ['ENTREGADA', 'RECHAZADA'] };
      return enTransaccion(async (conexion) => {
        const [filas] = await conexion.query(
          `SELECT s.id, s.estado, s.farmacia_id, s.usuario_email, s.total, f.nombre AS farmacia, f.direccion, f.horario
           FROM solicitudes s INNER JOIN farmacias f ON f.id = s.farmacia_id WHERE s.id = ? FOR UPDATE`,
          [id]
        );
        if (filas.length === 0) throw new ErrorNegocio(404, 'El pedido no existe.');
        const pedido = filas[0];
        if (!(permitidas[pedido.estado] || []).includes(estadoNuevo)) {
          throw new ErrorNegocio(409, `Un pedido ${pedido.estado} no puede pasar a ${estadoNuevo}.`);
        }
        if (estadoNuevo === 'RECHAZADA') {
          const [items] = await conexion.query('SELECT medicamento_id, cantidad FROM solicitud_items WHERE solicitud_id = ?', [id]);
          for (const item of items) {
            await conexion.query(
              'UPDATE inventario SET cantidad = cantidad + ? WHERE farmacia_id = ? AND medicamento_id = ?',
              [item.cantidad, pedido.farmacia_id, item.medicamento_id]
            );
          }
        }
        await conexion.query('UPDATE solicitudes SET estado = ? WHERE id = ?', [estadoNuevo, id]);
        return {
          id, estadoAnterior: pedido.estado, estado: estadoNuevo, usuarioEmail: pedido.usuario_email,
          farmacia: { nombre: pedido.farmacia, direccion: pedido.direccion, horario: pedido.horario }, total: numero(pedido.total),
        };
      });
    },
  };
}

module.exports = { crearRepositorio, ErrorNegocio };
