import { useCallback, useEffect, useState } from 'react';
import './PanelAdmin.css';
import { cargarResumenes } from './api';
import {
  IconoActualizar, IconoAfiliacion, IconoCalendario, IconoCorreo, IconoDocumento, IconoFarmacia, IconoMenu, IconoPedido,
  IconoPulso, IconoResumen, IconoUsuarios,
} from './iconos';
import ResumenGeneral from './secciones/ResumenGeneral';
import SeccionCitas from './secciones/SeccionCitas';
import { SeccionInventario, SeccionPedidos } from './secciones/SeccionFarmacia';
import { SeccionAfiliaciones, SeccionUsuarios } from './secciones/SeccionPersonas';
import { SeccionCorreos, SeccionDocumentos } from './secciones/SeccionRegistros';

const INTERVALO_AUTOMATICO = 60 * 1000;

// Menú lateral: cada sección, su ícono, de qué servicio lee y qué contador muestra
const SECCIONES = [
  { id: 'resumen', titulo: 'Resumen general', icono: IconoResumen, descripcion: 'Indicadores de todos los servicios y su estado.' },
  {
    id: 'citas', titulo: 'Citas médicas', icono: IconoCalendario, servicio: 'citas',
    descripcion: 'Ocupación, disponibilidad por especialidad y agenda.',
    contador: (r) => r.citas?.datos?.citasHoy?.filter?.((c) => c.estado === 'PROGRAMADA')?.length || 0,
  },
  {
    id: 'farmacias', titulo: 'Farmacias e inventario', icono: IconoFarmacia, servicio: 'farmacias',
    descripcion: 'Existencias por sede, productos agotados y reabastecimiento.',
    contador: (r) => r.farmacias?.datos?.inventario?.productosAgotados || 0, tonoContador: 'alerta',
  },
  {
    id: 'pedidos', titulo: 'Pedidos de medicamentos', icono: IconoPedido, servicio: 'farmacias',
    descripcion: 'Despacho de pedidos: marcar listos, entregados o rechazar.',
    contador: (r) => r.farmacias?.datos?.solicitudes?.porEstado?.PENDIENTE?.total || 0, tonoContador: 'alerta',
  },
  {
    id: 'afiliaciones', titulo: 'Afiliaciones', icono: IconoAfiliacion, servicio: 'registro',
    descripcion: 'Solicitudes de afiliación, distribución y aprobación.',
    contador: (r) => r.registro?.datos?.pendientes || 0, tonoContador: 'alerta',
  },
  {
    id: 'usuarios', titulo: 'Usuarios y accesos', icono: IconoUsuarios, servicio: 'auth',
    descripcion: 'Cuentas, roles, bloqueos y bitácora de accesos.',
    contador: (r) => r.auth?.datos?.usuarios?.bloqueados || 0, tonoContador: 'alerta',
  },
  { id: 'documentos', titulo: 'Documentos clínicos', icono: IconoDocumento, servicio: 'documentos', descripcion: 'Archivos cifrados y bitácora de descargas.' },
  {
    id: 'correos', titulo: 'Correos', icono: IconoCorreo, servicio: 'notificaciones',
    descripcion: 'Notificaciones enviadas y fallidas por servicio.',
    contador: (r) => r.notificaciones?.datos?.fallidas || 0, tonoContador: 'alerta',
  },
];

function esAdministrador() {
  try {
    return String(JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}').rol || '').toUpperCase() === 'ADMIN';
  } catch {
    return false;
  }
}

