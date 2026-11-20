import Imagen from '../../Imagen/Imagen';
import '../../../styles/paginas.css';
import './Styles/Triage.css';

const NIVELES_TRIAGE = [
  {
    nivel: 'Triage I',
    color: 'rojo',
    tiempo: 'Atención inmediata',
    descripcion: 'Riesgo vital inminente que compromete la vida del paciente (paro cardiorrespiratorio, politraumatismo severo, pérdida de conciencia, hemorragia masiva).',
    badge: 'Resucitación / Emergencia',
  },
  {
    nivel: 'Triage II',
    color: 'naranja',
    tiempo: 'Hasta 30 minutos',
    descripcion: 'Condición crítica con alto riesgo de deterioro rápido o daño irreversible (dolor torácico sugestivo de infarto, dificultad respiratoria severa, déficit neurológico súbito).',
    badge: 'Emergencia',
  },
  {
    nivel: 'Triage III',
    color: 'amarillo',
    tiempo: 'Hasta 60 minutos',
    descripcion: 'Condición médica que requiere intervención diagnóstica o terapéutica, pero con estabilidad hemodinámica (cólico renal agudo, fracturas cerradas, fiebre alta sin convulsión).',
    badge: 'Urgencia',
  },
  {
    nivel: 'Triage IV',
    color: 'verde',
    tiempo: 'Hasta 120 - 180 minutos',
    descripcion: 'Condiciones de baja complejidad sin riesgo de deterioro inminente. Pueden atenderse por consulta prioritaria o ambulatoria (amigdalitis, esguinces leves, diarrea sin deshidratación).',
    badge: 'Urgencia menor',
  },
  {
    nivel: 'Triage V',
    color: 'azul',
    tiempo: 'Hasta 240 minutos',
    descripcion: 'Condición clínica que no compromete el estado general y no representa una urgencia. Se canaliza a consulta externa programada (dolores crónicos, control de síntomas leves).',
    badge: 'No urgente',
  },
];

const RECOMENDACIONES = [
  {
    titulo: 'Documentación',
    texto: 'Presenta tu documento de identidad original y tu carné de afiliación digital desde la app de Tecnosalud.',
  },
  {
    titulo: 'Historial y medicamentos',
    texto: 'Informa sobre alergias conocidas, tratamientos farmacológicos actuales o antecedentes quirúrgicos.',
  },
  {
    titulo: 'Reclasificación',
    texto: 'Si durante la espera tus síntomas empeoran, avisa de inmediato al personal del módulo de Triage.',
  },
];

function Triage() {
  return (
    <section className="pg">
      <div className="pg-fila">
        <div className="pg-fila__texto">
          <h2>Sistema de clasificación Triage</h2>
          <p className="pg-lead">
            En <strong>Tecnosalud</strong> aplicamos el estándar normativo de clasificación médica para que la
            atención de urgencias se brinde según la gravedad clínica del paciente y no por orden de llegada.
          </p>
          <p>
            Al ingresar a urgencias, el personal de enfermería o medicina valora tus signos vitales y síntomas
            principales en una estación digital de clasificación. No es una consulta médica completa: es una
            evaluación rápida para asignarte un nivel de prioridad de I a V.
          </p>
        </div>
        <div className="pg-fila__medio">
          <Imagen nombre="triage-1" alt="Personal de salud atendiendo a un afiliado en la ventanilla de ingreso" />
        </div>
      </div>

      <section className="pg-bloque">
        <h3 className="pg-bloque__titulo">Niveles de priorización clínica</h3>
        <div className="triage-levels__grid">
          {NIVELES_TRIAGE.map((item) => (
            <div key={item.nivel} className={`triage-card triage-card--${item.color}`}>
              <div className="triage-card__header">
                <span className="triage-card__title">{item.nivel}</span>
                <span className="triage-card__badge">{item.badge}</span>
              </div>
              <p className="triage-card__time">
                <strong>Tiempo estimado:</strong> {item.tiempo}
              </p>
              <p className="triage-card__desc">{item.descripcion}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pg-fila pg-fila--inversa">
        <div className="pg-fila__texto">
          <h3>Qué debes tener en cuenta al acudir a urgencias</h3>
          <div className="pg-apilado">
            {RECOMENDACIONES.map((item) => (
              <div key={item.titulo}>
                <h4>{item.titulo}</h4>
                <p>{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="pg-fila__medio">
          <Imagen nombre="triage-2" alt="Sala de espera con personal de salud orientando a los afiliados" />
        </div>
      </div>
    </section>
  );
}

export default Triage;
