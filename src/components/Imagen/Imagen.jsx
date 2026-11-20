import './Styles/Imagen.css';

export const ASIGNACION = {
  'carrusel-1': 'imagen9',
  'carrusel-2': 'imagen10',
  'carrusel-3': 'imagen7',
  'historia-1': 'imagen4',
  'historia-2': 'imegen3',
  'mision-vision-1': 'imagen8',
  'mision-vision-2': 'imagen11',
  'valores-1': 'imagen2',
  'trabaja-1': 'imagen10',
  'trabaja-2': 'imagen7',
  'muerte-digna-1': 'imagen1',
  'muerte-digna-2': 'imagen6',
  'medicamentos-1': 'imagen5',
  'medicamentos-2': 'imagen9',
  'triage-1': 'imagen12',
  'triage-2': 'imagen11',
};

const archivos = import.meta.glob(
  '/src/assets/imagenes/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default' }
);

const imagenes = Object.fromEntries(
  Object.entries(archivos).map(([ruta, url]) => [
    ruta.split('/').pop().replace(/\.[^.]+$/, ''),
    url,
  ])
);

export const obtenerImagen = (nombre) => imagenes[ASIGNACION[nombre] || nombre];

function Imagen({ nombre, alt = '', relacion = '4 / 3' }) {
  const url = obtenerImagen(nombre);

  return (
    <figure className="imagen" style={{ aspectRatio: relacion }}>
      {url ? (
        <img src={url} alt={alt} loading="lazy" />
      ) : (
        <div
          className="imagen__vacia"
          role="img"
          aria-label={`Espacio reservado para la imagen ${nombre}`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 18l5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span>Imagen pendiente</span>
          <code>{nombre}</code>
        </div>
      )}
    </figure>
  );
}

export default Imagen;
