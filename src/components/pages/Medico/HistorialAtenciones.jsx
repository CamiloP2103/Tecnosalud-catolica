import { useState, useEffect } from 'react';
import './AtencionMedica.css';
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas/historias';

function HistorialAtenciones() {
  const [historias, setHistorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busqueda, setBusqueda] = useState(''); // 👈 Nuevo estado para el buscador

  useEffect(() => {
    const cargarHistorial = async () => {
      setCargando(true);
      try {
        const token = localStorage.getItem('tecnosalud_token') || '';
        const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
        const usuarioId = sesion.id;

        if (!usuarioId) {
          setErrorMsg('No se encontró la sesión del usuario.');
          setCargando(false);
          return;
        }

        const respMedico = await llamarServicio(`${API_CITAS}/horarios/usuario/${usuarioId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!respMedico.ok || !respMedico.datos?.medicoId) {
          setErrorMsg('No se encontró el perfil de médico asociado.');
          setCargando(false);
          return;
        }

        const medicoIdReal = respMedico.datos.medicoId;

        const respHistorial = await llamarServicio(`${API_CITAS}/medico/${medicoIdReal}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (respHistorial.ok) {
          setHistorias(respHistorial.datos.historias || respHistorial.datos || []);
        } else {
          setErrorMsg('No se pudo cargar el historial clínico.');
        }
      } catch (error) {
        console.error(error);
        setErrorMsg('Error de conexión al cargar el historial.');
      } finally {
        setCargando(false);
      }
    };

    cargarHistorial();
  }, []);

  // 👈 Filtrar historias por nombre o documento del afiliado
  const historiasFiltradas = historias.filter(h => {
    const termino = busqueda.toLowerCase();
    const nombre = (h.afiliado_nombre || '').toLowerCase();
    const documento = String(h.afiliado_documento || '');
    return nombre.includes(termino) || documento.includes(termino);
  });

  return (
    <div className="atencion-container">
      <h2>Historial de Atenciones Clínicas</h2>
      <p>Consulta los registros médicos emitidos a tus pacientes.</p>

      {/* 👈 Barra de Búsqueda */}
      <div style={{ margin: '1.5rem 0' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por nombre del paciente o número de documento..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
        />
      </div>

      {errorMsg && <div className="alert-error" style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>{errorMsg}</div>}

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando expedientes...</p>
      ) : historiasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p>No se encontraron registros de atención que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {historiasFiltradas.map((h, index) => (
            <div key={index} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '10px' }}>
                <strong style={{ color: '#145da0', fontSize: '1.1rem' }}>Paciente: {h.afiliado_nombre} (Doc: {h.afiliado_documento})</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>📅 {h.fecha_atencion || 'Fecha reciente'}</span>
              </div>
              <p><strong>Motivo:</strong> {h.motivo_consulta}</p>
              <p><strong>Diagnóstico Principal:</strong> {h.diagnostico_principal}</p>
              <p><strong>Plan de Manejo:</strong> {h.plan_manejo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistorialAtenciones;