import { useState } from 'react';
import './Nosotros.css';

function Nosotros({ seccion }) {
  const [visitas, setVisitas] = useState(0);

  const socialLinks = [
    { label: 'GitHub Institucional', href: 'https://github.com/CamiloP2103/Tecnosalud-catolica.git' },
    { label: 'Portal Oficial', href: 'https://www.instagram.com/tecnosalud' },
  ];

  return (
    <section className="page--nosotros">
      {seccion === 'historia' && (
        <>
          <div className="nosotros-header">
            <span className="nosotros-badge">Nuestra Evolución e Historia</span>
            <h2>Innovación Académica y Vocación al Servicio de la Vida</h2>
            <p className="nosotros-lead">
              Tecnosalud Católica surge como una iniciativa de vanguardia gestada desde el rigor académico de la 
              Facultad de Ingeniería de Sistemas y de la Computación, combinando la excelencia técnica con la 
              profunda vocación de servicio en el sector salud colombiano.
            </p>
          </div>

          <div className="nosotros-card nosotros-card--about">
            <div className="nosotros-card__body">
              <h3>Hitos de Transformación Digital</h3>
              <p>
                Desde su concepción, nuestra plataforma ha evolucionado desde un modelo conceptual de gestión hospitalaria 
                hasta convertirse en un ecosistema robusto basado en microservicios en la nube (Azure Container Apps), 
                arquitectura orientada a eventos (RabbitMQ) y un motor de orquestación inteligente. Hemos transformado 
                la forma en que las EPS gestionan sus afiliaciones, la interoperabilidad clínica y la cobertura regional.
              </p>
            </div>
          </div>

          <div className="nosotros-pillars">
            <h3>Nuestros Pilares de Crecimiento</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">01</span>
                <h4>Arquitectura Escalable</h4>
                <p>Desarrollo nativo en la nube con estándares de alta disponibilidad, seguridad OWASP y bases de datos relacionales optimizadas.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">02</span>
                <h4>Enfoque Humano y Social</h4>
                <p>Compromiso absoluto con la equidad en salud, facilitando trámites transparentes y accesibles para los afiliados.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">03</span>
                <h4>Interoperabilidad</h4>
                <p>Integración fluida entre módulos de autenticación, registros clínicos, farmacias y gestión geográfica departamental.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {seccion === 'mision-vision' && (
        <>
          <div className="nosotros-card nosotros-card--about">
            <div className="nosotros-card__body">
              <h3>Direccionamiento Estratégico</h3>
              <p>
                Garantizamos una gestión responsable, ética y tecnológicamente avanzada para optimizar la calidad de vida 
                de los ciudadanos a través de soluciones de salud transparentes y sostenibles.
              </p>
            </div>
          </div>

          <div className="nosotros-grid">
            <div className="nosotros-card nosotros-card--mision">
              <h3>Misión</h3>
              <p>
                Diseñar, implementar y desplegar soluciones tecnológicas e interoperables en el sector salud con un enfoque 
                humano y social, optimizando los tiempos de respuesta, la gestión de afiliaciones y la experiencia de los 
                usuarios en el territorio nacional.
              </p>
            </div>

            <div className="nosotros-card nosotros-card--vision">
              <h3>Visión</h3>
              <p>
                Consolidarnos para el año 2028 como la plataforma de gestión en salud de referencia académica e institucional 
                en Colombia, reconocida por su innovación en arquitectura de software, seguridad de la información y su impacto 
                positivo en el bienestar comunitario.
              </p>
            </div>
          </div>

          <div className="nosotros-pillars">
            <h3>Objetivos Estratégicos Institucionales</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">A</span>
                <h4>Eficiencia Operativa</h4>
                <p>Automatizar los procesos de validación de estado y aprobación de solicitudes mediante flujos basados en roles seguros.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">Q</span>
                <h4>Calidad y Seguridad</h4>
                <p>Cumplir estrictamente con los estándares normativos de protección de datos, cifrado TLS y auditorías de seguridad.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">I</span>
                <h4>Innovación Continua</h4>
                <p>Incorporar metodologías ágiles y herramientas de inteligencia artificial para la optimización de procesos administrativos.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {seccion === 'valores' && (
        <div className="nosotros-pillars">
          <div className="nosotros-header">
            <h3>Nuestros Valores Corporativos</h3>
            <p className="nosotros-lead">
              Los principios éticos y profesionales que rigen nuestro código de conducta, el desarrollo de software 
              y la relación permanente con nuestros afiliados y aliados institucionales.
            </p>
          </div>
          <div className="nosotros-pillars__grid">
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">R</span>
              <h4>Rigor Técnico y Ético</h4>
              <p>Aplicamos buenas prácticas de ingeniería en cada línea de código y actuamos con absoluta integridad en la gestión de datos sensibles.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">E</span>
              <h4>Empatía Social</h4>
              <p>Diseñamos pensando en las personas, reduciendo barreras tecnológicas y facilitando el acceso equitativo a los servicios de salud.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">T</span>
              <h4>Transparencia</h4>
              <p>Garantizamos trazabilidad absoluta en el historial de estados de afiliación y claridad institucional en cada proceso.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">C</span>
              <h4>Colaboración</h4>
              <p>Fomentamos el trabajo en equipo multidisciplinario entre ingenieros, personal clínico y administradores en pro del bienestar.</p>
            </div>
            <div className="pillar-item">
              <span className="pillar-item__icon" aria-hidden="true">S</span>
              <h4>Sostenibilidad</h4>
              <p>Creamos infraestructura tecnológica escalable, optimizada y preparada para soportar la demanda a largo plazo.</p>
            </div>
          </div>
        </div>
      )}

      {seccion === 'trabaja-con-nosotros' && (
        <>
          <div className="trabajo-intro">
            <div className="trabajo-intro__body">
              <span className="nosotros-badge">Talento e Ingeniería con Propósito</span>
              <p>
                En <strong>Tecnosalud Católica</strong> valoramos el talento humano como el motor principal de la transformación 
                digital en la salud. Buscamos profesionales, investigadores y practicantes apasionados por el desarrollo de 
                software, la gestión hospitalaria y la innovación tecnológica.
              </p>
            </div>
          </div>

          <div className="nosotros-pillars">
            <h3>¿Por qué unirte a nuestro equipo?</h3>
            <div className="nosotros-pillars__grid">
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">CP</span>
                <h4>Experiencia en Entornos Cloud</h4>
                <p>Exposición real a despliegues profesionales en Azure, microservicios, bases de datos relacionales y control de versiones avanzado.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">AI</span>
                <h4>Cultura de Innovación</h4>
                <p>Participación activa en proyectos de ingeniería de sistemas aplicados a resolver problemáticas críticas del sector salud.</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-item__icon" aria-hidden="true">IS</span>
                <h4>Alto Impacto Social</h4>
                <p>Tu trabajo contribuirá directamente a mejorar la calidad de vida y el acceso a los servicios de miles de usuarios.</p>
              </div>
            </div>
          </div>

          <div className="trabajo-callout">
            <h3>Perfil de Talento Requerido</h3>
            <ul className="trabajo-callout__list">
              <li>Estudiantes avanzados o egresados de Ingeniería de Sistemas, Computación o áreas administrativas y de salud.</li>
              <li>Compromiso con la calidad, la seguridad de la información, el trabajo en equipo y la mejora continua.</li>
              <li>Capacidad analítica para la resolución de problemas complejos y desarrollo orientado a microservicios.</li>
            </ul>
          </div>

          <div className="trabajo-grid">
            <div className="trabajo-card">
              <h3>Convocatoria de Prácticas e Investigación</h3>
              <p>
                Abrimos espacios para la integración de talento académico en áreas de desarrollo de software, arquitectura web, 
                soporte administrativo y gestión de catálogos en salud.
              </p>
              <ul className="trabajo-card__list">
                <li>Ingeniería de Sistemas y Computación.</li>
                <li>Tecnología en Desarrollo de Software y Bases de Datos.</li>
                <li>Administración de Servicios de Salud.</li>
                <li>Gestión de Infraestructura Tecnológica.</li>
              </ul>
              <div className="trabajo-card__meta">
                <p><strong>Modalidad:</strong> Híbrida / Remota</p>
                <p><strong>Contacto institucional:</strong> <a href="mailto:seleccion@tecnosaludcatolica.com">seleccion@tecnosaludcatolica.com</a></p>
                <p className="trabajo-card__nota">Indique en el asunto el área de interés o proyecto al que postula.</p>
              </div>
            </div>

            <div className="trabajo-card">
              <h3>Despliegue y Cobertura Regional</h3>
              <p>
                Nuestra plataforma acompaña activamente la gestión administrativa y de afiliaciones en múltiples regiones, 
                articulando nodos departamentales y municipales con un esquema centralizado y seguro.
              </p>
              <ul className="trabajo-card__list trabajo-card__list--dos-columnas">
                <li>Bogotá D.C. (Sede Principal)</li>
                <li>Cundinamarca</li>
                <li>Antioquia</li>
                <li>Atlántico</li>
                <li>Valle del Cauca</li>
                <li>Bolívar</li>
                <li>Santander</li>
                <li>Boyacá</li>
              </ul>
              <div className="trabajo-card__meta">
                <p><strong>Ecosistema:</strong> Microservicios Node.js / React</p>
                <p><strong>Infraestructura:</strong> Azure Cloud Service</p>
                <p className="trabajo-card__nota">Únete a la red de innovación en salud tecnológica.</p>
              </div>
            </div>
          </div>

          <div className="trabajo-actions">
            <a href="mailto:seleccion@tecnosaludcatolica.com?subject=Postulaci%C3%B3n%20Tecnosalud%20-%20Talento" className="trabajo-btn trabajo-btn--primary">
              Enviar Hoja de Vida
            </a>
            <a href="https://github.com/CamiloP2103/Tecnosalud-catolica.git" target="_blank" rel="noreferrer" className="trabajo-btn trabajo-btn--secondary">
              Ver Repositorio en GitHub
            </a>
          </div>
        </>
      )}

      {seccion === 'organigrama' && (
        <div className="organigrama">
          <div className="nosotros-header">
            <span className="nosotros-badge">Estructura Institucional</span>
            <h2>Organigrama Operativo de Tecnosalud</h2>
          </div>

          <div className="organigrama__tree">
            <div className="org-node org-node--top">Dirección General y Rectoría de Proyecto</div>
            <div className="org-node__branch">
              <div className="org-node">Gestión Administrativa</div>
              <div className="org-node">Dirección Financiera y Presupuesto</div>
              <div className="org-node">Operaciones y Afiliaciones</div>
            </div>
            <div className="org-node__branch">
              <div className="org-node">Servicios Clínicos y Asistenciales</div>
              <div className="org-node">Ingeniería de Software e Innovación Cloud</div>
              <div className="org-node">Talento Humano y Seguridad de la Información</div>
            </div>
          </div>

          <div className="social-links">
            <h3>Canales Oficiales y Repositorios</h3>
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