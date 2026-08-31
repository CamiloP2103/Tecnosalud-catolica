import { useEffect, useState } from 'react';
import fondoInicio from './Images/Fondo_Inicio.webp';
import './Inicio.css';


function Inicio({ onNavigate }) {
  const [horaCarga, setHoraCarga] = useState('--:--:--');

  useEffect(() => {
    setHoraCarga(new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }));
  }, []);

  return (
    <div className="page page--inicio">
      <section
        className="inicio-hero"
        style={{ '--inicio-hero-image': `url(${fondoInicio})` }}
      >
        <div className="inicio-hero__content">
          <h2 className="inicio-hero__title">
            Salud y tecnología,
            <span className="inicio-hero__title-accent">unidas por tu bienestar</span>
          </h2>
          <p className="inicio-hero__text">
            En Tecnosalud Católica combinamos innovación y compromiso para
            ofrecerte servicios de salud accesibles, seguros y confiables.
          </p>
          <button
            type="button"
            className="inicio-hero__cta"
            onClick={() => onNavigate && onNavigate('nosotros')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Conoce más sobre nosotros
          </button>
          <p className="inicio-hero__meta">Página cargada a las {horaCarga}</p>
        </div>
      </section>

      <footer className="inicio-footer">
        <svg width="34" height="16" viewBox="0 0 34 16" fill="none" aria-hidden="true">
          <path d="M0 8h9l2-6 4 12 2-10 2 4h15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Tecnosalud Católica, tecnología que cuida de ti.</span>
        <svg width="34" height="16" viewBox="0 0 34 16" fill="none" aria-hidden="true">
          <path d="M0 8h9l2-6 4 12 2-10 2 4h15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </footer>
    </div>
  );
}

export default Inicio;