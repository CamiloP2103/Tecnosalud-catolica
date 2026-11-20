import Imagen from '../../Imagen/Imagen';
import '../../../styles/paginas.css';

const MECANISMOS = [
  {
    id: 'cuidados-paliativos',
    titulo: 'Cuidados paliativos (Ley 1733 de 2014)',
    descripcion:
      'Atención integral orientada a aliviar el dolor y el sufrimiento físico, psicológico y espiritual en pacientes con enfermedades terminales, crónicas, degenerativas e irreversibles.',
  },
  {
    id: 'desistimiento-tratamiento',
    titulo: 'Adecuación o retiro del esfuerzo terapéutico',
    descripcion:
      'Derecho del paciente a rechazar o suspender tratamientos, procedimientos desproporcionados o medidas de soporte vital que prolonguen la agonía (distanasia).',
  },
  {
    id: 'eutanasia-medica',
    titulo: 'Eutanasia (Res. 971 de 2021)',
    descripcion:
      'Procedimiento médico que causa la muerte de manera deliberada, indolora y digna, previa solicitud voluntaria, informada e inequívoca del paciente que padezca un intenso sufrimiento derivado de una lesión corporal o enfermedad grave e incurable (Sentencia C-233 de 2021).',
  },
  {
    id: 'suicidio-asistido',
    titulo: 'Suicidio médicamente asistido',
    descripcion:
      'Despenalizado mediante la Sentencia C-164 de 2022. El médico proporciona los medios o la sustancia para que el propio paciente la ingiera o administre bajo supervisión médica.',
  },
];

const PASOS_SOLICITUD = [
  {
    paso: '1',
    titulo: 'Manifestación voluntaria',
    detalle:
      'El afiliado expresa su decisión de forma verbal o escrita ante su médico tratante. Si no puede comunicarse, se verifica si existe un Documento de Voluntad Anticipada (DVA) previo.',
  },
  {
    paso: '2',
    titulo: 'Valoración médica',
    detalle:
      'El médico tratante evalúa la condición clínica, el diagnóstico de enfermedad grave o incurable y el sufrimiento intolerable, y reitera las alternativas de cuidados paliativos.',
  },
  {
    paso: '3',
    titulo: 'Comité científico-interdisciplinario',
    detalle:
      'Se convoca al Comité (un médico especialista, un abogado y un psicólogo o psiquiatra) para verificar los requisitos legales en un plazo máximo de 10 días calendario.',
  },
  {
    paso: '4',
    titulo: 'Programación del procedimiento',
    detalle:
      'Tras la aprobación del Comité, el afiliado o su representante definen la fecha y el lugar (institucional o domiciliario) del procedimiento.',
  },
];

function MuerteDigna() {
  return (
    <section className="pg">
      <div className="pg-fila">
        <div className="pg-fila__texto">
          <h2>Derecho fundamental a morir con dignidad</h2>
          <p className="pg-lead">
            En <strong>Tecnosalud</strong> respetamos la autonomía del paciente, procuramos el alivio del sufrimiento
            y cumplimos la jurisprudencia constitucional colombiana.
          </p>
          <p>
            En Colombia, el derecho a morir dignamente es un derecho fundamental autónomo, respaldado por las
            Sentencias C-239/97, T-970/14, C-233/21 y C-164/22 de la Corte Constitucional y reglamentado por el
            Ministerio de Salud. Comprende el acceso a cuidados paliativos, el desistimiento de tratamientos y los
            procedimientos de eutanasia y suicidio médicamente asistido.
          </p>
        </div>
        <div className="pg-fila__medio">
          <Imagen nombre="muerte-digna-1" alt="Enfermera y familiar acompañando a un paciente en su habitación" />
        </div>
      </div>

      <section className="pg-bloque">
        <h3 className="pg-bloque__titulo">Mecanismos para ejercer este derecho</h3>
        <ul className="pg-lista">
          {MECANISMOS.map((item) => (
            <li key={item.id} className="pg-item">
              <h4>{item.titulo}</h4>
              <p>{item.descripcion}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="pg-fila pg-fila--inversa">
        <div className="pg-fila__texto">
          <h3>Documento de Voluntad Anticipada (DVA)</h3>
          <p>
            Conforme a la <strong>Resolución 2665 de 2018</strong>, toda persona capaz puede formalizar de antemano
            qué tratamientos o intervenciones médicas desea o no recibir al final de su vida, por si llega a un
            estado que le impida expresar su consentimiento.
          </p>
          <ul className="pg-vinetas">
            <li>Puede formalizarse ante notario, ante dos testigos o directamente ante el médico tratante.</li>
            <li>El titular puede modificarlo, aclararlo o revocarlo en cualquier momento.</li>
            <li>Tecnosalud permite anexarlo al historial clínico digital para consulta inmediata del equipo médico.</li>
          </ul>
        </div>
        <div className="pg-fila__medio">
          <Imagen nombre="muerte-digna-2" alt="Profesional de la salud escuchando a un afiliado en una sesión de orientación" />
        </div>
      </div>

      <section className="pg-bloque">
        <h3 className="pg-bloque__titulo">Ruta de atención para solicitudes en Tecnosalud</h3>
        <ol className="pg-lista">
          {PASOS_SOLICITUD.map((step) => (
            <li key={step.paso} className="pg-item pg-item--paso">
              <span className="pg-item__numero">{step.paso}</span>
              <h4>{step.titulo}</h4>
              <p>{step.detalle}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="pg-nota">
        <h4>Comité de Bioética y asesoría legal</h4>
        <p>
          Si necesitas orientación confidencial, asesoría para radicar un DVA o acompañamiento psicosocial y clínico,
          comunícate con nuestra línea de ética y derechos del afiliado: <strong>01 8000 123 456</strong>, o escribe a{' '}
          <strong>comite.bioetica@tecnosalud.com.co</strong>.
        </p>
      </aside>
    </section>
  );
}

export default MuerteDigna;
