import { useState, useEffect } from 'react';
import './AtencionMedica.css'; // Puedes reutilizar los estilos de tarjeta y tablas
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';

function HistorialAtenciones() {
  const [historias, setHistorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const cargarHistorial = async () => {
      setCargando(true);
      setErrorMsg('');
      try {
        const token = localStorage.getItem('tecnosalud_token') || '';
        
        // Recuperamos el ID del médico logueado desde la sesión activa guardada en localStorage
        const sesionStr = localStorage.getItem('tecnosalud_sesion_activa') || '{}';
        const sesion = JSON.parse(sesionStr);
        const medicoId = sesion.id;

        if (!medicoId) {
          setErrorMsg('No se pudo identificar al médico en la sesión actual.');
          setCargando(false);
          return;
        }

        // Petición al microservicio de citas para obtener el historial del médico
        const { ok, datos } = await llamarServicio(`${API_CITAS}/historias/medico/${medicoId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!ok) {
          setErrorMsg(datos.error || 'No se pudo cargar el historial de atenciones.');
          return;
        }

        setHistorias(datos.historias || datos || []);
      } catch (error) {
        console.error(error);
        setErrorMsg('Error de conexión al cargar el historial clínico.');
      } finally {
        setCargando(false);
      }
    };

    cargarHistorial();
  }, []);

  return (
    <div className="atencion-container">
      <h2>Historial de Atenciones Clínicas</h2>
      <p>Consulta de registros médicos previos, recetas e incapacidades emitidas por el profesional.</p>

      {errorMsg && <div className="alert-error" role="alert">{errorMsg}</div>}

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando historial médico...</p>
      ) : historias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '1.5rem' }}>
          <p>No se encuentran atenciones médicas registradas en el sistema todavía.</p>
        </div>
      ) : (
        <div className="tabla-historial-container" style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px' }}>Paciente</th>
                <th style={{ padding: '12px' }}>Documento</th>
                <th style={{ padding: '12px' }}>Diagnóstico Principal</th>
                <th style={{ padding: '12px' }}>Plan de Manejo</th>
              </tr>
            </thead>
            <tbody>
              {historias.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px' }}>{item.fecha_atencion || item.fecha || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{item.afiliado_nombre || item.nombre_paciente || 'Paciente'}</td>
                  <td style={{ padding: '12px' }}>{item.afiliado_documento || item.documento || 'N/A'}</td>
                  <td style={{ padding: '12px' }}>{item.diagnostico_principal || 'No especificado'}</td>
                  <td style={{ padding: '12px' }}>{item.plan_manejo || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistorialAtenciones;