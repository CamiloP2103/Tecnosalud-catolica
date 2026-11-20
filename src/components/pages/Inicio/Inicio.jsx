import { useEffect, useState } from 'react';
import fondoInicio from './Images/Fondo_Inicio.webp';
import { obtenerImagen } from '../../Imagen/Imagen';
import './Styles/Inicio.css';

const DIAPOSITIVAS = [
  {
    id: 'bienestar',
    imagen: fondoInicio,
    titulo: 'Salud y tecnología, unidas por tu bienestar',
    texto:
      'En Tecnosalud EPS combinamos innovación y compromiso para ofrecerte servicios de salud accesibles, seguros y confiables, para ti y tu familia.',
    accion: 'Conoce más sobre nosotros',
    destino: 'historia',
  },
  {
    id: 'medicamentos',
    nombreImagen: 'carrusel-1',
    titulo: 'Tus medicamentos, sin vueltas',
    texto:
      'Consulta si tu medicamento está disponible, revisa su cobertura y elige dónde reclamarlo: en un punto de dispensación o, si cumples los criterios, en tu domicilio.',
    accion: 'Ver medicamentos',
    destino: 'medicamentos',
  },
  {
    id: 'urgencias',
    nombreImagen: 'carrusel-2',
    titulo: 'En urgencias, primero quien más lo necesita',
    texto:
      'La atención se ordena por gravedad clínica y no por orden de llegada. Conoce los cinco niveles de triage y qué llevar cuando vayas.',
    accion: 'Cómo funciona el triage',
    destino: 'triage',
  },
  {
    id: 'equipo',
    nombreImagen: 'carrusel-3',
    titulo: 'Un equipo detrás de cada trámite',
    texto:
      'Profesionales de la salud, ingenieros y personal administrativo trabajando juntos para que tus afiliaciones y tu historia clínica estén en orden.',
    accion: 'Conoce al equipo',
    destino: 'organigrama',
  },
];

const INTERVALO_MS = 7000;

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Inicio({ onNavigate }) {
  const [actual, setActual] = useState(0);
  const [pausaManual, setPausaManual] = useState(prefiereMenosMovimiento);
  const [interactuando, setInteractuando] = useState(false);

  const total = DIAPOSITIVAS.length;
  const enMarcha = !pausaManual && !interactuando;

  const ir = (indice) => setActual((indice + total) % total);

  useEffect(() => {
    if (!enMarcha) return undefined;
    const temporizador = setTimeout(() => setActual((i) => (i + 1) % total), INTERVALO_MS);
    return () => clearTimeout(temporizador);
  }, [actual, enMarcha, total]);

  return (
    <div className="page page--inicio">
      <section
        className="carrusel"
        aria-roledescription="carrusel"
        aria-label="Novedades de Tecnosalud"
        onMouseEnter={() => setInteractuando(true)}
        onMouseLeave={() => setInteractuando(false)}
        onFocus={() => setInteractuando(true)}
        onBlur={() => setInteractuando(false)}
      >
        <div className="carrusel__pista" aria-live={enMarcha ? 'off' : 'polite'}>
          {DIAPOSITIVAS.map((item, indice) => {
            const url = item.imagen || obtenerImagen(item.nombreImagen);
            const activa = indice === actual;

            return (
              <article
                key={item.id}
                className={`carrusel__diapositiva ${activa ? 'carrusel__diapositiva--activa' : ''}`}
                style={url ? { backgroundImage: `url(${url})` } : undefined}
                role="group"
                aria-roledescription="diapositiva"
                aria-label={`${indice + 1} de ${total}`}
                aria-hidden={!activa}
              >
                <div className="carrusel__contenido">
                  <div className="carrusel__texto">
                    <h2 className="carrusel__titulo">{item.titulo}</h2>
                    <p className="carrusel__parrafo">{item.texto}</p>
                    <button
                      type="button"
                      className="carrusel__accion"
                      onClick={() => onNavigate && onNavigate(item.destino)}
                    >
                      {item.accion}
                    </button>
                  </div>
                </div>
                {!url && <span className="carrusel__pendiente">Imagen pendiente: {item.nombreImagen}</span>}
              </article>
            );
          })}
        </div>

        <div className="carrusel__controles">
          <div className="carrusel__indicadores">
            {DIAPOSITIVAS.map((item, indice) => (
              <button
                key={item.id}
                type="button"
                className={`carrusel__indicador ${indice === actual ? 'carrusel__indicador--activo' : ''}`}
                aria-label={`Ir a la diapositiva ${indice + 1}`}
                aria-current={indice === actual}
                onClick={() => ir(indice)}
              />
            ))}
          </div>

          <div className="carrusel__botones">
            <button
              type="button"
              className="carrusel__boton"
              aria-label={pausaManual ? 'Reanudar carrusel' : 'Pausar carrusel'}
              onClick={() => setPausaManual((valor) => !valor)}
            >
              {pausaManual ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              )}
            </button>
            <button type="button" className="carrusel__boton" aria-label="Diapositiva anterior" onClick={() => ir(actual - 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="carrusel__boton" aria-label="Diapositiva siguiente" onClick={() => ir(actual + 1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <footer className="inicio-footer">
        <svg width="34" height="16" viewBox="0 0 34 16" fill="none" aria-hidden="true">
          <path d="M0 8h9l2-6 4 12 2-10 2 4h15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Tecnosalud Católica, tecnología que cuida de ti para ti</span>
        <svg width="34" height="16" viewBox="0 0 34 16" fill="none" aria-hidden="true">
          <path d="M0 8h9l2-6 4 12 2-10 2 4h15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </footer>
    </div>
  );
}

export default Inicio;
