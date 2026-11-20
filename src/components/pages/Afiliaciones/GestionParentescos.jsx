import { useState, useEffect } from 'react';

const API_REGISTRO = import.meta.env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net/api/registro';

function GestionParentescos() {
  const [parentescos, setParentescos] = useState([]);
  const [nombreParentesco, setNombreParentesco] = useState('');
  const [cargandoParentescos, setCargandoParentescos] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const token = localStorage.getItem('tecnosalud_token');

  const cargarParentescos = async () => {
    setCargandoParentescos(true);
    try {
      const res = await fetch(`${API_REGISTRO}/parentescos?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setParentescos(await res.json());
    } catch (error) {
      console.error('Error cargando parentescos:', error);
    } finally {
      setCargandoParentescos(false);
    }
  };

  useEffect(() => {
    cargarParentescos();
  }, []);

  const handleCrearParentesco = async (e) => {
    e.preventDefault();
    if (!nombreParentesco.trim()) return;
    try {
      const res = await fetch(`${API_REGISTRO}/parentescos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nombreParentesco.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Parentesco creado exitosamente.' });
        setNombreParentesco('');
        cargarParentescos();
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al crear parentesco.' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  return (
    <section className="adm-seccion">
      <div className="adm-tarjeta">
        <div className="adm-tarjeta__encabezado">
          <h3>Gestión de Parentescos</h3>
          <button type="button" className="adm-btn" onClick={cargarParentescos} disabled={cargandoParentescos}>Actualizar</button>
        </div>
        {mensaje.texto && (
          <div className="adm-aviso" style={{ marginTop: '1rem', background: mensaje.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensaje.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>
            {mensaje.texto}
          </div>
        )}
        <form onSubmit={handleCrearParentesco} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)', marginTop: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nuevo Parentesco</h4>
          <input type="text" placeholder="Nombre del parentesco" value={nombreParentesco} onChange={(e) => setNombreParentesco(e.target.value)} required className="adm-buscador" />
          <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start' }}>Crear Parentesco</button>
        </form>
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>Parentescos Registrados ({parentescos.length})</h4>
          <ul style={{ listStyle: 'none', padding: 0, maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
            {parentescos.map((p, idx) => (
              <li key={idx} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{p.nombre}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default GestionParentescos;