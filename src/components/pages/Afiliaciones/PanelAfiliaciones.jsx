import { useState, useEffect } from 'react';
import './PanelAfiliaciones.css'; // Reutilizamos los estilos institucionales

const API_REGISTRO = import.meta.env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net/api/registro';
const API_AUTH = import.meta.env.VITE_API_AUTH_URL || 'https://tecnosalud-auth-2026-grgzcsa5ajhje5f8.brazilsouth-01.azurewebsites.net/api/auth';

function PanelAfiliaciones() {
  const [seccionActiva, setSeccionActiva] = useState('solicitudes');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Estados de Solicitudes
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [mensajeSolicitudes, setMensajeSolicitudes] = useState('');

  // Estados para Crear Usuario EPS
  const [formUsuario, setFormUsuario] = useState({
    tipo_doc: 'CC',
    documento: '',
    email: '',
    nombre: '',
    rol_id: '2'
  });
  const [cargandoCrear, setCargandoCrear] = useState(false);
  const [mensajeCrear, setMensajeCrear] = useState({ tipo: '', texto: '' });

  // Estados de Gestión Geográfica
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [cargandoGeo, setCargandoGeo] = useState(false);
  
  // Formularios de Creación Geográfica
  const [nombreDepartamento, setNombreDepartamento] = useState('');
  const [nombreMunicipio, setNombreMunicipio] = useState('');
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('');
  const [mensajeGeo, setMensajeGeo] = useState({ tipo: '', texto: '' });

  const token = localStorage.getItem('tecnosalud_token');

  useEffect(() => {
    if (seccionActiva === 'solicitudes') {
      cargarSolicitudesPendientes();
    } else if (seccionActiva === 'geografia') {
      cargarCatalogosGeograficos();
    }
  }, [seccionActiva]);

  const cargarSolicitudesPendientes = async () => {
    setCargandoSolicitudes(true);
    setMensajeSolicitudes('');
    try {
      const res = await fetch(`${API_REGISTRO}/admin/afiliados?estado=PENDIENTE`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSolicitudes(data.afiliados || []);
      } else {
        setMensajeSolicitudes(data.error || 'No se pudieron cargar las solicitudes.');
      }
    } catch (error) {
      setMensajeSolicitudes('Error de conexión al cargar solicitudes.');
    } finally {
      setCargandoSolicitudes(false);
    }
  };

  const aprobarSolicitud = async (id) => {
    try {
      const res = await fetch(`${API_REGISTRO}/admin/afiliados/${id}/estado`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ estado: 'ACTIVO', observacion: 'Aprobado desde el panel de afiliaciones' })
      });
      if (res.ok) {
        setSolicitudes(solicitudes.filter(s => s.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'No se pudo aprobar la solicitud.');
      }
    } catch (error) {
      alert('Error de red al aprobar la solicitud.');
    }
  };

  const handleCrearUsuarioChange = (e) => {
    const { name, value } = e.target;
    setFormUsuario(prev => ({ ...prev, [name]: value }));
  };

  const handleCrearUsuarioSubmit = async (e) => {
    e.preventDefault();
    setCargandoCrear(true);
    setMensajeCrear({ tipo: '', texto: '' });

    try {
      const res = await fetch(`${API_AUTH}/registro-interno`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formUsuario)
      });
      const data = await res.json();

      if (res.ok) {
        setMensajeCrear({ tipo: 'exito', texto: 'Usuario EPS creado correctamente. Se le envió un correo para activar su cuenta.' });
        setFormUsuario({ tipo_doc: 'CC', documento: '', email: '', nombre: '', rol_id: '2' });
      } else {
        setMensajeCrear({ tipo: 'error', texto: data.error || 'Error al crear el usuario.' });
      }
    } catch (error) {
      setMensajeCrear({ tipo: 'error', texto: 'Error de conexión con el servicio de autenticación.' });
    } finally {
      setCargandoCrear(false);
    }
  };

  const cargarCatalogosGeograficos = async () => {
    setCargandoGeo(true);
    try {
      const [resDep, resMun] = await Promise.all([
        fetch(`${API_REGISTRO}/departamentos`),
        fetch(`${API_REGISTRO}/municipios`)
      ]);
      if (resDep.ok) setDepartamentos(await resDep.json());
      if (resMun.ok) setMunicipios(await resMun.json());
    } catch (error) {
      console.error('Error cargando catálogos geográficos:', error);
    } finally {
      setCargandoGeo(false);
    }
  };

  const handleCrearDepartamento = async (e) => {
    e.preventDefault();
    setMensajeGeo({ tipo: '', texto: '' });
    if (!nombreDepartamento.trim()) return;

    try {
      const res = await fetch(`${API_REGISTRO}/departamentos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ nombre: nombreDepartamento.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeGeo({ tipo: 'exito', texto: 'Departamento creado exitosamente.' });
        setNombreDepartamento('');
        cargarCatalogosGeograficos();
      } else {
        setMensajeGeo({ tipo: 'error', texto: data.error || 'No se pudo crear el departamento.' });
      }
    } catch (error) {
      setMensajeGeo({ tipo: 'error', texto: 'Error de conexión al crear departamento.' });
    }
  };

  const handleCrearMunicipio = async (e) => {
    e.preventDefault();
    setMensajeGeo({ tipo: '', texto: '' });
    if (!nombreMunicipio.trim() || !departamentoSeleccionado) return;

    try {
      const res = await fetch(`${API_REGISTRO}/municipios`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ departamento_id: departamentoSeleccionado, nombre: nombreMunicipio.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeGeo({ tipo: 'exito', texto: 'Ciudad/Municipio creado exitosamente.' });
        setNombreMunicipio('');
        cargarCatalogosGeograficos();
      } else {
        setMensajeGeo({ tipo: 'error', texto: data.error || 'No se pudo crear la ciudad.' });
      }
    } catch (error) {
      setMensajeGeo({ tipo: 'error', texto: 'Error de conexión al crear ciudad.' });
    }
  };

  return (
    <div className="adm-panel">
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button
          type="button"
          className="adm-menu__alternar"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Abrir menú de afiliaciones"
        >
          ☰
        </button>
      </div>

      <aside className={`adm-menu ${menuAbierto ? 'adm-menu--abierto' : ''}`}>
        <p className="adm-menu__titulo">Gestión de Afiliaciones</p>
        <nav>
          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'solicitudes' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('solicitudes'); setMenuAbierto(false); }}
          >
            <span>Aprobación de Solicitudes</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'usuarios' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('usuarios'); setMenuAbierto(false); }}
          >
            <span>Crear Usuario EPS</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'geografia' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('geografia'); setMenuAbierto(false); }}
          >
            <span>Gestión Geográfica</span>
          </button>
        </nav>
      </aside>

      <main className="adm-contenido">
        <header className="adm-encabezado">
          <div>
            <h2>Panel de Gestión - Perfil Afiliaciones</h2>
            <p>Administración de solicitudes, padrón de usuarios y cobertura geográfica en Tecnosalud.</p>
          </div>
        </header>

        {seccionActiva === 'solicitudes' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Bandeja de Solicitudes Pendientes (Base de Datos)</h3>
                <button type="button" className="adm-btn" onClick={cargarSolicitudesPendientes} disabled={cargandoSolicitudes}>
                  {cargandoSolicitudes ? 'Actualizando...' : 'Actualizar Lista'}
                </button>
              </div>

              {mensajeSolicitudes && <p className="adm-error">{mensajeSolicitudes}</p>}

              <div className="adm-tabla-contenedor">
                <table className="adm-tabla">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Nombres y Apellidos</th>
                      <th>Correo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map((sol) => (
                      <tr key={sol.id}>
                        <td>{sol.tipo_doc} {sol.documento}</td>
                        <td><strong>{sol.nombres} {sol.apellidos}</strong></td>
                        <td>{sol.correo}</td>
                        <td>
                          <span className="adm-insignia adm-insignia--pendiente">
                            {sol.estado}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="adm-btn adm-btn--verde"
                            onClick={() => aprobarSolicitud(sol.id)}
                          >
                            Aprobar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!cargandoSolicitudes && solicitudes.length === 0 && (
                      <tr>
                        <td colSpan="5" className="adm-vacio" style={{ textAlign: 'center', padding: '1.5rem' }}>
                          No hay solicitudes pendientes en la base de datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {seccionActiva === 'usuarios' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Crear Nuevo Usuario EPS (Tecnosalud Fija)</h3>
              </div>
              <p className="adm-nota">Formulario conectado al servicio de autenticación para dar de alta registros internos con EPS fija en Tecnosalud.</p>

              {mensajeCrear.texto && (
                <div className="adm-aviso" style={{ marginBottom: '1rem', background: mensajeCrear.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeCrear.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>
                  {mensajeCrear.texto}
                </div>
              )}

              <form onSubmit={handleCrearUsuarioSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Tipo de Documento
                    <select name="tipo_doc" value={formUsuario.tipo_doc} onChange={handleCrearUsuarioChange} className="adm-btn" style={{ width: '100%', background: '#fff' }}>
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="TI">Tarjeta de Identidad (TI)</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="PA">Pasaporte (PA)</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Número de Documento
                    <input type="text" name="documento" value={formUsuario.documento} onChange={handleCrearUsuarioChange} placeholder="Ej: 10203040" required className="adm-buscador" style={{ width: '100%' }} />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Nombre Completo
                    <input type="text" name="nombre" value={formUsuario.nombre} onChange={handleCrearUsuarioChange} placeholder="Nombres y Apellidos" required className="adm-buscador" style={{ width: '100%' }} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Correo Electrónico
                    <input type="email" name="email" value={formUsuario.email} onChange={handleCrearUsuarioChange} placeholder="correo@ucatolica.edu.co" required className="adm-buscador" style={{ width: '100%' }} />
                  </label>
                </div>

                <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start', marginTop: '0.5rem' }} disabled={cargandoCrear}>
                  {cargandoCrear ? 'Registrando usuario...' : 'Crear Usuario y Enviar Activación'}
                </button>
              </form>
            </div>
          </section>
        )}

        {seccionActiva === 'geografia' && (
          <section className="adm-seccion" style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Formulario de Creación */}
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Creación de Departamentos y Ciudades</h3>
              </div>
              <p className="adm-nota">Amplía la cobertura geográfica añadiendo nuevos departamentos o municipios a la red.</p>

              {mensajeGeo.texto && (
                <div className="adm-aviso" style={{ marginTop: '1rem', background: mensajeGeo.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeGeo.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>
                  {mensajeGeo.texto}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                <form onSubmit={handleCrearDepartamento} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nuevo Departamento</h4>
                  <input
                    type="text"
                    placeholder="Nombre del departamento"
                    value={nombreDepartamento}
                    onChange={(e) => setNombreDepartamento(e.target.value)}
                    required
                    className="adm-buscador"
                    style={{ width: '100%' }}
                  />
                  <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start' }}>
                    Crear Departamento
                  </button>
                </form>

                <form onSubmit={handleCrearMunicipio} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nueva Ciudad / Municipio</h4>
                  <select
                    value={departamentoSeleccionado}
                    onChange={(e) => setDepartamentoSeleccionado(e.target.value)}
                    required
                    className="adm-btn"
                    style={{ width: '100%', background: '#fff' }}
                  >
                    <option value="">Selecciona departamento...</option>
                    {departamentos.map((dep, idx) => (
                      <option key={idx} value={dep.id || dep.nombre || dep}>
                        {dep.nombre || dep}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Nombre de la ciudad"
                    value={nombreMunicipio}
                    onChange={(e) => setNombreMunicipio(e.target.value)}
                    required
                    className="adm-buscador"
                    style={{ width: '100%' }}
                  />
                  <button type="submit" className="adm-btn adm-btn--verde" style={{ justifySelf: 'start' }}>
                    Crear Ciudad
                  </button>
                </form>
              </div>
            </div>

            {/* Listado de Cobertura Actual */}
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Cobertura Geográfica Actual</h3>
                <button type="button" className="adm-btn" onClick={cargarCatalogosGeograficos} disabled={cargandoGeo}>
                  {cargandoGeo ? 'Cargando...' : 'Actualizar Listados'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                <div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--adm-azul)' }}>Departamentos Habilitados ({departamentos.length})</h4>
                  <ul style={{ listStyle: 'none', padding: 0, maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
                    {departamentos.map((dep, idx) => (
                      <li key={idx} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                        {dep.nombre || dep}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.5rem', color: 'var(--adm-azul)' }}>Ciudades / Municipios ({municipios.length})</h4>
                  <ul style={{ listStyle: 'none', padding: 0, maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
                    {municipios.map((mun, idx) => (
                      <li key={idx} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                        {mun.nombre || mun}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default PanelAfiliaciones;