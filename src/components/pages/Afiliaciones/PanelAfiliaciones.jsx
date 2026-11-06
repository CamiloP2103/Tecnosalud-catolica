import { useState } from 'react';
import './PanelAfiliaciones.css'; // Reutilizamos los estilos institucionales

function PanelAfiliaciones() {
  const [seccionActiva, setSeccionActiva] = useState('solicitudes');
  const [menuAbierto, setMenuAbierto] = useState(false);
  
  // Estados de ejemplo para las solicitudes y gestión
  const [solicitudes, setSolicitudes] = useState([
    { id: 1, tipo: 'Usuario EPS', nombre: 'Carlos Jiménez', detalle: '72000607', estado: 'Pendiente' },
    { id: 2, tipo: 'Médico', nombre: 'Dra. Ana María Pérez', detalle: 'Cardología', estado: 'Pendiente' },
  ]);

  const aprobarSolicitud = (id) => {
    setSolicitudes(solicitudes.map(s => s.id === id ? { ...s, estado: 'Aprobada' } : s));
  };

  return (
    <div className="adm-panel">
      {/* Botón para desplegar menú en móviles */}
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

      {/* Menú lateral de navegación del perfil */}
      <aside className={`adm-menu ${menuAbierto ? 'adm-menu--abierto' : ''}`}>
        <p className="adm-menu__titulo">Gestión de Afiliaciones</p>
        <nav>
          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'solicitudes' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('solicitudes'); setMenuAbierto(false); }}
          >
            <span>Aprobación de Solicitudes</span>
            <span className="adm-menu__contador adm-menu__contador--alerta">
              {solicitudes.filter(s => s.estado === 'Pendiente').length}
            </span>
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

      {/* Contenido principal del panel */}
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
                <h3>Bandeja de Solicitudes Pendientes (Médicos y Usuarios)</h3>
              </div>

              <div className="adm-tabla-contenedor">
                <table className="adm-tabla">
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
                        <td><strong>{sol.tipo}</strong></td>
                        <td>{sol.nombre}</td>
                        <td>{sol.detalle}</td>
                        <td>
                          <span className={`adm-insignia ${sol.estado === 'Pendiente' ? 'adm-insignia--pendiente' : 'adm-insignia--activo'}`}>
                            {sol.estado}
                          </span>
                        </td>
                        <td>
                          {sol.estado === 'Pendiente' ? (
                            <button
                              type="button"
                              className="adm-btn adm-btn--verde"
                              onClick={() => aprobarSolicitud(sol.id)}
                            >
                              Aprobar
                            </button>
                          ) : (
                            <span className="adm-sub">Completado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {solicitudes.length === 0 && (
                      <tr>
                        <td colSpan="5" className="adm-vacio" style={{ textAlign: 'center', padding: '1.5rem' }}>
                          No hay solicitudes pendientes en este momento.
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
              <p className="adm-nota">Formulario para dar de alta registros con la EPS fija en Tecnosalud Católica.</p>
              {/* Aquí puedes incorporar los campos de registro de afiliado */}
            </div>
          </section>
        )}

        {seccionActiva === 'geografia' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Gestión de Cobertura Geográfica</h3>
              </div>
              <p className="adm-nota">Administración de zonas y sedes habilitadas para la red de atención.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default PanelAfiliaciones;