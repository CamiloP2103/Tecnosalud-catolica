import { useState } from 'react';
import './Styles/PanelMedico.css';
import AgendaMedico from './AgendaMedico';
import AtencionMedica from './AtencionMedica';
import HistorialAtenciones from './HistorialAtenciones';
import GestionHorarios from './GestionHorarios';
import PerfilMedico from './PerfilMedico';

function PanelMedico() {
  const [seccionActiva, setSeccionActiva] = useState('agenda');
  const [citaActual, setCitaActual] = useState(null);

  const handleAtenderCita = (cita) => {
    if (!cita) return;
    setCitaActual(cita);
  };

  const handleFinalizarAtencion = () => {
    setCitaActual(null);
    setSeccionActiva('agenda');
  };

  return (
    <div className="panel-medico-layout">
      {/* Menú Lateral / Sidebar */}
      <aside className="panel-medico-sidebar">
        <div className="sidebar-seccion-titulo">GESTIÓN CLÍNICA</div>
        <ul className="sidebar-menu">
          <li>
            <button
              type="button"
              className={`sidebar-btn ${seccionActiva === 'agenda' ? 'active' : ''}`}
              onClick={() => setSeccionActiva('agenda')}
            >
              Mi Agenda y Citas
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`sidebar-btn ${seccionActiva === 'atencion' ? 'active' : ''}`}
              onClick={() => setSeccionActiva('atencion')}
              disabled={!citaActual}
              title={!citaActual ? 'Selecciona una cita desde la agenda primero' : 'Continuar con la atención en curso'}
            >
              Atención Médica Actual
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`sidebar-btn ${seccionActiva === 'historial' ? 'active' : ''}`}
              onClick={() => setSeccionActiva('historial')}
            >
              Historial de Atenciones
            </button>
          </li>
        </ul>

        <div className="sidebar-seccion-titulo">CONFIGURACIÓN Y PERFIL</div>
        <ul className="sidebar-menu">
          <li>
            <button
              type="button"
              className={`sidebar-btn ${seccionActiva === 'horarios' ? 'active' : ''}`}
              onClick={() => setSeccionActiva('horarios')}
            >
              Mis Horarios
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`sidebar-btn ${seccionActiva === 'perfil' ? 'active' : ''}`}
              onClick={() => setSeccionActiva('perfil')}
            >
              Mi Perfil
            </button>
          </li>
        </ul>
      </aside>

      {/* Contenido Dinámico Principal */}
      <main className="panel-medico-content">
        {seccionActiva === 'agenda' && (
          <AgendaMedico onAtender={handleAtenderCita} />
        )}
        {seccionActiva === 'atencion' && citaActual && (
          <AtencionMedica
            cita={citaActual}
            onAtencionFinalizada={handleFinalizarAtencion}
          />
        )}
        {seccionActiva === 'historial' && (
          <div className="historial-modulo-card">
            <h2>Historial de Atenciones Clínicas</h2>
            <HistorialAtenciones />
            <p>Consulta de registros médicos previos, recetas e incapacidades emitidas por el profesional.</p>
          </div>
        )}
        {seccionActiva === 'horarios' && (
          <GestionHorarios />
        )}
        {seccionActiva === 'perfil' && <PerfilMedico />}
      </main>
    </div>
  );
}

export default PanelMedico;