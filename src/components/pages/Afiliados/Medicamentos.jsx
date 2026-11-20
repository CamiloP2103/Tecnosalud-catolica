import { useState } from 'react';
import Imagen from '../../Imagen/Imagen';
import '../../../styles/paginas.css';
import './Styles/Medicamentos.css';

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
    titulo: 'Puntos de dispensación',
    descripcion:
      'Red de farmacias aliadas a nivel nacional para reclamar presencialmente con tu fórmula médica digital y tu documento de identidad.',
  },
  {
    titulo: 'Entrega a domicilio',
    descripcion:
      'Disponible para mayores de 60 años, personas con movilidad reducida o afiliados con patologías crónicas priorizadas.',
  },
  {
    titulo: 'Autorizaciones MIPRES',
    descripcion:
      'Gestión y seguimiento en línea de medicamentos no incluidos en el PBS, formulados por tu médico especialista.',
  },
  {
    titulo: 'Fórmula recurrente',
    descripcion:
      'Renovación automática y recordatorio mensual para tratamientos de control y enfermedades crónicas.',
  },
];

function Medicamentos() {
  const [busqueda, setBusqueda] = useState('');

  const medicamentosFiltrados = MOCK_MEDICAMENTOS.filter(
    (med) =>
      med.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      med.tipo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <section className="pg">
      <div className="pg-cabecera">
        <h2>Gestión y entrega de medicamentos</h2>
        <p className="pg-lead">
          En <strong>Tecnosalud</strong> facilitamos el acceso oportuno, seguro y transparente a los medicamentos
          formulados por tu equipo médico, con cobertura y trazabilidad digital.
        </p>
      </div>

      <div className="meds-search-box">
        <h3>Consulta rápida de disponibilidad</h3>
        <p className="meds-search-box__ayuda">Busca por nombre del principio activo o por categoría médica.</p>

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
                  <th>Canal de entrega</th>
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
              No se encontraron coincidencias para &ldquo;{busqueda}&rdquo;. Consulta con tu médico tratante o
              comunícate con la línea de farmacia.
            </p>
          )}
        </div>
      </div>

      <div className="pg-fila">
        <div className="pg-fila__texto">
          <h3>Modalidades de dispensación y servicios</h3>
          <div className="pg-apilado">
            {MODALIDADES_ENTREGA.map((item) => (
              <div key={item.titulo}>
                <h4>{item.titulo}</h4>
                <p>{item.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="pg-fila__medio">
          <Imagen nombre="medicamentos-1" alt="Persona recibiendo atención en el mostrador de una farmacia" relacion="4 / 5" />
        </div>
      </div>

      <div className="pg-fila pg-fila--inversa">
        <div className="pg-fila__texto">
          <h3>Requisitos para reclamar tus medicamentos</h3>
          <ul className="pg-vinetas">
            <li>
              <strong>Fórmula médica vigente:</strong> tiene validez de 30 días calendario desde su expedición.
            </li>
            <li>
              <strong>Documento de identidad original:</strong> del afiliado y, si un tercero reclama, también el de
              la persona autorizada.
            </li>
            <li>
              <strong>Carta de autorización:</strong> si el titular no puede asistir, debe adjuntarse firmada y con
              copia de ambos documentos.
            </li>
            <li>
              <strong>Trazabilidad en la app:</strong> activa las notificaciones para saber cuándo tu pedido está
              listo para entrega o despacho.
            </li>
          </ul>
        </div>
        <div className="pg-fila__medio">
          <Imagen nombre="medicamentos-2" alt="Farmacéutica entregando una fórmula médica a una afiliada" />
        </div>
      </div>
    </section>
  );
}

export default Medicamentos;
