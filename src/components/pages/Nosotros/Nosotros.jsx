import { useState } from 'react';
import './Nosotros.css';

function Nosotros({ seccion }) {
  const [visitas, setVisitas] = useState(0);

<<<<<<< HEAD
  const socialLinks = [
    { label: 'GitHub', href: 'https://github.com/CamiloP2103/Tecnosalud-catolica.git' },
    { label: 'Instagram', href: 'https://www.instagram.com/tecnosalud' },
  ];

=======
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
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
<<<<<<< HEAD
            <div className="nosotros-card__icon" aria-hidden="true">H</div>
            <div className="nosotros-card__body">
              <h3>¿Quiénes Somos?</h3>
              <p>
                Somos una organización orientada a la salud digital y a la gestión asistencial. Diseñamos soluciones,
                procesos y acompañamiento que mejoran la atención, reducen barreras de acceso y fortalecen la relación
                entre pacientes, profesionales y entidades del sistema de salud.
=======
            <div className="nosotros-card__icon" aria-hidden="true">🏥</div>
            <div className="nosotros-card__body">
              <h3>¿Quiénes Somos?</h3>
              <p>
                Somos una organización líder en salud digital e ingeniería biomédica aplicada, dedicada al diseño, 
                gestión e integración de soluciones tecnológicas asistenciales. Conectamos a pacientes, profesionales 
                e instituciones de salud a través de plataformas seguras, interoperables y accesibles que facilitan 
                un diagnóstico oportuno, una gestión clínica eficiente y un cuidado continuo y humanizado.
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </p>
            </div>
          </div>

<<<<<<< HEAD
          <div className="nosotros-card nosotros-card--about">
            <div className="nosotros-card__icon" aria-hidden="true">C</div>
            <div className="nosotros-card__body">
              <h3>Compromiso con la comunidad</h3>
              <p>
                Trabajamos cada día para que la tecnología no sea una barrera, sino un puente hacia una atención más
                humana, clara y cercana. Nuestro enfoque combina experiencia clínico-administrativa, innovación y sentido social.
=======
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
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </p>
            </div>
          </div>

<<<<<<< HEAD
=======
          {/* Presencia y Cobertura */}
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
          <div className="nosotros-pillars">
            <h3>Presencia y Cobertura</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
<<<<<<< HEAD
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
=======
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
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </div>
            </div>
          </div>
        </>
      )}

      {/* Misión y Visión */}
      {seccion === 'mision-vision' && (
        <>
          <div className="nosotros-card nosotros-card--about">
<<<<<<< HEAD
            <div className="nosotros-card__icon" aria-hidden="true">M</div>
            <div className="nosotros-card__body">
              <p>
                Somos una organización comprometida con la gestión responsable de la salud, fortaleciendo la calidad de vida
                de las personas a través de soluciones accesibles, humanas y sostenibles.
=======
            <div className="nosotros-card__icon" aria-hidden="true">🏥</div>
            <div className="nosotros-card__body">
              <p>
                Somos una Entidad Administradora de Planes de Beneficios de Salud que gestiona el
                aseguramiento de la población pobre y vulnerable, para impactar en la calidad de vida
                de sus afiliados.
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </p>
            </div>
          </div>

          <div className="nosotros-grid">
            <div className="nosotros-card nosotros-card--mision">
<<<<<<< HEAD
              <div className="nosotros-card__icon" aria-hidden="true">M</div>
              <h3>Misión</h3>
              <p>
                Diseñar y ejecutar soluciones en salud con enfoque humano, tecnológico y social, para mejorar la experiencia,
                la accesibilidad y la calidad de vida de nuestros afiliados y comunidades.
=======
              <div className="nosotros-card__icon" aria-hidden="true">🎯</div>
              <h3>Misión</h3>
              <p>
                Somos una Entidad Administradora de Planes de Beneficios de Salud que gestiona el
                aseguramiento de la población pobre y vulnerable, para impactar en la calidad de vida
                de sus afiliados.
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </p>
            </div>

            <div className="nosotros-card nosotros-card--vision">
<<<<<<< HEAD
              <div className="nosotros-card__icon" aria-hidden="true">V</div>
              <h3>Visión</h3>
              <p>
                Ser una organización referente en salud y tecnología, reconocida por su impacto positivo, innovación y
                capacidad de acompañar de manera cercana a cada persona.
=======
              <div className="nosotros-card__icon" aria-hidden="true">🔭</div>
              <h3>Visión</h3>
              <p>
                En el 2028 seremos la mejor alternativa de aseguramiento en régimen subsidiado para
                la población pobre y vulnerable del departamento de Antioquia.
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </p>
            </div>
          </div>

<<<<<<< HEAD
=======
          {/* Objetivos Estratégicos */}
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
          <div className="nosotros-pillars">
            <h3>Objetivos Estratégicos</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
<<<<<<< HEAD
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
=======
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
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
            </div>
          </div>
        </div>
      )}

      {/* Trabaja con nosotros */}
      {seccion === 'trabaja-con-nosotros' && (
        <>
          <div className="trabajo-intro">
<<<<<<< HEAD
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

=======
            <div className="nosotros-card__icon" aria-hidden="true">🤗</div>
            <p>
              En <strong>Tecnosalud Católica</strong> promovemos un ambiente inclusivo y diverso.
              Por eso, si tienes una discapacidad debidamente registrada ante el Ministerio de Salud,
              ¡no dudes en postularte a nuestras convocatorias! Queremos conocerte y que hagas parte
              de nuestro equipo.
            </p>
          </div>

          {/* Por qué trabajar con nosotros */}
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
          <div className="nosotros-pillars">
            <h3>¿Por qué trabajar con nosotros?</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
<<<<<<< HEAD
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
=======
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
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </div>
            </div>
          </div>

<<<<<<< HEAD
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
=======
          <div className="trabajo-grid">
            <div className="trabajo-card">
              <h3>¡Estamos en búsqueda de practicantes!</h3>
              <p>
                Si eres estudiante de técnica, tecnología o carrera profesional de los siguientes
                programas académicos:
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
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
<<<<<<< HEAD
                <p><strong>Correo de contacto:</strong> <a href="mailto:seleccion@tecnosaludcatolica.com">seleccion@tecnosaludcatolica.com</a></p>
                <p className="trabajo-card__nota">En el asunto debes indicar el programa al cual perteneces.</p>
=======
                <p><strong>Envía tu hoja de vida:</strong> seleccion@tecnosaludcatolica.com</p>
                <p className="trabajo-card__nota">En el asunto debes poner el programa al cual perteneces.</p>
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </div>
            </div>

            <div className="trabajo-card">
<<<<<<< HEAD
              <h3>Participación regional</h3>
              <p>
                También estamos convocando talento en diferentes municipios de Antioquia para apoyar procesos administrativos,
                de atención y acompañamiento en salud.
=======
              <h3>¡Estamos en búsqueda de practicantes!</h3>
              <p>
                Técnico o tecnólogo en asistencia administrativa y administrativa en salud, en los
                siguientes municipios:
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
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
<<<<<<< HEAD
                <p><strong>Correo de contacto:</strong> <a href="mailto:seleccion@tecnosaludcatolica.com">seleccion@tecnosaludcatolica.com</a></p>
                <p className="trabajo-card__nota">En el asunto debes indicar el programa al cual perteneces.</p>
=======
                <p><strong>Envía tu hoja de vida:</strong> seleccion@tecnosaludcatolica.com</p>
                <p className="trabajo-card__nota">En el asunto debes poner el programa al cual perteneces.</p>
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
              </div>
            </div>
          </div>

          <div className="trabajo-actions">
<<<<<<< HEAD
            <a
              href="mailto:seleccion@tecnosaludcatolica.com?subject=Postulaci%C3%B3n%20Tecnosalud%20-%20Practicantes"
              className="trabajo-btn trabajo-btn--primary"
            >
              Enviar mi hoja de vida
            </a>
            <a
              href="https://www.sena.edu.co/"
              target="_blank"
              rel="noreferrer"
              className="trabajo-btn trabajo-btn--secondary"
            >
              Registro de convocatorias SENA
            </a>
=======
            <button type="button" className="trabajo-btn trabajo-btn--primary">
              Regístrate para participar de nuestros procesos de selección
            </button>
            <button type="button" className="trabajo-btn trabajo-btn--secondary">
              Registro de convocatorias - Agencia pública de empleo SENA
            </button>
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
          </div>
        </>
      )}

<<<<<<< HEAD
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

=======
      {/* Contador de Visitas Interactivo */}
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
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