/** Panel de administración: lee los estados de los microservicios. */
function PanelAdmin() {
  const [seccion, setSeccion] = useState('resumen');
  const [resumenes, setResumenes] = useState({});
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState(null);
  const [automatico, setAutomatico] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const admin = esAdministrador();

  const recargar = useCallback(async () => {
    setCargando(true);
    setResumenes(await cargarResumenes());
    setActualizado(new Date());
    setCargando(false);
  }, []);

  useEffect(() => {
    if (admin) recargar();
  }, [admin, recargar]);

  // Actualización automática cada minuto (opcional)
  useEffect(() => {
    if (!automatico) return undefined;
    const t = setInterval(recargar, INTERVALO_AUTOMATICO);
    return () => clearInterval(t);
  }, [automatico, recargar]);

  if (!admin) {
    return (
      <section className="adm-sin-permiso">
        <IconoPulso tamano={36} />
        <h2>Acceso solo para administradores</h2>
        <p>Inicia sesión con una cuenta de rol ADMIN para ver el panel de administración.</p>
      </section>
    );
  }

  const actual = SECCIONES.find((s) => s.id === seccion) || SECCIONES[0];
  const irA = (id) => {
    setSeccion(id);
    setMenuAbierto(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const propiedades = { resumen: resumenes[actual.servicio], recargar };

  return (
    <div className="adm-panel">
      <aside className={`adm-menu ${menuAbierto ? 'adm-menu--abierto' : ''}`} aria-label="Secciones del panel">
        <p className="adm-menu__titulo">Administración</p>
        <nav>
          {SECCIONES.map((s) => {
            const Icon = s.icono;
            const cuenta = s.contador?.(resumenes);
            const caido = s.servicio && resumenes[s.servicio]?.error;
            return (
              <button
                key={s.id}
                type="button"
                className={`adm-menu__opcion ${seccion === s.id ? 'adm-menu__opcion--activa' : ''}`}
                aria-current={seccion === s.id ? 'page' : undefined}
                onClick={() => irA(s.id)}
                title={s.descripcion}
              >
                <Icon tamano={19} />
                <span>{s.titulo}</span>
                {caido && <span className="adm-menu__contador adm-menu__contador--error" title="Servicio con problemas">!</span>}
                {!caido && cuenta > 0 && <span className={`adm-menu__contador adm-menu__contador--${s.tonoContador || 'azul'}`}>{cuenta}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="adm-contenido">
        <header className="adm-encabezado">
          <button type="button" className="adm-menu__alternar" onClick={() => setMenuAbierto((v) => !v)} aria-expanded={menuAbierto} aria-label="Mostrar secciones">
            <IconoMenu />
          </button>
          <div>
            <h2>{actual.titulo}</h2>
            <p>{actual.descripcion}</p>
          </div>
          <div className="adm-encabezado__acciones">
            <label className="adm-interruptor">
              <input type="checkbox" checked={automatico} onChange={(e) => setAutomatico(e.target.checked)} />
              <span>Actualizar cada minuto</span>
            </label>
            <button type="button" className="adm-btn adm-btn--azul adm-btn--icono" onClick={recargar} disabled={cargando}>
              <span className={cargando ? 'adm-girando' : ''}><IconoActualizar tamano={16} /></span>
              {cargando ? 'Actualizando...' : 'Actualizar'}
            </button>
            {actualizado && <span className="adm-actualizado">Actualizado {actualizado.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</span>}
          </div>
        </header>

        {cargando && !actualizado ? (
          <p className="adm-vacio">Cargando información de los microservicios...</p>
        ) : (
          <>
            {seccion === 'resumen' && <ResumenGeneral resumenes={resumenes} irA={irA} />}
            {seccion === 'citas' && <SeccionCitas {...propiedades} />}
            {seccion === 'farmacias' && <SeccionInventario {...propiedades} />}
            {seccion === 'pedidos' && <SeccionPedidos {...propiedades} />}
            {seccion === 'afiliaciones' && <SeccionAfiliaciones {...propiedades} />}
            {seccion === 'usuarios' && <SeccionUsuarios {...propiedades} />}
            {seccion === 'documentos' && <SeccionDocumentos {...propiedades} />}
            {seccion === 'correos' && <SeccionCorreos {...propiedades} />}
          </>
        )}
      </div>
    </div>
  );
}

export default PanelAdmin;