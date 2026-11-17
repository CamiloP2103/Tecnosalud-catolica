import { useState, useEffect } from 'react';
import './AtencionMedica.css';
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas/historias';

function PerfilMedico() {
  const [infoMedico, setInfoMedico] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const token = localStorage.getItem('tecnosalud_token') || '';
        const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
        const usuarioId = sesion.id;

        if (!usuarioId) return;

        // Consultamos la información del médico asociada al usuario
        const resp = await llamarServicio(`${API_CITAS}/horarios/usuario/${usuarioId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resp.ok && resp.datos) {
          // Podemos enriquecer con los datos de sesión y del backend
          setInfoMedico({
            nombre: sesion.nombre || 'Profesional de la Salud',
            email: sesion.email || 'medico@tecnosalud.edu.co',
            rol: sesion.rol || 'MEDICO',
            medicoId: resp.datos.medicoId
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };
    cargarPerfil();
  }, []);

  return (
    <div className="atencion-container">
      <h2>Perfil Profesional</h2>
      <p>Información institucional y credenciales activas en el sistema.</p>

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando perfil...</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2rem', maxWidth: '600px', marginTop: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#145da0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 'bold' }}>
              👨‍⚕️
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{infoMedico?.nombre}</h3>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>Activo en el Sistema</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>CORREO INSTITUCIONAL</strong>
              <span style={{ fontSize: '1rem', color: '#0f172a' }}>{infoMedico?.email}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>ROL DEL SISTEMA</strong>
              <span style={{ fontSize: '1rem', color: '#0f172a' }}>{infoMedico?.rol}</span>
            </div>
            <div>
              <strong style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>IDENTIFICADOR INTERNO (ID MÉDICO)</strong>
              <span style={{ fontSize: '1rem', color: '#0f172a' }}>#{infoMedico?.medicoId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerfilMedico;