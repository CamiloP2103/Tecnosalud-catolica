import { useState, useEffect } from 'react';
import './Styles/AtencionMedica.css';
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';

function HistorialAtenciones() {
  const [historias, setHistorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const cargarHistorial = async () => {
      setCargando(true);
      setErrorMsg('');
      try {
        const token = localStorage.getItem('tecnosalud_token') || '';

        const sesionStr = localStorage.getItem('tecnosalud_sesion_activa') || '{}';
        const sesion = JSON.parse(sesionStr);
        const medicoId = sesion.id || sesion.medico_id;

        if (!medicoId) {
          setErrorMsg('No se pudo identificar al médico en la sesión actual.');
          setCargando(false);
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`
        };

        const [respuesta, respCitas] = await Promise.all([
          llamarServicio(`${API_CITAS}/historias/medico/${medicoId}`, {
            method: 'GET',
            headers
          }),
          llamarServicio(`${API_CITAS}/medico/${medicoId}/citas`, {
            method: 'GET',
            headers
          })
        ]);

        const listaHistorias = respuesta && respuesta.ok
          ? (respuesta.datos?.historias || respuesta.datos || [])
          : [];

        const listaCanceladas = respCitas && respCitas.ok
          ? ((respCitas.datos?.citas || respCitas.datos || [])
              .filter((c) => c.estado === 'CANCELADA')
              .map((c) => ({
                id: `cancelada-${c.id}`,
                fecha_atencion: c.fecha ? `${c.fecha} ${c.hora || ''}` : (c.actualizado_en || 'N/A'),
                afiliado_nombre: c.afiliado_nombre || c.usuario_email || c.usuarioEmail || 'Paciente',
                afiliado_documento: c.afiliado_documento || c.usuario_doc || c.usuarioDoc || 'N/A',
                afiliado_correo: c.usuario_email || c.usuarioEmail || '',
                estado_registro: 'CANCELADA',
                motivo_cancelacion: c.motivo_cancelacion || 'Sin motivo especificado',
                diagnostico_principal: `Motivo de cancelación: ${c.motivo_cancelacion || 'Sin motivo especificado'}`,
                plan_manejo: 'No aplica (Cita cancelada)'
              })))
          : [];

        if ((!respuesta || !respuesta.ok) && listaCanceladas.length === 0) {
          setErrorMsg(respuesta?.datos?.error || 'El módulo de historial aún no está disponible en el servidor de citas (404).');
          setCargando(false);
          return;
        }

        setHistorias([...listaHistorias, ...listaCanceladas]);
      } catch (error) {
        console.error(error);
        setErrorMsg('Error de conexión al cargar el historial clínico.');
      } finally {
        setCargando(false);
      }
    };

    cargarHistorial();
  }, []);

  // Placeholder sin integración todavía: se conectará al servicio de documentos
  const handleDescargarPdf = (item) => {
    // TODO: Integrar servicio de documentos para descargar PDF de la atención/documento
  };

  // Placeholder sin integración todavía: se conectará al servicio de documentos y notificación
  const handleEnviarCorreo = (item) => {
    // TODO: Integrar servicio de documentos y servicio de notificación por correo al paciente
  };

  const historiasFiltradas = historias.filter((item) => {
    const termino = busqueda.toLowerCase();
    const nombre = (item.afiliado_nombre || item.nombre_paciente || item.usuario_email || '').toLowerCase();
    const documento = String(item.afiliado_documento || item.documento || item.usuario_doc || '');
    const motivoCancel = String(item.motivo_cancelacion || item.diagnostico_principal || '').toLowerCase();
    return nombre.includes(termino) || documento.includes(termino) || motivoCancel.includes(termino);
  });

  return (
    <div className="atencion-container">
      <h2>Historial de Atenciones Clínicas</h2>
      <p>Consulta de registros médicos previos, descarga de PDF y envío al correo del paciente.</p>

      {/* Barra de Búsqueda */}
      <div style={{ margin: '1.5rem 0 1rem 0' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre del paciente, documento o motivo de cancelación..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {errorMsg && <div className="alert-error" role="alert">{errorMsg}</div>}

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando historial médico...</p>
      ) : historiasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '1.5rem' }}>
          <p>No se encuentran atenciones médicas registradas que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="tabla-historial-container" style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px' }}>Paciente</th>
                <th style={{ padding: '12px' }}>Documento</th>
                <th style={{ padding: '12px' }}>Diagnóstico Principal / Cancelación</th>
                <th style={{ padding: '12px' }}>Plan de Manejo</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Documentos</th>
              </tr>
            </thead>
            <tbody>
              {historiasFiltradas.map((item, index) => {
                const esCancelada = item.estado_registro === 'CANCELADA';
                return (
                  <tr
                    key={item.id || index}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: esCancelada ? '#fffafa' : '#ffffff'
                    }}
                  >
                    <td style={{ padding: '12px' }}>{item.fecha_atencion || item.fecha || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <strong>{item.afiliado_nombre || item.nombre_paciente || 'Paciente'}</strong>
                    </td>
                    <td style={{ padding: '12px' }}>{item.afiliado_documento || item.documento || 'N/A'}</td>
                    <td style={{ padding: '12px', color: esCancelada ? '#b91c1c' : '#1e293b' }}>
                      {esCancelada && (
                        <strong style={{
                          display: 'inline-block',
                          background: '#fee2e2',
                          color: '#991b1b',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          marginRight: '6px'
                        }}>
                          CANCELADA
                        </strong>
                      )}
                      {item.diagnostico_principal || 'No especificado'}
                    </td>
                    <td style={{ padding: '12px' }}>{item.plan_manejo || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!esCancelada ? (
                        <div className="historial-acciones-doc">
                          <button
                            type="button"
                            className="btn-doc-pdf"
                            onClick={() => handleDescargarPdf(item)}
                            title="Descargar PDF de historia y receta"
                          >
                            <span>📄</span>
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            className="btn-doc-correo"
                            onClick={() => handleEnviarCorreo(item)}
                            title="Enviar documento al correo del paciente"
                          >
                            <span>✉️</span>
                            <span>Enviar correo</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin documento</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistorialAtenciones;