import { useState } from 'react';
import './Styles/PanelMedico.css';
import AgendaMedico from './AgendaMedico';
import AtencionMedica from './AtencionMedica';
import HistorialAtenciones from './HistorialAtenciones';
import GestionHorarios from './GestionHorarios';
import PerfilMedico from './PerfilMedico';

function PanelMedico() {
  const [seccionActiva, setSeccionActiva] = useState('agenda'); // 'agenda' | 'atencion' | 'historial'
  const [citaActual, setCitaActual] = useState(null);

  const handleAtenderCita = (cita) => {
    setCitaActual(cita);
    setSeccionActiva('atencion');
  };

  return (
    
    <div className="panel-medico-layout">
      {/* Menú Lateral / Sidebar */}
      <aside className="panel-medico-sidebar">
        <div className="sidebar-header">
          <h3>Portal Médico</h3>
          <span className="sidebar-role">Profesional de la Salud</span>
        </div>
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
              title={!citaActual ? 'Selecciona una cita desde la agenda primero' : ''}
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
          {/* 👈 2. Nuevo botón para el menú de Horarios */}
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
        {seccionActiva === 'atencion' && (
          <AtencionMedica
            cita={citaActual}
            onAtencionFinalizada={() => {
              setCitaActual(null);
              setSeccionActiva('agenda');
            }}
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