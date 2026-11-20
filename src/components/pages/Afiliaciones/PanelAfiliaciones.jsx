import { useState } from 'react';
import './Styles/PanelAfiliaciones.css';
import AprobacionSolicitudes from './AprobacionSolicitudes';
import NuevaAfiliacion from './NuevaAfiliacion';
import CrearUsuarioEps from './CrearUsuarioEps';
import GestionGeneros from './GestionGeneros';
import GestionParentescos from './GestionParentescos';
import GestionEps from './GestionEps';
import GestionGeografia from './GestionGeografia';

function PanelAfiliaciones() {
  const [seccionActiva, setSeccionActiva] = useState('solicitudes');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const seleccionarSeccion = (seccion) => {
    setSeccionActiva(seccion);
    setMenuAbierto(false);
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
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            onClick={() => seleccionarSeccion('solicitudes')}
          >
            <span>Aprobación de Solicitudes</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'nueva-afiliacion' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => seleccionarSeccion('nueva-afiliacion')}
          >
            <span>Nueva Afiliación</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'usuarios' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => seleccionarSeccion('usuarios')}
          >
            <span>Crear Usuario EPS</span>
          </button>

          <div style={{ margin: '0.75rem 0 0.25rem 0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>
            Maestros y Catálogos
          </div>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'generos' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => seleccionarSeccion('generos')}
          >
            <span>Gestión de Géneros</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'parentescos' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => seleccionarSeccion('parentescos')}
          >
            <span>Gestión de Parentescos</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'eps' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => seleccionarSeccion('eps')}
          >
            <span>Gestión de EPS</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'geografia' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => seleccionarSeccion('geografia')}
          >
            <span>Gestión Geográfica</span>
          </button>
        </nav>
      </aside>

      <main className="adm-contenido">
        <header className="adm-encabezado">
          <div>
            <h2>Panel de Gestión - Perfil Afiliaciones</h2>
            <p>Administración modular de solicitudes, padrón de usuarios y maestros independientes en Tecnosalud.</p>
          </div>
        </header>

        {seccionActiva === 'solicitudes' && <AprobacionSolicitudes />}
        {seccionActiva === 'nueva-afiliacion' && <NuevaAfiliacion />}
        {seccionActiva === 'usuarios' && <CrearUsuarioEps />}
        {seccionActiva === 'generos' && <GestionGeneros />}
        {seccionActiva === 'parentescos' && <GestionParentescos />}
        {seccionActiva === 'eps' && <GestionEps />}
        {seccionActiva === 'geografia' && <GestionGeografia />}
      </main>
    </div>
  );
}

export default PanelAfiliaciones;