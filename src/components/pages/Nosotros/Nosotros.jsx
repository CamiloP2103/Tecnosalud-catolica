import { useState } from 'react';
import './Nosotros.css';

function Nosotros() {
  const [visitas, setVisitas] = useState(0);

  return (
    <section className="page page--nosotros">
      {/* Cabecera Principal */}
      <div className="nosotros-header">
        <span className="nosotros-badge">Sobre Tecnosalud</span>
        <h2>Innovación y Vocación al Servicio de la Vida</h2>
        <p className="nosotros-lead">
          En <strong>Tecnosalud Católica</strong> convergen la ingeniería de vanguardia, la tecnología médica 
          y el compromiso humano para transformar la atención en salud en Colombia.
        </p>
      </div>

      {/* Quiénes Somos */}
      <div className="nosotros-card nosotros-card--about">
        <div className="nosotros-card__icon" aria-hidden="true">🏥</div>
        <div className="nosotros-card__body">
          <h3>¿Quiénes Somos?</h3>
          <p>
            Somos una organización líder en salud digital e ingeniería biomédica aplicada, dedicada al diseño, 
            gestión e integración de soluciones tecnológicas asistenciales. Conectamos a pacientes, profesionales 
            e instituciones de salud a través de plataformas seguras, interoperables y accesibles que facilitan 
            un diagnóstico oportuno, una gestión clínica eficiente y un cuidado continuo y humanizado.
          </p>
        </div>
      </div>

      {/* Misión y Visión */}
      <div className="nosotros-grid">
        <div className="nosotros-card nosotros-card--mision">
          <div className="nosotros-card__icon" aria-hidden="true">🎯</div>
          <h3>Nuestra Misión</h3>
          <p>
            Brindar servicios y herramientas tecnológicas en salud que garanticen una atención médica integral, 
            oportuna y de alta calidad, combinando la ética profesional, la rigurosidad científica y la innovación 
            digital para mejorar el bienestar y la calidad de vida de cada afiliado y su familia.
          </p>
        </div>

        <div className="nosotros-card nosotros-card--vision">
          <div className="nosotros-card__icon" aria-hidden="true">🔭</div>
          <h3>Nuestra Visión</h3>
          <p>
            Para el año 2030, ser el ecosistema de salud y tecnología médica de referencia a nivel nacional, 
            reconocido por la transformación digital de los servicios asistenciales, la excelencia en la experiencia 
            del paciente y la implementación de soluciones bio-tecnológicas éticas y sostenibles.
          </p>
        </div>
      </div>

      {/* Pilares / Valores */}
      <div className="nosotros-pillars">
        <h3>Nuestros Pilares</h3>
        <div className="nosotros-pillars__grid">
          <div className="pillar-item">
            <span className="pillar-item__icon" aria-hidden="true">🛡️</span>
            <h4>Seguridad y Confianza</h4>
            <p>Protección rigurosa de datos clínicos y cumplimiento estricto de estándares normativos.</p>
          </div>
          <div className="pillar-item">
            <span className="pillar-item__icon" aria-hidden="true">💡</span>
            <h4>Innovación Constante</h4>
            <p>Evolución continua mediante telemedicina, sistemas de triage digital y gestión de medicamentos.</p>
          </div>
          <div className="pillar-item">
            <span className="pillar-item__icon" aria-hidden="true">🤝</span>
            <h4>Sentido Humano</h4>
            <p>La tecnología es el medio; el paciente y su bienestar integral son siempre el fin.</p>
          </div>
        </div>
      </div>

      {/* Contador de Visitas Interactivo */}
      <div className="visits">
        <span>Visitas registradas a esta sección:</span>
        <strong>{visitas}</strong>
        <button 
          type="button" 
          className="visits__btn" 
          onClick={() => setVisitas((value) => value + 1)}
        >
          Registrar visita
        </button>
      </div>
    </section>
  );
}

export default Nosotros;