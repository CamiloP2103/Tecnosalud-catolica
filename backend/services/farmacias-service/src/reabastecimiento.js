// Reabastecimiento semanal del inventario: solo los LUNES (hora de Bogotá) y una vez por semana.
//
// Cada fila de `inventario` con menos unidades que el objetivo vuelve a quedar en el objetivo
// (por defecto 60). La tabla `reabastecimientos` tiene la semana ISO como clave única, así que
// aunque el proceso automático y el comando manual corran a la vez, solo uno reabastece.

const ZONA_HORARIA = 'America/Bogota';
const UNA_HORA = 60 * 60 * 1000;

class ErrorReabastecimiento extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorReabastecimiento';
    this.codigo = codigo; // 'NO_ES_LUNES' | 'YA_REABASTECIDO'
  }
}

// Fecha (año, mes, día, día de la semana) en Bogotá, sin depender de la zona horaria del servidor
function fechaBogota(instante) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }).formatToParts(instante).map((p) => [p.type, p.value])
  );
  return {
    anio: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    esLunes: partes.weekday === 'Mon',
    iso: `${partes.year}-${partes.month}-${partes.day}`,
  };
}

// Semana ISO 8601 (ej. "2026-W43") de una fecha de calendario
function semanaIso({ anio, mes, dia }) {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemana = fecha.getUTCDay() || 7; // lunes = 1 ... domingo = 7
  fecha.setUTCDate(fecha.getUTCDate() + 4 - diaSemana); // jueves de esa semana
  const inicioAnio = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((fecha - inicioAnio) / 86400000 + 1) / 7);
  return `${fecha.getUTCFullYear()}-W${String(numero).padStart(2, '0')}`;
}

// Fecha (AAAA-MM-DD) del próximo lunes en Bogotá; si hoy es lunes, devuelve hoy
function proximoLunes(instante) {
  const hoy = fechaBogota(instante);
  const base = new Date(Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia));
  const dias = (8 - (base.getUTCDay() || 7)) % 7;
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

function crearReabastecedor({ pool, objetivo = 60, reloj = () => new Date() }) {
  async function reabastecer({ origen = 'MANUAL' } = {}) {
    const ahora = reloj();
    const hoy = fechaBogota(ahora);
    if (!hoy.esLunes) {
      throw new ErrorReabastecimiento(
        'NO_ES_LUNES',
        `El reabastecimiento solo se hace los lunes. El próximo es el ${proximoLunes(ahora)}.`
      );
    }
    const semana = semanaIso(hoy);

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      try {
        await conexion.query(
          'INSERT INTO reabastecimientos (semana, fecha, origen, objetivo) VALUES (?, ?, ?, ?)',
          [semana, hoy.iso, origen, objetivo]
        );
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new ErrorReabastecimiento('YA_REABASTECIDO', `El inventario ya se reabasteció esta semana (${semana}).`);
        }
        throw error;
      }

      const [[faltantes]] = await conexion.query(
        'SELECT COUNT(*) AS filas, COALESCE(SUM(? - cantidad), 0) AS unidades FROM inventario WHERE cantidad < ? FOR UPDATE',
        [objetivo, objetivo]
      );
      await conexion.query('UPDATE inventario SET cantidad = ? WHERE cantidad < ?', [objetivo, objetivo]);

      const resultado = {
        semana,
        fecha: hoy.iso,
        origen,
        objetivo,
        filasActualizadas: Number(faltantes.filas),
        unidadesAgregadas: Number(faltantes.unidades),
      };
      await conexion.query(
        'UPDATE reabastecimientos SET filas_actualizadas = ?, unidades_agregadas = ? WHERE semana = ?',
        [resultado.filasActualizadas, resultado.unidadesAgregadas, semana]
      );
      await conexion.commit();
      return resultado;
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  }

  async function estado() {
    const ahora = reloj();
    const hoy = fechaBogota(ahora);
    const [filas] = await pool.query(
      `SELECT semana, fecha, origen, objetivo, filas_actualizadas AS filasActualizadas,
              unidades_agregadas AS unidadesAgregadas, creado_en AS creadoEn
       FROM reabastecimientos ORDER BY creado_en DESC, id DESC LIMIT 1`
    );
    const ultimo = filas[0] || null;
    const hechoEstaSemana = Boolean(ultimo && ultimo.semana === semanaIso(hoy));
    return {
      objetivo,
      ultimo,
      hoyEsLunes: hoy.esLunes,
      hechoEstaSemana,
      proximo: hoy.esLunes && !hechoEstaSemana ? hoy.iso : proximoLunes(new Date(ahora.getTime() + (hoy.esLunes ? 86400000 : 0))),
    };
  }

  // Revisa cada hora (y al arrancar) si es lunes y falta reabastecer. Devuelve una función para detenerlo.
  function iniciarProgramacion({ intervaloMs = UNA_HORA, registro = console } = {}) {
    const revisar = async () => {
      if (!fechaBogota(reloj()).esLunes) return;
      try {
        const r = await reabastecer({ origen: 'AUTOMATICO' });
        registro.log(`[farmacias-service] Reabastecimiento automático ${r.semana}: ${r.unidadesAgregadas} unidades en ${r.filasActualizadas} productos.`);
      } catch (error) {
        if (error.codigo === 'YA_REABASTECIDO') return;
        registro.error('[farmacias-service] Falló el reabastecimiento automático:', error.code || error.message);
      }
    };
    revisar();
    const temporizador = setInterval(revisar, intervaloMs);
    if (temporizador.unref) temporizador.unref();
    return () => clearInterval(temporizador);
  }

  return { reabastecer, estado, iniciarProgramacion };
}

module.exports = { crearReabastecedor, ErrorReabastecimiento, fechaBogota, semanaIso, proximoLunes };
