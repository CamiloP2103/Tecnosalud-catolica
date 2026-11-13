import { useState, lazy, Suspense, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import Layout from './components/Layout/Layout';
import Footer from './components/Footer/Footer';
import Breadcrumbs from './components/Breadcrumbs/Breadcrumbs';
import RutaProtegida from './components/RutaProtegida/RutaProtegida';
import './styles/global.css';

// Carga perezosa de vistas
const Inicio = lazy(() => import('./components/pages/Inicio/Inicio'));
const Nosotros = lazy(() => import('./components/pages/Nosotros/Nosotros'));
const Registro = lazy(() => import('./components/pages/Registro/Registro'));
const Acceso = lazy(() => import('./components/pages/Acceso/Acceso'));
const ServiciosSalud = lazy(() => import('./components/pages/ServiciosSalud/ServiciosSalud'));
const Farmacias = lazy(() => import('./components/pages/Farmacias/Farmacias'));
const Documentos = lazy(() => import('./components/pages/Documentos/Documentos'));
const MuerteDigna = lazy(() => import('./components/pages/Afiliados/MuerteDigna'));
const Medicamentos = lazy(() => import('./components/pages/Afiliados/Medicamentos'));
const Triage = lazy(() => import('./components/pages/Afiliados/Triage'));
const NotFound = lazy(() => import('./components/pages/NotFound/NotFound'));
const RestablecerClave = lazy(() => import('./components/pages/Acceso/RestablecerClave'));
const PanelAdmin = lazy(() => import('./components/pages/admin/PanelAdmin'));
const PanelAfiliaciones = lazy(() => import('./components/pages/Afiliaciones/PanelAfiliaciones'));
const AtencionMedica = lazy(() => import('./components/pages/Medico/AtencionMedica'));

const baseNavItems = [
  { id: 'inicio', label: 'Inicio' },
  {
    id: 'nosotros',
    label: 'Nosotros',
    children: [
      { id: 'historia', label: 'Historia' },
      { id: 'mision-vision', label: 'Misión y visión' },
      { id: 'valores', label: 'Valores' },
      { id: 'organigrama', label: 'Organigrama' },
      { id: 'trabaja-con-nosotros', label: 'Trabaja con nosotros' },
    ],
  },
  { id: 'registro', label: 'Registro' },
  {
    id: 'afiliados',
    label: 'Afiliados',
    children: [
      { id: 'muerte-digna', label: 'Muerte digna' },
      { id: 'medicamentos', label: 'Medicamentos' },
      { id: 'triage', label: 'Triage' },
    ],
  },
];

const accesoItem = { id: 'acceso', label: 'Acceso' };

// Páginas que exigen sesión iniciada (RutaProtegida valida el JWT)
const PAGINAS_PROTEGIDAS = ['servicios', 'farmacias', 'documentos', 'admin', 'afiliaciones','medico-atencion'];

// Mapeo único y global de páginas
const pages = {
  inicio: Inicio,
  historia: Nosotros,
  'mision-vision': Nosotros,
  valores: Nosotros,
  'trabaja-con-nosotros': Nosotros,
  organigrama: Nosotros,
  registro: Registro,
  acceso: Acceso,
  servicios: ServiciosSalud,
  farmacias: Farmacias,
  documentos: Documentos,
  'muerte-digna': MuerteDigna,
  medicamentos: Medicamentos,
  triage: Triage,
  admin: PanelAdmin,
  afiliaciones: PanelAfiliaciones,
  'restablecer-clave': RestablecerClave,
  'medico-atencion': AtencionMedica,
};

// Función limpia para extraer solo la ruta y descartar el '?token=...'
const normalizeHashPage = (hashValue) => {
  const sinPrefijo = (hashValue || '').replace(/^#\/?/, '').trim();
  const rutaLimpia = sinPrefijo.split('?')[0].trim();
  return rutaLimpia || 'inicio';
};

// Función auxiliar robusta para verificar si el token JWT sigue vigente
const verificarTokenVigente = () => {
  const token = localStorage.getItem('tecnosalud_token');
  const sesionActivaFlag = localStorage.getItem('tecnosalud_sesion_activa');

  if (!token || !sesionActivaFlag) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const ahoraEnSegundos = Math.floor(Date.now() / 1000);

    // Si ya expiró, limpiamos todo de inmediato
    if (payload.exp < ahoraEnSegundos) {
      localStorage.removeItem('tecnosalud_sesion_activa');
      localStorage.removeItem('tecnosalud_token');
      localStorage.removeItem('tecnosalud_rol');
      return false;
    }
    return true;
  } catch (e) {
    // Si el token está corrupto, limpiamos por seguridad
    localStorage.clear();
    return false;
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState(() => normalizeHashPage(window.location.hash));
  
  // Evaluamos de entrada con la función de expiración real del JWT
  const [sesionActiva, setSesionActiva] = useState(() => verificarTokenVigente());

  const [userRole, setUserRole] = useState(() => {
    return verificarTokenVigente() ? (localStorage.getItem('tecnosalud_rol') || '') : '';
  });

  // Validación periódica o al montar la app
  useEffect(() => {
    if (!verificarTokenVigente()) {
      setSesionActiva(false);
      setUserRole('');
    }

    const handleHashChange = () => {
      const hashPage = normalizeHashPage(window.location.hash);
      setCurrentPage(pages[hashPage] ? hashPage : '404');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const ActivePage = pages[currentPage] || NotFound;

  const handleNavigate = (pageId) => {
    // Doble validación al navegar por si el token expiró en segundo plano
    if (!verificarTokenVigente()) {
      setSesionActiva(false);
      setUserRole('');
    }

    const nextPage = pages[pageId] ? pageId : '404';
    setCurrentPage(nextPage);
    window.location.hash = nextPage === 'inicio' ? '' : `/${nextPage}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginExitoso = (rolRecibido) => {
    setSesionActiva(true);
    if (rolRecibido) {
      setUserRole(rolRecibido);
      localStorage.setItem('tecnosalud_rol', rolRecibido);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tecnosalud_sesion_activa');
    localStorage.removeItem('tecnosalud_token');
    localStorage.removeItem('tecnosalud_rol');
    setSesionActiva(false);
    setUserRole('');
    handleNavigate('acceso');
  };

  // Construcción dinámica de ítems del menú según la sesión y el rol
  let navItems = [...baseNavItems];
  if (sesionActiva) {
    if (userRole && userRole.toLowerCase() === 'paciente') {
      navItems.push(
        { id: 'servicios', label: 'Servicios Clínicos' },
        { id: 'documentos', label: 'Documentos clínicos' }
      );
    }  
    if (userRole && userRole.toLowerCase() === 'afiliaciones') {
      navItems.push({ id: 'afiliaciones', label: 'Afiliaciones' });
    }
    if (userRole && userRole.toLowerCase() === 'farmacia') {
      navItems.push({ id: 'farmacias', label: 'Farmacias' });
    }
    
    // ➕ Agregar condición para el rol de médico (según como retorne tu backend el rol, ej: 'medico' o 'profesional')
    if (userRole && (userRole.toLowerCase() === 'medico' || userRole.toLowerCase() === 'profesional')) {
      navItems.push({ id: 'medico-atencion', label: 'Atención Médica' });
    }
  }

  const currentPageLabel = pages[currentPage] ? currentPage : '404';

  const renderContenido = () => {
    const contenido = (
      <ActivePage
        sesionActiva={sesionActiva}
        onLoginExitoso={handleLoginExitoso}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        seccion={currentPage}
      />
    );

    if (PAGINAS_PROTEGIDAS.includes(currentPage)) {
      return (
        <RutaProtegida onNavigate={handleNavigate}>
          {contenido}
        </RutaProtegida>
      );
    }

    return contenido;
  };

  return (
    <>
      <Navbar
        currentPage={currentPageLabel}
        onNavigate={handleNavigate}
        navItems={navItems}
        ctaItem={accesoItem}
        userRole={userRole}
      />
      <Layout>
        <Breadcrumbs currentPage={currentPage} onNavigate={handleNavigate} />
        <Suspense
          fallback={
            <div style={{ padding: '4rem 0', textAlign: 'center', color: '#64748b' }}>
              <p>Cargando contenido...</p>
            </div>
          }
        >
          {renderContenido()}
        </Suspense>
      </Layout>
      <Footer />
    </>
  );
}

export default App;