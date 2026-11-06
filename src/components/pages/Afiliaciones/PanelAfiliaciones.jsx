import { useState } from 'react';
import './PanelAfiliaciones.css';

function PanelAfiliaciones() {
  const [activeTab, setActiveTab] = useState('solicitudes');

  // Estado simulado de solicitudes pendientes
  const [solicitudes, setSolicitudes] = useState([
    { id: 1, tipo: 'Usuario EPS', nombre: 'Carlos Jiménez', documento: '12345678', estado: 'Pendiente' },
    { id: 2, tipo: 'Médico', nombre: 'Dra. Ana María Pérez', especialidad: 'Cardiología', estado: 'Pendiente' },
  ]);

  // Estado para gestión geográfica
  const [departamentos, setDepartamentos] = useState(['Cundinamarca', 'Antioquia', 'Atlántico']);
  const [ciudades, setCiudades] = useState(['Bogotá D.C.', 'Medellín', 'Barranquilla']);
  
  // Estados para creación manual de Usuario EPS por parte del operador
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombres: '',
    apellidos: '',
    tipoDocumento: 'CC',
    numeroDocumento: '',
    correo: '',
    telefono: '',
    direccion: '',
    eps: 'Tecnosalud EPS', // Fijo y bloqueado
  });

  const handleAprobar = (id) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: 'Aprobado' } : s));
  };

  const handleCrearUsuarioEps = (e) => {
    e.preventDefault();
    alert(`Usuario EPS ${nuevoUsuario.nombres} registrado exitosamente con EPS Tecnosalud.`);
    setNuevoUsuario({ nombres: '', apellidos: '', tipoDocumento: 'CC', numeroDocumento: '', correo: '', telefono: '', direccion: '', eps: 'Tecnosalud EPS' });
  };

  return (
    <div className="panel-afiliaciones">
      <header className="panel-header">
        <h2>Panel de Gestión - Perfil Afiliaciones</h2>
        <p>Administración de solicitudes, padrón de usuarios y cobertura geográfica.</p>
      </header>

      <div className="panel-tabs">
        <button 
          className={activeTab === 'solicitudes' ? 'active' : ''} 
          onClick={() => setActiveTab('solicitudes')}
        >
          Aprobación de Solicitudes
        </button>
        <button 
          className={activeTab === 'crear-eps' ? 'active' : ''} 
          onClick={() => setActiveTab('crear-eps')}
        >
          Crear Usuario EPS
        </button>
        <button 
          className={activeTab === 'geografia' ? 'active' : ''} 
          onClick={() => setActiveTab('geografia')}
        >
          Gestión Geográfica
        </button>
      </div>

      <div className="panel-content">
        {activeTab === 'solicitudes' && (
          <div className="section-solicitudes">
            <h3>Bandeja de Solicitudes Pendientes (Médicos y Usuarios)</h3>
            <table className="tabla-gestion">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nombre</th>
                  <th>Detalle</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((sol) => (
                  <tr key={sol.id}>
                    <td>{sol.tipo}</td>
                    <td>{sol.nombre}</td>
                    <td>{sol.especialidad || sol.documento}</td>
                    <td><span className={`badge ${sol.estado.toLowerCase()}`}>{sol.estado}</span></td>
                    <td>
                      {sol.estado === 'Pendiente' ? (
                        <button className="btn-aprobar" onClick={() => handleAprobar(sol.id)}>Aprobar</button>
                      ) : (
                        <span>Completado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'crear-eps' && (
          <div className="section-crear-eps">
            <h3>Alta de Usuario de la EPS (Campos Completos)</h3>
            <form onSubmit={handleCrearUsuarioEps} className="form-afiliacion-admin">
              <div className="form-row">
                <label>Nombres:
                  <input type="text" value={nuevoUsuario.nombres} onChange={e => setNuevoUsuario({...nuevoUsuario, nombres: e.target.value})} required />
                </label>
                <label>Apellidos:
                  <input type="text" value={nuevoUsuario.apellidos} onChange={e => setNuevoUsuario({...nuevoUsuario, apellidos: e.target.value})} required />
                </label>
              </div>
              <div className="form-row">
                <label>Tipo Documento:
                  <select value={nuevoUsuario.tipoDocumento} onChange={e => setNuevoUsuario({...nuevoUsuario, tipoDocumento: e.target.value})}>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                  </select>
                </label>
                <label>Número de Documento:
                  <input type="text" value={nuevoUsuario.numeroDocumento} onChange={e => setNuevoUsuario({...nuevoUsuario, numeroDocumento: e.target.value})} required />
                </label>
              </div>
              <div className="form-row">
                <label>Correo Electrónico:
                  <input type="email" value={nuevoUsuario.correo} onChange={e => setNuevoUsuario({...nuevoUsuario, correo: e.target.value})} required />
                </label>
                <label>Teléfono:
                  <input type="text" value={nuevoUsuario.telefono} onChange={e => setNuevoUsuario({...nuevoUsuario, telefono: e.target.value})} required />
                </label>
              </div>
              <div className="form-row">
                <label>EPS Asignada (Fija):
                  <input type="text" value={nuevoUsuario.eps} disabled className="input-bloqueado" />
                </label>
                <label>Dirección:
                  <input type="text" value={nuevoUsuario.direccion} onChange={e => setNuevoUsuario({...nuevoUsuario, direccion: e.target.value})} required />
                </label>
              </div>
              <button type="submit" className="btn-primary">Registrar Usuario en EPS</button>
            </form>
          </div>
        )}

        {activeTab === 'geografia' && (
          <div className="section-geografia">
            <h3>Administración de Departamentos y Ciudades</h3>
            <div className="geo-grid">
              <div className="geo-box">
                <h4>Departamentos</h4>
                <ul>
                  {departamentos.map((dep, idx) => <li key={idx}>{dep}</li>)}
                </ul>
              </div>
              <div className="geo-box">
                <h4>Ciudades / Municipios</h4>
                <ul>
                  {ciudades.map((ciu, idx) => <li key={idx}>{ciu}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelAfiliaciones;