import { useState } from 'react';
import './Nosotros.css';

function Nosotros({ seccion }) {
  const [visitas, setVisitas] = useState(0);

  const socialLinks = [
    { label: 'GitHub', href: 'https://github.com/CamiloP2103/Tecnosalud-catolica.git' },
    { label: 'Instagram', href: 'https://www.instagram.com/tecnosalud' },
  ];

  return (
    <section className="page--nosotros">
      {seccion === 'historia' && (
        <>
          <div className="nosotros-header">
            <span className="nosotros-badge">Nuestra historia</span>
            <h2>Innovación y Vocación al Servicio de la Vida</h2>
            <p className="nosotros-lead">
              Tecnosalud nació con la misión de acercar soluciones de salud más humanas, tecnológicas y accesibles.
              A lo largo del tiempo hemos fortalecido la experiencia de nuestros afiliados y comunidades mediante una
              gestión cercana, eficiente y orientada a resultados.
            </p>
          </div>

          <div className="nosotros-card nosotros-card--about">
            <div className="nosotros-card__icon" aria-hidden="true">C</div>
            <div className="nosotros-card__body">
              <h3>Compromiso con la comunidad</h3>
              <p>
                Trabajamos cada día para que la tecnología no sea una barrera, sino un puente hacia una atención más
                humana, clara y cercana. Nuestro enfoque combina experiencia clínico-administrativa, innovación y sentido social.
              </p>
            </div>
          </div>

          <div className="nosotros-pillars">
            <h3>Presencia y Cobertura</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">A</span>
                <h4>Cobertura regional</h4>
                <p>Atención cercana con enfoque territorial y fortalecimiento del acceso a la salud.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">P</span>
                <h4>Enfoque social</h4>
                <p>Priorizamos la atención de población vulnerable y con mayores barreras de acceso.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">T</span>
                <h4>Tecnología para la salud</h4>
                <p>Plataformas y procesos digitales que agilizan la atención y fortalecen la gestión clínica.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {seccion === 'mision-vision' && (
        <>
          <div className="nosotros-card nosotros-card--about">
            <div className="nosotros-card__icon" aria-hidden="true">M</div>
            <div className="nosotros-card__body">
              <p>
                Somos una organización comprometida con la gestión responsable de la salud, fortaleciendo la calidad de vida
                de las personas a través de soluciones accesibles, humanas y sostenibles.
              </p>
            </div>
          </div>

          <div className="nosotros-grid">
            <div className="nosotros-card nosotros-card--mision">
              <div className="nosotros-card__icon" aria-hidden="true">M</div>
              <h3>Misión</h3>
              <p>
                Diseñar y ejecutar soluciones en salud con enfoque humano, tecnológico y social, para mejorar la experiencia,
                la accesibilidad y la calidad de vida de nuestros afiliados y comunidades.
              </p>
            </div>

            <div className="nosotros-card nosotros-card--vision">
              <div className="nosotros-card__icon" aria-hidden="true">V</div>
              <h3>Visión</h3>
              <p>
                Ser una organización referente en salud y tecnología, reconocida por su impacto positivo, innovación y
                capacidad de acompañar de manera cercana a cada persona.
              </p>
            </div>
          </div>

          <div className="nosotros-pillars">
            <h3>Objetivos Estratégicos</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">A</span>
                <h4>Acceso oportuno</h4>
                <p>Reducir tiempos de espera y facilitar la entrada efectiva a los servicios de salud.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">Q</span>
                <h4>Calidad asistencial</h4>
                <p>Garantizar atención segura, humanizada y guiada por evidencia.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">I</span>
                <h4>Innovación continua</h4>
                <p>Integrar tecnología para mejorar procesos y fortalecer la experiencia del usuario.</p>
              </div>
            </div>
          </div>
        </>
      )}

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
              <span className="pillar-item__icon" aria-hidden="true">R</span>
              <h4>Respeto</h4>
              <p>Reconocemos la dignidad de cada persona y promovemos relaciones basadas en la escucha y la empatía.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">E</span>
              <h4>Equidad</h4>
              <p>Buscamos reducir brechas, facilitar el acceso y garantizar atención útil para quienes más lo necesitan.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">T</span>
              <h4>Transparencia</h4>
              <p>Somos claros en nuestras decisiones, procesos y compromisos, con responsabilidad frente a la comunidad.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">C</span>
              <h4>Cercanía</h4>
              <p>Queremos que la experiencia de atención se sienta cercana, humana y acompañada en cada etapa.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">S</span>
              <h4>Responsabilidad</h4>
              <p>Actuamos con criterio, ética y sentido social para generar impacto real en la salud de la población.</p>
            </div>
          </div>
        </div>
      )}

      {seccion === 'trabaja-con-nosotros' && (
        <>
          <div className="trabajo-intro">
            <div className="nosotros-card__icon" aria-hidden="true">T</div>
            <div className="trabajo-intro__body">
              <span className="nosotros-badge">Talento y propósito</span>
              <p>
                En <strong>Tecnosalud Católica</strong> creemos que el talento humano es clave para transformar la salud.
                Por eso reunimos profesionales y practicantes con vocación de servicio, pensamiento crítico y capacidad de
                aportar soluciones reales a la comunidad.
              </p>
            </div>
          </div>

          <div className="nosotros-pillars">
            <h3>¿Por qué trabajar con nosotros?</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">C</span>
                <h4>Crecimiento profesional</h4>
                <p>Aprendizaje constante, acompañamiento real y oportunidades para desarrollar habilidades con impacto social.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">I</span>
                <h4>Ambiente inclusivo</h4>
                <p>Valoramos la diversidad, la empatía y el respeto por la diferencia como parte de nuestra cultura.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">S</span>
                <h4>Impacto social</h4>
                <p>Cada proyecto contribuye a mejorar la salud, la calidad de vida y el acceso a servicios de la comunidad.</p>
              </div>
            </div>
          </div>

          <div className="trabajo-callout">
            <h3>¿Qué buscamos?</h3>
            <ul className="trabajo-callout__list">
              <li>Estudiantes y egresados con interés en la salud, la administración, la tecnología y la atención al usuario.</li>
              <li>Personas con actitud proactiva, responsabilidad, capacidad de trabajo en equipo y sentido de servicio.</li>
              <li>Talento dispuesto a aprender, aportar ideas y contribuir al bienestar de la población a la que servimos.</li>
            </ul>
          </div>

          <div className="trabajo-grid">
            <div className="trabajo-card">
              <h3>Practicantes y aprendices</h3>
              <p>
                Estamos buscando estudiantes de programas técnicos, tecnológicos y profesionales interesados en fortalecer sus
                conocimientos en un entorno real, cercano y con impacto social.
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
                <p><strong>Correo de contacto:</strong> <a href="mailto:seleccion@tecnosaludcatolica.com">seleccion@tecnosaludcatolica.com</a></p>
                <p className="trabajo-card__nota">En el asunto debes indicar el programa al cual perteneces.</p>
              </div>
            </div>

            <div className="trabajo-card">
              <h3>Participación regional</h3>
              <p>
                También estamos convocando talento en diferentes municipios de Antioquia para apoyar procesos administrativos,
                de atención y acompañamiento en salud.
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
                <p><strong>Correo de contacto:</strong> <a href="mailto:seleccion@tecnosaludcatolica.com">seleccion@tecnosaludcatolica.com</a></p>
                <p className="trabajo-card__nota">En el asunto debes indicar el programa al cual perteneces.</p>
              </div>
            </div>
          </div>

          <div className="trabajo-actions">
            <a href="mailto:seleccion@tecnosaludcatolica.com?subject=Postulaci%C3%B3n%20Tecnosalud%20-%20Practicantes" className="trabajo-btn trabajo-btn--primary">
              Enviar mi hoja de vida
            </a>
            <a href="https://www.sena.edu.co/" target="_blank" rel="noreferrer" className="trabajo-btn trabajo-btn--secondary">
              Registro de convocatorias SENA
            </a>
          </div>
        </>
      )}

      {seccion === 'organigrama' && (
        <div className="organigrama">
          <div className="nosotros-header">
            <span className="nosotros-badge">Estructura institucional</span>
            <h2>Organigrama de Tecnosalud</h2>
          </div>

          <div className="organigrama__tree">
            <div className="org-node org-node--top">Dirección General</div>
            <div className="org-node__branch">
              <div className="org-node">Administración</div>
              <div className="org-node">Financiera</div>
              <div className="org-node">Operaciones</div>
            </div>
            <div className="org-node__branch">
              <div className="org-node">Salud y Atención</div>
              <div className="org-node">Tecnología e innovación</div>
              <div className="org-node">Talento humano</div>
            </div>
          </div>

          <div className="social-links">
            <h3>Conéctate con nosotros</h3>
            <div className="social-links__list">
              {socialLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="visits">
        <span>Visitas registradas a esta sección:</span>
        <strong>{visitas}</strong>
        <button type="button" className="visits__btn" onClick={() => setVisitas((value) => value + 1)}>
          Registrar visita
        </button>
      </div>
    </section>
  );
}

export default Nosotros;
