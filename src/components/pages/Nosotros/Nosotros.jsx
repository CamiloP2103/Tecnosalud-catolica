import Imagen from '../../Imagen/Imagen';
import '../../../styles/paginas.css';
import './Styles/Nosotros.css';

const contributors = [
  { login: 'caenjiro' },
  { login: 'Juanesphi' },
  { login: 'CamiloP2103' },
  { login: 'mmorales463' },
  { login: 'Vegetto14' },
].sort((a, b) => a.login.localeCompare(b.login, 'es', { sensitivity: 'base' }));

const socialLinks = [
  {
    label: 'GitHub Institucional',
    href: 'https://github.com/CamiloP2103/Tecnosalud-catolica.git',
  },
  { label: 'Portal Oficial', href: 'https://www.instagram.com/tecnosalud' },
];

const PILARES_HISTORIA = [
  {
    titulo: 'Arquitectura escalable',
    texto:
      'Desarrollo nativo en la nube con estándares de alta disponibilidad, seguridad OWASP y bases de datos relacionales optimizadas.',
  },
  {
    titulo: 'Enfoque humano y social',
    texto:
      'Compromiso con la equidad en salud, facilitando trámites transparentes y accesibles para los afiliados.',
  },
  {
    titulo: 'Interoperabilidad',
    texto:
      'Integración fluida entre módulos de autenticación, registros clínicos, farmacias y gestión geográfica departamental.',
  },
];

const OBJETIVOS = [
  {
    titulo: 'Eficiencia operativa',
    texto:
      'Automatizar los procesos de validación de estado y aprobación de solicitudes mediante flujos basados en roles seguros.',
  },
  {
    titulo: 'Calidad y seguridad',
    texto:
      'Cumplir los estándares normativos de protección de datos, cifrado TLS y auditorías de seguridad.',
  },
  {
    titulo: 'Innovación continua',
    texto:
      'Incorporar metodologías ágiles y herramientas de inteligencia artificial para la optimización de procesos administrativos.',
  },
];

const VALORES = [
  {
    titulo: 'Rigor técnico y ético',
    texto:
      'Aplicamos buenas prácticas de ingeniería en cada línea de código y actuamos con integridad en la gestión de datos sensibles.',
  },
  {
    titulo: 'Empatía social',
    texto:
      'Diseñamos pensando en las personas, reduciendo barreras tecnológicas y facilitando el acceso equitativo a los servicios de salud.',
  },
  {
    titulo: 'Transparencia',
    texto:
      'Garantizamos trazabilidad en el historial de estados de afiliación y claridad institucional en cada proceso.',
  },
  {
    titulo: 'Colaboración',
    texto:
      'Fomentamos el trabajo en equipo entre ingenieros, personal clínico y administradores en pro del bienestar.',
  },
  {
    titulo: 'Sostenibilidad',
    texto:
      'Creamos infraestructura tecnológica escalable y optimizada, preparada para soportar la demanda a largo plazo.',
  },
];

const RAZONES_EQUIPO = [
  {
    titulo: 'Experiencia en entornos cloud',
    texto:
      'Exposición real a despliegues profesionales en Azure, microservicios, bases de datos relacionales y control de versiones avanzado.',
  },
  {
    titulo: 'Cultura de innovación',
    texto:
      'Participación activa en proyectos de ingeniería de sistemas aplicados a problemas críticos del sector salud.',
  },
  {
    titulo: 'Alto impacto social',
    texto:
      'Tu trabajo contribuirá directamente a mejorar la calidad de vida y el acceso a los servicios de miles de usuarios.',
  },
];

