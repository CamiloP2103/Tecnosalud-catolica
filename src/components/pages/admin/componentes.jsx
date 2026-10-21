// Piezas reutilizables del panel de administración.
import { IconoAlerta } from './iconos';

export const pesos = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

export const numero = (v) => new Intl.NumberFormat('es-CO').format(v || 0);

export const fechaHora = (v) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export const fechaCorta = (fecha) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

export const tamanoArchivo = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Tarjeta con un indicador. Si recibe `onClick` se comporta como botón (lleva a la sección). */
export function Indicador({ icono: Icon, titulo, valor, detalle, tono = 'neutro', onClick }) {
  const contenido = (
    <>
      <span className={`adm-indicador__icono adm-tono--${tono}`}>{Icon && <Icon tamano={22} />}</span>
      <span className="adm-indicador__texto">
        <span className="adm-indicador__titulo">{titulo}</span>
        <strong className="adm-indicador__valor">{valor}</strong>
        {detalle && <span className="adm-indicador__detalle">{detalle}</span>}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="adm-indicador adm-indicador--accion" onClick={onClick}>{contenido}</button>
  ) : (
    <div className="adm-indicador">{contenido}</div>
  );
}

/** Barra horizontal proporcional (porcentaje 0-100). */
export function Barra({ porcentaje, tono = 'azul', etiqueta }) {
  const valor = Math.max(0, Math.min(100, Math.round(porcentaje || 0)));
  return (
    <div className="adm-barra" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={valor} aria-label={etiqueta}>
      <span className={`adm-barra__relleno adm-barra--${tono}`} style={{ width: `${valor}%` }} />
    </div>
  );
}

/** Lista de barras para distribuciones (por EPS, por servicio...). */
export function Distribucion({ filas, vacio = 'Sin datos todavía.' }) {
  if (!filas || filas.length === 0) return <p className="adm-vacio">{vacio}</p>;
  const maximo = Math.max(...filas.map((f) => f.total), 1);
  return (
    <ul className="adm-distribucion">
      {filas.map((f) => (
        <li key={f.nombre}>
          <span className="adm-distribucion__nombre">{f.nombre}</span>
          <Barra porcentaje={(f.total / maximo) * 100} etiqueta={f.nombre} />
          <span className="adm-distribucion__total">{numero(f.total)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Insignia({ estado, texto }) {
  return <span className={`adm-insignia adm-insignia--${String(estado).toLowerCase()}`}>{texto || estado}</span>;
}

/** Caja de sección con título y, si el servicio falló, el mensaje de error en lugar del contenido. */
export function Tarjeta({ titulo, acciones, error, children, ancho = false }) {
  return (
    <section className={`adm-tarjeta ${ancho ? 'adm-tarjeta--ancha' : ''}`}>
      <header className="adm-tarjeta__encabezado">
        <h3>{titulo}</h3>
        {acciones}
      </header>
      {error ? (
        <p className="adm-error" role="alert"><IconoAlerta tamano={18} /> {error}</p>
      ) : children}
    </section>
  );
}

/** Tabla simple y responsiva. columnas: [{ clave, titulo, render? }] */
export function Tabla({ columnas, filas, vacio = 'No hay registros.', claveFila = 'id' }) {
  if (!filas || filas.length === 0) return <p className="adm-vacio">{vacio}</p>;
  return (
    <div className="adm-tabla-contenedor">
      <table className="adm-tabla">
        <thead>
          <tr>{columnas.map((c) => <th key={c.clave} scope="col">{c.titulo}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={fila[claveFila] ?? i}>
              {columnas.map((c) => <td key={c.clave} data-titulo={c.titulo}>{c.render ? c.render(fila) : fila[c.clave]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
