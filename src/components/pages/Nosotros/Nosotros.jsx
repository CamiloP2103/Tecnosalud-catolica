import { useState } from 'react';
import './Nosotros.css';

function Nosotros({ seccion }) {
  const [visitas, setVisitas] = useState(0);

  return (
    <section className="page page--nosotros">
      {/* Historia */}
      {seccion === 'historia' && (
        <>
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

          {/* Nuestro Compromiso */}
          <div className="nosotros-card nosotros-card--about">
            <div className="nosotros-card__icon" aria-hidden="true">🤲</div>
            <div className="nosotros-card__body">
              <h3>Nuestro Compromiso</h3>
              <p>
                Trabajamos cada día para que la tecnología no sea una barrera sino un puente hacia una
                atención en salud más humana. Nuestro equipo combina experiencia clínica, ingeniería
                biomédica y desarrollo de software para construir soluciones pensadas desde y para las
                personas que más lo necesitan, siempre bajo principios de ética, calidad y respeto por
                la dignidad de cada paciente.
              </p>
            </div>
          </div>

          {/* Presencia y Cobertura */}
          <div className="nosotros-pillars">
            <h3>Presencia y Cobertura</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">📍</span>
                <h4>Cobertura en Bogotá D.C.</h4>
                <p>Presencia y proyección de operación en las 20 localidades de la ciudad.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">🧑‍🤝‍🧑</span>
                <h4>Enfoque Social</h4>
                <p>Priorizamos a la población pobre y vulnerable del régimen subsidiado.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">💻</span>
                <h4>Tecnología al Servicio de la Salud</h4>
                <p>Plataformas digitales propias que agilizan la atención y el seguimiento clínico.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Misión y Visión */}
      {seccion === 'mision-vision' && (
        <>
          <div className="nosotros-card nosotros-card--about">
            <div className="nosotros-card__icon" aria-hidden="true">🏥</div>
            <div className="nosotros-card__body">
              <p>
                Somos una Entidad Administradora de Planes de Beneficios de Salud que gestiona el
                aseguramiento de la población pobre y vulnerable, para impactar en la calidad de vida
                de sus afiliados.
              </p>
            </div>
          </div>

          <div className="nosotros-grid">
            <div className="nosotros-card nosotros-card--mision">
              <div className="nosotros-card__icon" aria-hidden="true">🎯</div>
              <h3>Misión</h3>
              <p>
                Somos una Entidad Administradora de Planes de Beneficios de Salud que gestiona el
                aseguramiento de la población pobre y vulnerable, para impactar en la calidad de vida
                de sus afiliados.
              </p>
            </div>

            <div className="nosotros-card nosotros-card--vision">
              <div className="nosotros-card__icon" aria-hidden="true">🔭</div>
              <h3>Visión</h3>
              <p>
                En el 2028 seremos la mejor alternativa de aseguramiento en régimen subsidiado para
                la población pobre y vulnerable del departamento de Antioquia.
              </p>
            </div>
          </div>

          {/* Objetivos Estratégicos */}
          <div className="nosotros-pillars">
            <h3>Objetivos Estratégicos</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">⏱️</span>
                <h4>Acceso Oportuno</h4>
                <p>Reducir los tiempos de espera y facilitar el ingreso ágil a los servicios de salud.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">✅</span>
                <h4>Calidad Asistencial</h4>
                <p>Garantizar una atención segura, humanizada y basada en evidencia científica.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">🚀</span>
                <h4>Innovación Continua</h4>
                <p>Incorporar tecnología de forma permanente para mejorar la experiencia del afiliado.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Valores */}
      {seccion === 'valores' && (
        <div className="nosotros-pillars">
          <div className="nosotros-header">
            <h3>Valores</h3>
            <p className="nosotros-lead">
              Estos son los principios que orientan cada una de nuestras decisiones y guían la forma en
              que nos relacionamos con nuestros afiliados, colaboradores y aliados.
            </p>
          </div>
          <div className="nosotros-pillars__grid">
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">🤲</span>
              <h4>Respeto</h4>
              <p>
                Valoramos a los otros como sujetos de derechos, los cuales no solo merecen nuestro
                reconocimiento por su dignidad humana, sino que deben ser protegidos y garantizados
                por medio de nuestras acciones.
              </p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">⚖️</span>
              <h4>Equidad</h4>
              <p>
                Buscamos de manera permanente reducir las brechas para asegurar que aumente el nivel
                de salud de la población con servicios oportunos y accesibles.
              </p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">🔍</span>
              <h4>Transparencia</h4>
              <p>
                Somos transparentes en todo lo que hacemos; rendimos cuentas de nuestra gestión,
                ponemos todo sobre la mesa y estamos abiertos a compartir la información pública con
                quien lo requiera, ya que entendemos que Savia Salud EPS es propiedad de los antioqueños.
              </p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">🤝</span>
              <h4>Cercanía</h4>
              <p>
                Trabajamos para que todos nuestros afiliados se sientan siempre acompañados por la
                EAPB en cada una de las etapas de su proceso de salud-enfermedad y desde su sitio de
                residencia.
              </p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">🛡️</span>
              <h4>Responsabilidad</h4>
              <p>
                Actuamos siempre pensando en el bienestar y el respeto de cada uno de los grupos de
                interés y en responder por la buena gestión de Savia Salud EPS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Trabaja con nosotros */}
      {seccion === 'trabaja-con-nosotros' && (
        <>
          <div className="trabajo-intro">
            <div className="nosotros-card__icon" aria-hidden="true">🤗</div>
            <p>
              En <strong>Tecnosalud Católica</strong> promovemos un ambiente inclusivo y diverso.
              Por eso, si tienes una discapacidad debidamente registrada ante el Ministerio de Salud,
              ¡no dudes en postularte a nuestras convocatorias! Queremos conocerte y que hagas parte
              de nuestro equipo.
            </p>
          </div>

          {/* Por qué trabajar con nosotros */}
          <div className="nosotros-pillars">
            <h3>¿Por qué trabajar con nosotros?</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">📈</span>
                <h4>Crecimiento Profesional</h4>
                <p>Acompañamiento y formación práctica en el sector salud desde el primer día.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">🌈</span>
                <h4>Ambiente Inclusivo</h4>
                <p>Un equipo diverso donde cada persona es valorada por lo que aporta.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">❤️</span>
                <h4>Impacto Social Real</h4>
                <p>Tu trabajo contribuye directamente a la salud de comunidades vulnerables.</p>
              </div>
            </div>
          </div>

          <div className="trabajo-grid">
            <div className="trabajo-card">
              <h3>¡Estamos en búsqueda de practicantes!</h3>
              <p>
                Si eres estudiante de técnica, tecnología o carrera profesional de los siguientes
                programas académicos:
              </p>
              <ul className="trabajo-card__list">
                <li>Técnica o Tecnología en Auxiliar Administrativo.</li>
                <li>Técnica o Tecnología en Auxiliar Administrativo en Salud.</li>
                <li>Profesional en Contabilidad.</li>
                <li>Técnica o Tecnología en Regencia de Farmacia.</li>
                <li>Técnica o Tecnología en Enfermería.</li>
                <li>Profesional en Gerencia de Sistemas de Información (GESIS).</li>
              </ul>
              <div className="trabajo-card__meta">
                <p><strong>Tipo de contrato:</strong> SENA</p>
                <p><strong>Modalidad:</strong> presencial, Medellín</p>
                <p><strong>Envía tu hoja de vida:</strong> seleccion@tecnosaludcatolica.com</p>
                <p className="trabajo-card__nota">En el asunto debes poner el programa al cual perteneces.</p>
              </div>
            </div>

            <div className="trabajo-card">
              <h3>¡Estamos en búsqueda de practicantes!</h3>
              <p>
                Técnico o tecnólogo en asistencia administrativa y administrativa en salud, en los
                siguientes municipios:
              </p>
              <ul className="trabajo-card__list trabajo-card__list--dos-columnas">
                <li>Campamento</li>
                <li>Rionegro</li>
                <li>Cañasgordas</li>
                <li>Salgar</li>
                <li>Caicedo</li>
                <li>San Carlos</li>
                <li>Cisneros</li>
                <li>San Jerónimo</li>
                <li>Donmatías</li>
                <li>San Roque</li>
                <li>El Peñol</li>
                <li>Santa Rosa de Osos</li>
                <li>Fredonia</li>
                <li>Santafé de Antioquia</li>
                <li>La Ceja</li>
                <li>Segovia</li>
                <li>Liborina</li>
                <li>Turbo</li>
                <li>Nariño</li>
                <li>Vegachí</li>
                <li>Puerto Berrío</li>
                <li>Yolombó</li>
              </ul>
              <div className="trabajo-card__meta">
                <p><strong>Tipo de contrato:</strong> SENA</p>
                <p><strong>Modalidad:</strong> presencial</p>
                <p><strong>Envía tu hoja de vida:</strong> seleccion@tecnosaludcatolica.com</p>
                <p className="trabajo-card__nota">En el asunto debes poner el programa al cual perteneces.</p>
              </div>
            </div>
          </div>

          <div className="trabajo-actions">
            <button type="button" className="trabajo-btn trabajo-btn--primary">
              Regístrate para participar de nuestros procesos de selección
            </button>
            <button type="button" className="trabajo-btn trabajo-btn--secondary">
              Registro de convocatorias - Agencia pública de empleo SENA
            </button>
          </div>
        </>
      )}

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
