import './Afiliados.css';

const DIMENSIONES_DERECHO = [
  {
    id: 'cuidados-paliativos',
    icon: '🕊️',
    titulo: 'Cuidados Paliativos (Ley 1733 de 2014)',
    descripcion: 'Atención integral orientada a aliviar el dolor, el sufrimiento físico, psicológico y espiritual en pacientes con enfermedades terminales, crónicas, degenerativas e irreversibles.'
  },
  {
    id: 'desistimiento-tratamiento',
    icon: '✋',
    titulo: 'Adecuación / Retiro de Esfuerzo Terapéutico',
    descripcion: 'Derecho del paciente a rechazar o suspender tratamientos médicos, procedimientos desproporcionados o medidas de soporte vital que prolonguen la agonía (distanasia).'
  },
  {
    id: 'eutanasia-medica',
    icon: '⚖️',
    titulo: 'Eutanasia Activa (Res. 971 de 2021)',
    descripcion: 'Procedimiento médico que causa la muerte de manera deliberada, indolora y digna, previa solicitud voluntaria, informada e inequívoca del paciente que padezca un intenso sufrimiento derivado de una lesión corporal o enfermedad grave e incurable (Sentencia C-233 de 2021).'
  },
  {
    id: 'suicidio-asistido',
    icon: '🤝',
    titulo: 'Suicidio Médicamente Asistido (SMA)',
    descripcion: 'Despenalizado mediante la Sentencia C-164 de 2022. El médico proporciona los medios o la sustancia letal para que el propio paciente sea quien la ingiera o administre bajo supervisión médica.'
  }
];

const PASOS_SOLICITUD = [
  {
    paso: '1',
    titulo: 'Manifestación Voluntaria',
    detalle: 'El afiliado expresa su decisión de forma verbal o escrita ante su médico tratante. Si no puede comunicarse, se verificará si existe un Documento de Voluntad Anticipada (DVA) previo.'
  },
  {
    paso: '2',
    titulo: 'Valoración Médica',
    detalle: 'El médico tratante evalúa la condición clínica del paciente, el diagnóstico de enfermedad grave/incurable y el sufrimiento intolerable, reiterando las alternativas existentes de cuidados paliativos.'
  },
  {
    paso: '3',
    titulo: 'Comité Científico-Interdisciplinario',
    detalle: 'Se convoca al Comité (integrado por un médico especialista, un abogado y un psicólogo/psiquiatra) para verificar el cumplimiento de los requisitos legales en un plazo máximo de 10 días calendario.'
  },
  {
    paso: '4',
    titulo: 'Programación del Procedimiento',
    detalle: 'Tras la aprobación del Comité, el afiliado o su representante definen la fecha y lugar (institucional o domiciliario) para la realización del procedimiento.'
  }
];

function MuerteDigna() {
  return (
    <section className="page page--afiliados-sub">
      {/* Cabecera */}
      <div className="afiliados-sub__header">
        <span className="afiliados-sub__tag">Marco Legal y Asistencial</span>
        <h2>Derecho Fundamental a Morir con Dignidad</h2>
        <p className="afiliados-sub__lead">
          En <strong>Tecnosalud</strong> garantizamos el respeto irrestricto por la autonomía del paciente, 
          el alivio del sufrimiento y el cumplimiento integral de la jurisprudencia constitucional colombiana.
        </p>
      </div>

      {/* Nota legal / resumen normativo */}
      <div className="triage-info-box">
        <div className="triage-info-box__icon" aria-hidden="true">🏛️</div>
        <div>
          <h3>Marco Constitucional en Colombia</h3>
          <p>
            En Colombia, el derecho a morir dignamente es un derecho fundamental autónomo respaldado por las 
            Sentencias C-239/97, T-970/14, C-233/21 y C-164/22 de la Corte Constitucional, y reglamentado 
            por el Ministerio de Salud. Comprende el acceso a cuidados paliativos, el desistimiento de tratamientos 
            y los procedimientos de eutanasia y suicidio médicamente asistido.
          </p>
        </div>
      </div>

      {/* Dimensiones del derecho */}
      <div className="muerte-digna-section">
        <h3>Mecanismos para Ejercer el Derecho a Morir con Dignidad</h3>
        <div className="muerte-digna-grid">
          {DIMENSIONES_DERECHO.map((item) => (
            <div key={item.id} className="muerte-digna-card">
              <span className="muerte-digna-card__icon" aria-hidden="true">{item.icon}</span>
              <h4>{item.titulo}</h4>
              <p>{item.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Documento de Voluntad Anticipada (DVA) */}
      <div className="dva-card">
        <div className="dva-card__content">
          <span className="dva-card__badge">Prevención y Autonomía</span>
          <h3>Documento de Voluntad Anticipada (DVA)</h3>
          <p>
            Conforme a la <strong>Resolución 2665 de 2018</strong>, toda persona capaz puede formalizar 
            previamente sus decisiones sobre qué tratamientos o intervenciones médicas desea o no recibir al 
            final de su vida, en caso de llegar a un estado que le impida expresar su consentimiento.
          </p>
          <ul className="dva-card__list">
            <li>Puede formalizarse ante Notario Público, ante dos testigos o directamente ante el médico tratante.</li>
            <li>Puede ser modificado, aclarado o revocado en cualquier momento por el titular.</li>
            <li>Tecnosalud permite anexar el DVA al historial clínico digital para consulta inmediata del equipo médico.</li>
          </ul>
        </div>
      </div>

      {/* Ruta / Proceso */}
      <div className="ruta-proceso">
        <h3>Ruta de Atención para Solicitudes en Tecnosalud</h3>
        <div className="ruta-proceso__steps">
          {PASOS_SOLICITUD.map((step) => (
            <div key={step.paso} className="ruta-step">
              <div className="ruta-step__num">{step.paso}</div>
              <div className="ruta-step__info">
                <h4>{step.titulo}</h4>
                <p>{step.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canales de orientación */}
      <div className="canales-ayuda">
        <div className="canales-ayuda__icon" aria-hidden="true">📞</div>
        <div>
          <h4>Comité de Bioética y Asesoría Legal</h4>
          <p>
            Si requieres orientación confidencial, asesoría para la radicación de un DVA o acompañamiento 
            psicosocial y clínico, comunícate con nuestra línea de ética y derechos del afiliado: 
            <strong> 01 8000 123 456</strong> o escribe a <strong>comite.bioetica@tecnosalud.com.co</strong>.
          </p>
        </div>
      </div>
    </section>
  );
}

export default MuerteDigna;