function Lista({ titulo, items }) {
  return (
    <section className="pg-bloque">
      <h3 className="pg-bloque__titulo">{titulo}</h3>
      <ul className="pg-lista">
        {items.map((item) => (
          <li className="pg-item" key={item.titulo}>
            <h4>{item.titulo}</h4>
            <p>{item.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Nosotros({ seccion }) {
  return (
    <section className="pg page--nosotros">
      {seccion === 'historia' && (
        <>
          <div className="pg-fila">
            <div className="pg-fila__texto">
              <h2>Innovación Académica y Vocación al Servicio de la Vida</h2>
              <p className="pg-lead">
                Tecnosalud Católica surge como una iniciativa de la Facultad de Ingeniería de Sistemas y de la
                Computación, que une la excelencia técnica con la vocación de servicio en el sector salud
                colombiano.
              </p>
            </div>
            <div className="pg-fila__medio">
              <Imagen nombre="historia-1" alt="Médica atendiendo a una paciente en consulta" />
            </div>
          </div>

          <div className="pg-fila pg-fila--inversa">
            <div className="pg-fila__texto">
              <h3>Hitos de transformación digital</h3>
              <p>
                Nuestra plataforma pasó de ser un modelo conceptual de gestión hospitalaria a un ecosistema de
                microservicios en la nube (Azure Container Apps), con arquitectura orientada a eventos (RabbitMQ) y
                un motor de orquestación inteligente.
              </p>
              <p>
                Con ella cambió la forma en que las EPS gestionan sus afiliaciones, la interoperabilidad clínica y
                la cobertura regional.
              </p>
            </div>
            <div className="pg-fila__medio">
              <Imagen nombre="historia-2" alt="Médico revisando el oído de una niña acompañada por su madre" />
            </div>
          </div>

          <Lista titulo="Nuestros pilares de crecimiento" items={PILARES_HISTORIA} />
        </>
      )}

      {seccion === 'mision-vision' && (
        <>
          <div className="pg-cabecera">
            <h2>Direccionamiento estratégico</h2>
            <p className="pg-lead">
              Una gestión responsable, ética y tecnológicamente avanzada para mejorar la calidad de vida de los
              ciudadanos con soluciones de salud transparentes y sostenibles.
            </p>
          </div>

          <div className="pg-fila">
            <div className="pg-fila__texto">
              <h3>Misión</h3>
              <p>
                Diseñar, implementar y desplegar soluciones tecnológicas e interoperables en el sector salud, con
                enfoque humano y social, optimizando los tiempos de respuesta, la gestión de afiliaciones y la
                experiencia de los usuarios en el territorio nacional.
              </p>
            </div>
            <div className="pg-fila__medio">
              <Imagen nombre="mision-vision-1" alt="Médica examinando a un niño junto a su padre" />
            </div>
          </div>

          <div className="pg-fila pg-fila--inversa">
            <div className="pg-fila__texto">
              <h3>Visión</h3>
              <p>
                Consolidarnos para el año 2028 como la plataforma de gestión en salud de referencia académica e
                institucional en Colombia, reconocida por su innovación en arquitectura de software, su seguridad de
                la información y su impacto positivo en el bienestar comunitario.
              </p>
            </div>
            <div className="pg-fila__medio">
              <Imagen nombre="mision-vision-2" alt="Médica conversando con afiliados en una sala de atención" />
            </div>
          </div>

          <Lista titulo="Objetivos estratégicos institucionales" items={OBJETIVOS} />
        </>
      )}

      {seccion === 'valores' && (
        <>
          <div className="pg-fila">
            <div className="pg-fila__texto">
              <h2>Nuestros valores corporativos</h2>
              <p className="pg-lead">
                Los principios éticos y profesionales que guían nuestro código de conducta, el desarrollo de
                software y la relación con afiliados y aliados institucionales.
              </p>
            </div>
            <div className="pg-fila__medio">
              <Imagen nombre="valores-1" alt="Médica explicando un diagnóstico a una familia" />
            </div>
          </div>

          <ul className="pg-lista">
            {VALORES.map((item) => (
              <li className="pg-item" key={item.titulo}>
                <h4>{item.titulo}</h4>
                <p>{item.texto}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {seccion === 'trabaja-con-nosotros' && (
        <>
          <div className="pg-fila">
            <div className="pg-fila__texto">
              <h2>Trabaja con nosotros</h2>
              <p className="pg-lead">
                En <strong>Tecnosalud Católica</strong> el talento humano es el motor de la transformación digital en
                la salud. Buscamos profesionales, investigadores y practicantes interesados en el desarrollo de
                software, la gestión hospitalaria y la innovación tecnológica.
              </p>
            </div>
            <div className="pg-fila__medio">
              <Imagen nombre="trabaja-1" alt="Personal de laboratorio y enfermería trabajando en un consultorio" />
            </div>
          </div>

          <Lista titulo="¿Por qué unirte a nuestro equipo?" items={RAZONES_EQUIPO} />

          <div className="pg-fila pg-fila--inversa">
            <div className="pg-fila__texto">
              <h3>Perfil que buscamos</h3>
              <ul className="pg-vinetas">
                <li>
                  Estudiantes avanzados o egresados de Ingeniería de Sistemas, Computación o áreas administrativas y
                  de salud.
                </li>
                <li>
                  Compromiso con la calidad, la seguridad de la información, el trabajo en equipo y la mejora
                  continua.
                </li>
                <li>
                  Capacidad analítica para resolver problemas complejos y desarrollar con enfoque de microservicios.
                </li>
              </ul>
            </div>
            <div className="pg-fila__medio">
              <Imagen nombre="trabaja-2" alt="Médico mostrando una tableta a un paciente durante la consulta" />
            </div>
          </div>

          <div className="trabajo-dos">
            <div className="trabajo-dos__columna">
              <h3>Prácticas e investigación</h3>
              <p>
                Abrimos espacios para integrar talento académico en desarrollo de software, arquitectura web,
                soporte administrativo y gestión de catálogos en salud.
              </p>
              <ul className="pg-vinetas">
                <li>Ingeniería de Sistemas y Computación.</li>
                <li>Tecnología en Desarrollo de Software y Bases de Datos.</li>
                <li>Administración de Servicios de Salud.</li>
                <li>Gestión de Infraestructura Tecnológica.</li>
              </ul>
              <dl className="trabajo-dos__datos">
                <div>
                  <dt>Modalidad</dt>
                  <dd>Híbrida / Remota</dd>
                </div>
                <div>
                  <dt>Contacto</dt>
                  <dd>
                    <a href="mailto:seleccion@tecnosaludcatolica.com">seleccion@tecnosaludcatolica.com</a>
                  </dd>
                </div>
              </dl>
              <p className="trabajo-dos__nota">Indica en el asunto el área de interés o el proyecto al que postulas.</p>
            </div>

            <div className="trabajo-dos__columna">
              <h3>Despliegue y cobertura regional</h3>
              <p>
                Nuestra plataforma acompaña la gestión administrativa y de afiliaciones en varias regiones,
                articulando nodos departamentales y municipales con un esquema centralizado y seguro.
              </p>
              <ul className="pg-vinetas trabajo-dos__regiones">
                <li>Bogotá D.C. (sede principal)</li>
                <li>Cundinamarca</li>
                <li>Antioquia</li>
                <li>Atlántico</li>
                <li>Valle del Cauca</li>
                <li>Bolívar</li>
                <li>Santander</li>
                <li>Boyacá</li>
              </ul>
              <dl className="trabajo-dos__datos">
                <div>
                  <dt>Ecosistema</dt>
                  <dd>Microservicios Node.js / React</dd>
                </div>
                <div>
                  <dt>Infraestructura</dt>
                  <dd>Azure Cloud Service</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="pg-acciones">
            <a
              href="mailto:seleccion@tecnosaludcatolica.com?subject=Postulaci%C3%B3n%20Tecnosalud%20-%20Talento"
              className="pg-boton pg-boton--primario"
            >
              Enviar hoja de vida
            </a>
            <a
              href="https://github.com/CamiloP2103/Tecnosalud-catolica.git"
              target="_blank"
              rel="noreferrer"
              className="pg-boton pg-boton--secundario"
            >
              Ver repositorio en GitHub
            </a>
          </div>
        </>
      )}

      {seccion === 'organigrama' && (
        <>
          <div className="pg-cabecera">
            <h2>Organigrama operativo de Tecnosalud</h2>
            <p className="pg-lead">La estructura institucional y las personas que sostienen el proyecto.</p>
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

          <section className="org-team-section" aria-labelledby="org-team-title">
            <h3 id="org-team-title">Participantes del proyecto</h3>
            <ul className="org-team" aria-label="Participantes ordenados alfabéticamente">
              {contributors.map(({ login }) => (
                <li className="org-contributor" key={login}>
                  <img
                    className="org-contributor__avatar"
                    src={`https://github.com/${login}.png?size=160`}
                    alt={`Foto de ${login}`}
                    loading="lazy"
                  />
                  <div>
                    <h4>@{login}</h4>
                    <a
                      href={`https://github.com/${login}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Perfil de GitHub de ${login}`}
                    >
                      Ver perfil de GitHub
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="pg-bloque">
            <h3 className="pg-bloque__titulo">Canales oficiales y repositorios</h3>
            <div className="pg-acciones">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="pg-boton pg-boton--secundario"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default Nosotros;
