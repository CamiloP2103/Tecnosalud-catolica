// Historial de correos en db_notificaciones.notificaciones

const recortar = (valor, largo) => (valor === null || valor === undefined ? null : String(valor).slice(0, largo));

export function crearHistorial(pool) {
  return {
    async registrar({ destinatario, asunto, servicioOrigen, estado, messageId, error }) {
      await pool.query(
        `INSERT INTO notificaciones (destinatario, asunto, servicio_origen, estado, message_id, error)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          recortar(destinatario, 254),
          recortar(asunto, 200),
          recortar(servicioOrigen, 40),
          estado,
          recortar(messageId, 255),
          recortar(error, 255),
        ]
      );
    },

    // Totales para el panel de administración
    async resumen() {
      const [[totales]] = await pool.query(
        `SELECT COUNT(*) AS total, SUM(estado = 'ENVIADA') AS enviadas, SUM(estado = 'FALLIDA') AS fallidas,
                SUM(creado_en >= NOW() - INTERVAL 1 DAY) AS ultimas24h
         FROM notificaciones`
      );
      const [porServicio] = await pool.query(
        `SELECT servicio_origen AS servicio, COUNT(*) AS total, SUM(estado = 'FALLIDA') AS fallidas
         FROM notificaciones GROUP BY servicio_origen ORDER BY total DESC`
      );
      const numero = (v) => Number(v || 0);
      return {
        total: numero(totales.total),
        enviadas: numero(totales.enviadas),
        fallidas: numero(totales.fallidas),
        ultimas24h: numero(totales.ultimas24h),
        porServicio: porServicio.map((f) => ({ servicio: f.servicio, total: numero(f.total), fallidas: numero(f.fallidas) })),
        recientes: await this.listar({ limite: 15 }),
      };
    },

    async listar({ limite = 50, destinatario, estado } = {}) {
      const condiciones = [];
      const parametros = [];
      if (destinatario) {
        condiciones.push('destinatario = ?');
        parametros.push(destinatario);
      }
      if (estado) {
        condiciones.push('estado = ?');
        parametros.push(estado);
      }
      parametros.push(limite);
      const [filas] = await pool.query(
        `SELECT id, destinatario, asunto, servicio_origen AS servicioOrigen, estado,
                message_id AS messageId, error, creado_en AS creadoEn
         FROM notificaciones
         ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
         ORDER BY creado_en DESC, id DESC
         LIMIT ?`,
        parametros
      );
      return filas;
    },
  };
}
