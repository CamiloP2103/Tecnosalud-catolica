import { useState } from 'react';
import './Afiliados.css';

const MOCK_MEDICAMENTOS = [
  { id: '1', nombre: 'Losartán 50mg', tipo: 'Antihipertensivo', cobertura: 'PBS', estado: 'Disponible', entrega: 'Farmacia Principal / Domicilio' },
  { id: '2', nombre: 'Metformina 850mg', tipo: 'Antidiabético', cobertura: 'PBS', estado: 'Disponible', entrega: 'Farmacia Principal / Domicilio' },
  { id: '3', nombre: 'Atorvastatina 20mg', tipo: 'Hipolipemiante', cobertura: 'PBS', estado: 'Disponible', entrega: 'Farmacia Principal' },
  { id: '4', nombre: 'Empagliflozina 10mg', tipo: 'Antidiabético / Cardio', cobertura: 'MIPRES / No PBS', estado: 'Requiere Autorización', entrega: 'Farmacia Especializada' },
  { id: '5', nombre: 'Salbutamol Inhalador 100mcg', tipo: 'Broncodilatador', cobertura: 'PBS', estado: 'Disponible', entrega: 'Farmacia Principal / Domicilio' },
  { id: '6', nombre: 'Levotiroxina 50mcg', tipo: 'Hormona Tiroidea', cobertura: 'PBS', estado: 'Disponible', entrega: 'Farmacia Principal' },
];

const MODALIDADES_ENTREGA = [
  {
    icon: '🏪',
    titulo: 'Puntos de Dispensación',
    descripcion: 'Red de farmacias aliadas a nivel nacional para el reclamo presencial con tu fórmula médica digital y documento de identidad.'
  },
  {
    icon: '🛵',
    titulo: 'Entrega a Domicilio',
    descripcion: 'Disponible para pacientes mayores de 60 años, personas con movilidad reducida o afiliados con patologías crónicas priorizadas.'
  },
  {
    icon: '📑',
    titulo: 'Autorizaciones MIPRES',
    descripcion: 'Gestión y seguimiento en línea de medicamentos no incluidos en el PBS formulados por tu médico especialista.'
  },
  {
    icon: '🔄',
    titulo: 'Fórmula Recurrente',
    descripcion: 'Renovación automática y recordatorio mensual para tratamientos de control y enfermedades crónicas.'
  }
];

function Medicamentos() {
  const [busqueda, setBusqueda] = useState('');

  const medicamentosFiltrados = MOCK_MEDICAMENTOS.filter((med) =>
    med.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    med.tipo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <section className="page page--afiliados-sub">
      {/* Cabecera */}
      <div className="afiliados-sub__header">
        <span className="afiliados-sub__tag">Servicio Farmacéutico</span>
        <h2>Gestión y Entrega de Medicamentos</h2>
        <p className="afiliados-sub__lead">
          En <strong>Tecnosalud</strong> facilitamos el acceso oportuno, seguro y transparente a los medicamentos 
          formulados por tu equipo médico, garantizando cobertura y trazabilidad digital.
        </p>
      </div>

      {/* Buscador de medicamentos / consulta rápida */}
      <div className="meds-search-box">
        <div className="meds-search-box__header">
          <span className="meds-search-box__icon" aria-hidden="true">🔍</span>
          <div>
            <h3>Consulta Rápida de Disponibilidad</h3>
            <p>Busca por nombre del principio activo o categoría médica:</p>
          </div>
        </div>
        
        <input
          type="text"
          className="meds-search-input"
          placeholder="Ej. Losartán, Metformina, Inhalador..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar medicamento"
        />

        <div className="meds-results">
          {medicamentosFiltrados.length > 0 ? (
            <table className="meds-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Categoría</th>
                  <th>Cobertura</th>
                  <th>Estado</th>
                  <th>Canal de Entrega</th>
                </tr>
              </thead>
              <tbody>
                {medicamentosFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.nombre}</strong></td>
                    <td>{item.tipo}</td>
                    <td>
                      <span className={`med-badge med-badge--${item.cobertura.includes('MIPRES') ? 'mipres' : 'pbs'}`}>
                        {item.cobertura}
                      </span>
                    </td>
                    <td>
                      <span className={`med-status med-status--${item.estado === 'Disponible' ? 'ok' : 'pending'}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td>{item.entrega}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="meds-no-results">
              No se encontraron coincidencias para "{busqueda}". Consulta con tu médico tratante o comunícate con la línea de farmacia.
            </p>
          )}
        </div>
      </div>

      {/* Modalidades de Entrega */}
      <div className="meds-services">
        <h3>Modalidades de Dispensación y Servicios</h3>
        <div className="meds-services__grid">
          {MODALIDADES_ENTREGA.map((item, idx) => (
            <div key={idx} className="med-service-card">
              <span className="med-service-card__icon" aria-hidden="true">{item.icon}</span>
              <h4>{item.titulo}</h4>
              <p>{item.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Requisitos para reclamo */}
      <div className="dva-card">
        <div className="dva-card__content">
          <span className="dva-card__badge">Información Importante</span>
          <h3>Requisitos para el Reclamo de Medicamentos</h3>
          <ul className="dva-card__list">
            <li><strong>Fórmula médica vigente:</strong> Tiene una validez de 30 días calendario a partir de su expedición.</li>
            <li><strong>Documento de identidad original:</strong> Del afiliado y de la persona autorizada (en caso de que un tercero reclame).</li>
            <li><strong>Carta de autorización:</strong> Si el titular no puede asistir, adjuntar carta firmada con copia de ambos documentos.</li>
            <li><strong>Trazabilidad en app:</strong> Puedes activar notificaciones para saber en tiempo real cuándo tu pedido esté listo para entrega o despacho.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default Medicamentos;