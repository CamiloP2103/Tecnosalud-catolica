import { useState, useEffect } from 'react';

const API_REGISTRO = import.meta.env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net/api/registro';

function GestionGeografia() {
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [cargandoGeo, setCargandoGeo] = useState(false);
  const [nombreDepartamento, setNombreDepartamento] = useState('');
  const [nombreMunicipio, setNombreMunicipio] = useState('');
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('');
  const [mensajeGeo, setMensajeGeo] = useState({ tipo: '', texto: '' });

  const token = localStorage.getItem('tecnosalud_token');

  const cargarCatalogosGeograficos = async () => {
    setCargandoGeo(true);
    try {
      const timestamp = Date.now();
      const [resDeptos, resMun] = await Promise.all([
        fetch(`${API_REGISTRO}/departamentos?_t=${timestamp}`),
        fetch(`${API_REGISTRO}/municipios?_t=${timestamp}`),
      ]);
      if (resDeptos.ok) setDepartamentos(await resDeptos.json());
      if (resMun.ok) setMunicipios(await resMun.json());
    } catch (error) {
      console.error('Error cargando geografía:', error);
    } finally {
      setCargandoGeo(false);
    }
  };

  useEffect(() => {
    cargarCatalogosGeograficos();
  }, []);

  const handleCrearDepartamento = async (e) => {
    e.preventDefault();
    if (!nombreDepartamento.trim()) return;
    try {
      const res = await fetch(`${API_REGISTRO}/departamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nombreDepartamento.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeGeo({ tipo: 'exito', texto: 'Departamento creado exitosamente.' });
        setNombreDepartamento('');
        cargarCatalogosGeograficos();
      } else {
        setMensajeGeo({ tipo: 'error', texto: data.error || 'No se pudo crear el departamento.' });
      }
    } catch {
      setMensajeGeo({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCrearMunicipio = async (e) => {
    e.preventDefault();
    if (!nombreMunicipio.trim() || !departamentoSeleccionado) return;
    try {
      const res = await fetch(`${API_REGISTRO}/municipios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ departamento_id: departamentoSeleccionado, nombre: nombreMunicipio.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeGeo({ tipo: 'exito', texto: 'Ciudad/Municipio creado exitosamente.' });
        setNombreMunicipio('');
        cargarCatalogosGeograficos();
      } else {
        setMensajeGeo({ tipo: 'error', texto: data.error || 'No se pudo crear la ciudad.' });
      }
    } catch {
      setMensajeGeo({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  return (
    <section className="adm-seccion" style={{ display: 'grid', gap: '1.5rem' }}>
      <div className="adm-tarjeta">
        <div className="adm-tarjeta__encabezado">
          <h3>Gestión Geográfica (Departamentos y Ciudades)</h3>
          <button type="button" className="adm-btn" onClick={cargarCatalogosGeograficos} disabled={cargandoGeo}>Actualizar Listas</button>
        </div>
        {mensajeGeo.texto && (
          <div className="adm-aviso" style={{ marginTop: '1rem', background: mensajeGeo.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeGeo.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>
            {mensajeGeo.texto}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
          <form onSubmit={handleCrearDepartamento} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nuevo Departamento</h4>
            <input type="text" placeholder="Nombre del departamento" value={nombreDepartamento} onChange={(e) => setNombreDepartamento(e.target.value)} required className="adm-buscador" />
            <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start' }}>Crear Departamento</button>
          </form>

          <form onSubmit={handleCrearMunicipio} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nueva Ciudad / Municipio</h4>
            <select value={departamentoSeleccionado} onChange={(e) => setDepartamentoSeleccionado(e.target.value)} required className="adm-btn" style={{ background: '#fff' }}>
              <option value="">Selecciona departamento...</option>
              {departamentos.map((dep, idx) => (
                <option key={idx} value={dep.codigo || dep.id || dep.nombre}>{dep.nombre || dep}</option>
              ))}
            </select>
            <input type="text" placeholder="Nombre de la ciudad" value={nombreMunicipio} onChange={(e) => setNombreMunicipio(e.target.value)} required className="adm-buscador" />
            <button type="submit" className="adm-btn adm-btn--verde" style={{ justifySelf: 'start' }}>Crear Ciudad</button>
          </form>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>Departamentos Habilitados ({departamentos.length})</h4>
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
              {departamentos.map((dep, idx) => (
                <li key={idx} style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{dep.nombre || dep}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>Ciudades / Municipios ({municipios.length})</h4>
            <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
              {municipios.map((mun, idx) => (
                <li key={idx} style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{mun.nombre || mun}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GestionGeografia;