import { useState, useEffect } from 'react';
import './AgendaMedico.css';
import { llamarServicio } from '../../../utils/servicios';
import AtencionMedica from './AtencionMedica';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';

function AgendaMedico({ onAtender }) {
  const [citas, setCitas] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Obtenemos los datos del usuario logueado (médico) desde el localStorage
  const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
  const medicoId = sesion.id || sesion.medico_id || 1;

  const cargarAgenda = async () => {
    setCargando(true);
    setErrorMsg('');
    try {
      // Extraemos el token de autenticación para evitar el error 401
      const token = sesion.token || localStorage.getItem('token');

      // Pasamos las cabeceras con el Token JWT en la petición
      const respuesta = await llamarServicio(`${API_CITAS}/medico/${medicoId}/citas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Validamos la respuesta del servicio
      if (!respuesta || !respuesta.ok) {
        setErrorMsg('No se pudo sincronizar la agenda médica.');
        setCargando(false);
        return;
      }

      // Soportamos tanto si devuelve { citas: [...] } como un array directo
      const datosCitas = respuesta.datos?.citas || respuesta.datos || [];
      setCitas(datosCitas);
    } catch (error) {
      console.error('Error al cargar agenda:', error);
      setErrorMsg('Error de conexión al cargar la agenda.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAgenda();
  }, [medicoId]);

  // Si el médico hizo clic en "Atender", renderizamos el formulario clínico pasando la cita real
  if (citaSeleccionada) {
    return (
      <div className="agenda-wrapper">
        <button 
          type="button" 
          className="btn-volver-agenda"
          onClick={() => {
            setCitaSeleccionada(null);
            if (typeof onAtender === 'function') onAtender();
          }}
        >
          ← Volver a la Agenda
        </button>
        <AtencionMedica 
          cita={citaSeleccionada} 
          onAtencionFinalizada={() => {
            setCitaSeleccionada(null);
            cargarAgenda();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="agenda-container">
      <h2>Agenda Médica y Pacientes Programados</h2>
      <p>Selecciona un paciente de tu lista diaria para gestionar su atención médica e historia clínica.</p>

      {errorMsg && <div className="alert-error" role="alert">{errorMsg}</div>}

      {cargando ? (
        <p className="agenda-loading">Cargando agenda clínica...</p>
      ) : citas.length === 0 ? (
        <p className="agenda-empty">No tienes citas programadas en este momento.</p>
      ) : (
        <div className="agenda-table-wrapper">
          <table className="agenda-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Paciente</th>
                <th>Documento</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {citas.map((c) => (
                <tr key={c.id}>
                  <td>{c.fecha} {c.hora}</td>
                  <td><strong>{c.afiliado_nombre || c.usuarioEmail}</strong></td>
                  <td>{c.afiliado_documento || c.usuarioDoc || 'N/D'}</td>
                  <td>
                    <span className={`badge-estado badge-estado--${(c.estado || 'programada').toLowerCase()}`}>
                      {c.estado || 'PROGRAMADA'}
                    </span>
                  </td>
                  <td>
                    {c.estado === 'ATENDIDA' ? (
                      <span className="texto-atendida">Atendida</span>
                    ) : (
                      <button 
                        type="button"
                        className="btn-atender"
                        onClick={() => setCitaSeleccionada(c)}
                      >
                        Atender Paciente
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AgendaMedico;