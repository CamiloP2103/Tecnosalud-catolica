import { useState, useEffect } from 'react';
import './AtencionMedica.css'; // Podemos reutilizar estilos limpios de tablas y tarjetas
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function GestionHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [medicoId, setMedicoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Estado para un nuevo horario a agregar
  const [nuevoDia, setNuevoDia] = useState('Lunes');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('16:00');

  useEffect(() => {
    cargarHorariosMedico();
  }, []);

  const cargarHorariosMedico = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('tecnosalud_token') || '';
      const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
      const usuarioId = sesion.id;

      if (!usuarioId) {
        setMensaje({ texto: 'No se encontró la sesión del usuario.', tipo: 'error' });
        setCargando(false);
        return;
      }

      // Consultamos los horarios usando el endpoint que conecta con el usuario_id
      const respuesta = await llamarServicio(`${API_CITAS}/horarios/usuario/${usuarioId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (respuesta.ok && respuesta.datos) {
        setHorarios(respuesta.datos.horarios || []);
        setMedicoId(respuesta.datos.medicoId);
      } else {
        setMensaje({ texto: respuesta.datos?.error || 'No se pudieron cargar los horarios.', tipo: 'error' });
      }
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Error de conexión al cargar los horarios.', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  const handleAgregarHorario = (e) => {
    e.preventDefault();
    if (horaInicio >= horaFin) {
      setMensaje({ texto: 'La hora de inicio debe ser menor a la hora de fin.', tipo: 'error' });
      return;
    }

    // Evitamos duplicados exactos para el mismo día con solapamiento simple
    const duplicado = horarios.some(h => h.diaSemana === nuevoDia && h.horaInicio === horaInicio);
    if (duplicado) {
      setMensaje({ texto: `Ya tienes registrado un horario que inicia a las ${horaInicio} el día ${nuevoDia}.`, tipo: 'error' });
      return;
    }

    const actualizados = [...horarios, { diaSemana: nuevoDia, horaInicio, horaFin }];
    setHorarios(actualizados);
    setMensaje({ texto: '', tipo: '' });
  };

  const handleEliminarHorario = (index) => {
    const actualizados = horarios.filter((_, i) => i !== index);
    setHorarios(actualizados);
  };

  const handleGuardarCambios = async () => {
    if (!medicoId) return;
    setGuardando(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      const token = localStorage.getItem('tecnosalud_token') || '';
      const respuesta = await llamarServicio(`${API_CITAS}/horarios/medico/${medicoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ horarios })
      });

      if (respuesta.ok) {
        setMensaje({ texto: '¡Horarios actualizados exitosamente!', tipo: 'exito' });
      } else {
        setMensaje({ texto: respuesta.datos?.error || 'Error al guardar los cambios.', tipo: 'error' });
      }
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Error de red al guardar los horarios.', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="atencion-container">
      <h2>Mi Disponibilidad y Horarios de Atención</h2>
      <p>Configura los días de la semana y las franjas horarias en las que los pacientes podrán agendar citas contigo.</p>

      {mensaje.texto && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '1rem',
          backgroundColor: mensaje.tipo === 'error' ? '#fee2e2' : '#dcfce7',
          color: mensaje.tipo === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${mensaje.tipo === 'error' ? '#f87171' : '#4ade80'}`
        }}>
          {mensaje.texto}
        </div>
      )}

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando disponibilidad...</p>
      ) : (
        <>
          {/* Formulario para agregar franja horaria */}
          <form onSubmit={handleAgregarHorario} style={{ display: 'flex', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '6px' }}>Día de la semana</label>
              <select value={nuevoDia} onChange={(e) => setNuevoDia(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '6px' }}>Hora Inicio</label>
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>

            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '6px' }}>Hora Fin</label>
              <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
            </div>

            <div>
              <button type="submit" className="btn-primary" style={{ padding: '9px 18px', background: '#145da0', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Agregar Franja
              </button>
            </div>
          </form>

          {/* Tabla de horarios configurados */}
          {horarios.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <p>No tienes franjas horarias configuradas actualmente.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px' }}>Día de la Semana</th>
                    <th style={{ padding: '12px' }}>Hora de Inicio</th>
                    <th style={{ padding: '12px' }}>Hora de Fin</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {horarios.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{item.diaSemana}</td>
                      <td style={{ padding: '12px' }}>{item.horaInicio}</td>
                      <td style={{ padding: '12px' }}>{item.horaFin}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleEliminarHorario(index)} 
                          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                <button 
                  onClick={handleGuardarCambios} 
                  disabled={guardando}
                  style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                >
                  {guardando ? 'Guardando...' : '💾 Guardar Cambios en el Sistema'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GestionHorarios;