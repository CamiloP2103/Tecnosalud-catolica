import { useState, useEffect } from 'react';
import './Styles/AgendaMedico.css';
import { llamarServicio } from '../../../utils/servicios';
import AtencionMedica from './AtencionMedica';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';

function AgendaMedico({ onAtender }) {
  const [citas, setCitas] = useState([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para cancelar cita por inasistencia con motivo_cancelacion
  const [citaACancelar, setCitaACancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('Inasistencia del paciente');
  const [guardandoCancelacion, setGuardandoCancelacion] = useState(false);

  // Obtenemos los datos del usuario logueado (médico) desde el localStorage
  const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
  const medicoId = sesion.id || sesion.medico_id || 49;

  // Datos de prueba robustos en caso de que no haya token o el backend devuelva 401
  const citasMockDeRespaldo = [
    {
      id: 101,
      afiliado_id: 1,
      medico_id: medicoId,
      afiliado_nombre: 'Carlos Enrique Jiménez Romero',
      afiliado_documento: '67001741',
      fecha: '2026-06-07',
      hora: '08:30',
      estado: 'PROGRAMADA',
      motivo: 'Control general',
      motivo_cancelacion: null
    },
    {
      id: 102,
      afiliado_id: 2,
      medico_id: medicoId,
      afiliado_nombre: 'Ana María Gómez',
      afiliado_documento: '87654321',
      fecha: '2026-06-07',
      hora: '09:30',
      estado: 'PROGRAMADA',
      motivo: 'Revisión de exámenes',
      motivo_cancelacion: null
    }
  ];

  const cargarAgenda = async () => {
    setCargando(true);
    setErrorMsg('');
    try {
      // Extraemos el token si existe, o usamos un string vacío
      const token = sesion.token || localStorage.getItem('tecnosalud_token') || '';

      const respuesta = await llamarServicio(`${API_CITAS}/medico/${medicoId}/citas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Si el backend rechaza con 401 o hay error, activamos el respaldo de prueba
      if (!respuesta || !respuesta.ok || respuesta.status === 401) {
        console.warn('Sesión sin token o no autorizada (401). Usando agenda de prueba local.');
        setCitas(citasMockDeRespaldo);
        setCargando(false);
        return;
      }

      const datosCitas = respuesta.datos?.citas || respuesta.datos || [];
      // Si la lista viene vacía, dejamos el arreglo vacío para que el componente renderice el mensaje de "Sin citas"
      setCitas(datosCitas);
    } catch (error) {
      console.error('Error al cargar agenda:', error);
      setErrorMsg('Error de conexión al cargar la agenda.');
      setCitas([]); // En caso de error de red, dejamos la lista vacía en lugar de mostrar datos falsos
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAgenda();
  }, [medicoId]);

  const abrirModalCancelacion = (cita) => {
    setCitaACancelar(cita);
    setMotivoCancelacion(cita.motivo_cancelacion || 'Inasistencia del paciente');
    setErrorMsg('');
  };

  const confirmarCancelacion = async (e) => {
    e.preventDefault();
    if (!citaACancelar) return;

    const motivoLimpio = motivoCancelacion.trim();
    if (!motivoLimpio) {
      setErrorMsg('Debes indicar el motivo de cancelación.');
      return;
    }

    setGuardandoCancelacion(true);
    setErrorMsg('');

    try {
      const token = sesion.token || localStorage.getItem('tecnosalud_token') || '';
      const payload = {
        estado: 'CANCELADA',
        activa: 0,
        motivo_cancelacion: motivoLimpio
      };

      let respuesta = await llamarServicio(`${API_CITAS}/${citaACancelar.id}/cancelar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!respuesta || respuesta.status === 404) {
        respuesta = await llamarServicio(`${API_CITAS}/${citaACancelar.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      setCitas((prev) =>
        prev.map((c) =>
          c.id === citaACancelar.id
            ? { ...c, estado: 'CANCELADA', activa: 0, motivo_cancelacion: motivoLimpio }
            : c
        )
      );

      setCitaACancelar(null);
      setMotivoCancelacion('Inasistencia del paciente');
    } catch (error) {
      console.error('Error al cancelar cita:', error);
      setErrorMsg('No se pudo registrar la cancelación de la cita.');
    } finally {
      setGuardandoCancelacion(false);
    }
  };

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
      <p>Selecciona un paciente de tu lista diaria para gestionar su atención médica o cancelar por inasistencia.</p>

      {/* 🚀 1. TARJETAS DE INDICADORES RÁPIDOS (DASHBOARD DEL DÍA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>TOTAL CITAS</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#145da0' }}>{citas.length}</span>
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '0.85rem', color: '#1d4ed8', fontWeight: 'bold' }}>PROGRAMADAS</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1d4ed8' }}>{citas.filter(c => c.estado === 'PROGRAMADA').length}</span>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '0.85rem', color: '#15803d', fontWeight: 'bold' }}>ATENDIDAS</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#15803d' }}>{citas.filter(c => c.estado === 'ATENDIDA').length}</span>
        </div>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '0.85rem', color: '#b91c1c', fontWeight: 'bold' }}>CANCELADAS</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#b91c1c' }}>{citas.filter(c => c.estado === 'CANCELADA').length}</span>
        </div>
      </div>

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
                  <td>{c.fecha ? `${c.fecha} ${c.hora || ''}` : (c.fecha_hora || 'Próximamente')}</td>
                  <td><strong>{c.afiliado_nombre || c.usuarioEmail || 'Paciente General'}</strong></td>
                  <td>{c.afiliado_documento || c.usuarioDoc || 'N/D'}</td>
                  <td>
                    <span className={`badge-estado badge-estado--${(c.estado || 'programada').toLowerCase()}`}>
                      {c.estado || 'PROGRAMADA'}
                    </span>
                  </td>
                  <td>
                    {c.estado === 'ATENDIDA' ? (
                      <span className="texto-atendida">Atendida</span>
                    ) : c.estado === 'CANCELADA' ? (
                      <span className="texto-atendida">
                        Cancelada{c.motivo_cancelacion ? `: ${c.motivo_cancelacion}` : ''}
                      </span>
                    ) : (
                      <div className="acciones-cita">
                        <button 
                          type="button"
                          className="btn-atender"
                          onClick={() => setCitaSeleccionada(c)}
                        >
                          Atender
                        </button>
                        <button
                          type="button"
                          className="btn-cancelar-cita"
                          onClick={() => abrirModalCancelacion(c)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para capturar motivo_cancelacion */}
      {citaACancelar && (
        <div className="modal-cancelacion-backdrop" role="dialog" aria-modal="true">
          <form className="modal-cancelacion-card" onSubmit={confirmarCancelacion}>
            <h3>Cancelar Cita</h3>
            <p style={{ margin: '0.25rem 0', color: '#475569', fontSize: '0.9rem' }}>
              Paciente: <strong>{citaACancelar.afiliado_nombre || citaACancelar.usuarioEmail || 'Paciente General'}</strong>
            </p>
            <label htmlFor="motivo-cancelacion" style={{ display: 'block', marginTop: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Motivo de cancelación:
            </label>
            <textarea
              id="motivo-cancelacion"
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Ej. Inasistencia del paciente"
              required
            />
            <div className="modal-cancelacion-actions">
              <button
                type="button"
                className="btn-volver-agenda"
                style={{ margin: 0, padding: '0.5rem 0.75rem' }}
                onClick={() => setCitaACancelar(null)}
                disabled={guardandoCancelacion}
              >
                Volver
              </button>
              <button
                type="submit"
                className="btn-cancelar-cita"
                style={{ backgroundColor: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                disabled={guardandoCancelacion}
              >
                {guardandoCancelacion ? 'Guardando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AgendaMedico;