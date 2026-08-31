import './Afiliados.css';

const NIVELES_TRIAGE = [
  {
    nivel: 'Triage I',
    color: 'rojo',
    tiempo: 'Atención Inmediata',
    descripcion: 'Riesgo vital inminente que compromete la vida del paciente (paro cardiorrespiratorio, politraumatismo severo, pérdida de conciencia, hemorragia masiva).',
    badge: 'Resucitación / Emergencia'
  },
  {
    nivel: 'Triage II',
    color: 'naranja',
    tiempo: 'Hasta 30 minutos',
    descripcion: 'Condición crítica con alto riesgo de deterioro rápido o daño irreversible (dolor torácico sugestivo de infarto, dificultad respiratoria severa, déficit neurológico súbito).',
    badge: 'Emergencia'
  },
  {
    nivel: 'Triage III',
    color: 'amarillo',
    tiempo: 'Hasta 60 minutos',
    descripcion: 'Condición médica que requiere intervención diagnóstica o terapéutica pero con estabilidad hemodinámica (cólico renal agudo, fracturas cerradas, fiebre alta sin convulsión).',
    badge: 'Urgencia'
  },
  {
    nivel: 'Triage IV',
    color: 'verde',
    tiempo: 'Hasta 120 - 180 minutos',
    descripcion: 'Condiciones médicas de baja complejidad sin riesgo de deterioro inminente. Puede ser atendido por consulta prioritaria o ambulatoria (amigdalitis, esguinces leves, diarrea sin deshidratación).',
    badge: 'Urgencia Menor'
  },
  {
    nivel: 'Triage V',
    color: 'azul',
    tiempo: 'Hasta 240 minutos',
    descripcion: 'Condición clínica que no compromete el estado general y no representa una urgencia. Se canaliza a consulta externa programada (dolores crónicos, control de síntomas leves).',
    badge: 'No Urgente'
  }
];

function Triage() {
  return (
    <section className="page page--afiliados-sub">
      {/* Cabecera */}
      <div className="afiliados-sub__header">
        <span className="afiliados-sub__tag">Servicio al Afiliado</span>
        <h2>Sistema de Clasificación Triage</h2>
        <p className="afiliados-sub__lead">
          En <strong>Tecnosalud</strong> aplicamos el estándar normativo de clasificación médica para garantizar 
          que la atención de urgencias se brinde según la gravedad clínica del paciente y no por orden de llegada.
        </p>
      </div>

      {/* Qué es el Triage */}
      <div className="triage-info-box">
        <div className="triage-info-box__icon" aria-hidden="true">⏱️</div>
        <div>
          <h3>¿Cómo funciona el Triage en Tecnosalud?</h3>
          <p>
            Al ingresar al servicio de urgencias, el personal de enfermería o medicina valorará tus signos vitales 
            y síntomas principales en una estación digital de clasificación. Este proceso no es una consulta médica 
            completa, sino una evaluación rápida para asignarte un nivel de prioridad de I a V.
          </p>
        </div>
      </div>

      {/* Lista de Niveles de Triage */}
      <div className="triage-levels">
        <h3>Niveles de Priorización Clínica</h3>
        <div className="triage-levels__grid">
          {NIVELES_TRIAGE.map((item) => (
            <div key={item.nivel} className={`triage-card triage-card--${item.color}`}>
              <div className="triage-card__header">
                <span className="triage-card__title">{item.nivel}</span>
                <span className="triage-card__badge">{item.badge}</span>
              </div>
              <div className="triage-card__time">
                <strong>Tiempo estimado:</strong> {item.tiempo}
              </div>
              <p className="triage-card__desc">{item.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recomendaciones al paciente */}
      <div className="triage-guide">
        <h3>¿Qué debes tener en cuenta al acudir a Urgencias?</h3>
        <div className="triage-guide__grid">
          <div className="triage-guide__item">
            <span className="triage-guide__icon" aria-hidden="true">📋</span>
            <h4>Documentación</h4>
            <p>Presenta tu documento de identidad original y carné de afiliación digital desde la app de Tecnosalud.</p>
          </div>
          <div className="triage-guide__item">
            <span className="triage-guide__icon" aria-hidden="true">💊</span>
            <h4>Historial y Medicamentos</h4>
            <p>Informa sobre alergias conocidas, tratamientos farmacológicos actuales o antecedentes quirúrgicos.</p>
          </div>
          <div className="triage-guide__item">
            <span className="triage-guide__icon" aria-hidden="true">🔄</span>
            <h4>Reclasificación</h4>
            <p>Si durante la espera en sala sientes que tus síntomas empeoran, notifica de inmediato al personal del módulo de Triage.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Triage;