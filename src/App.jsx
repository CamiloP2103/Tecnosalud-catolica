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
const MuerteDigna = lazy(() => import('./components/pages/Afiliados/MuerteDigna'));
const Medicamentos = lazy(() => import('./components/pages/Afiliados/Medicamentos'));
const Triage = lazy(() => import('./components/pages/Afiliados/Triage'));
const NotFound = lazy(() => import('./components/pages/NotFound/NotFound'));
const RestablecerClave = lazy(() => import('./components/pages/Acceso/RestablecerClave'));

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
  'muerte-digna': MuerteDigna,
  medicamentos: Medicamentos,
  triage: Triage,
  'restablecer-clave': RestablecerClave, // <- Ruta registrada
};

// Función limpia para extraer solo la ruta y descartar el '?token=...'
const normalizeHashPage = (hashValue) => {
  const sinPrefijo = (hashValue || '').replace(/^#\/?/, '').trim();
  const rutaLimpia = sinPrefijo.split('?')[0].trim();
  return rutaLimpia || 'inicio';
};

function App() {
  const [currentPage, setCurrentPage] = useState(() => normalizeHashPage(window.location.hash));
  const [sesionActiva, setSesionActiva] = useState(() => {
    return Boolean(
      localStorage.getItem('tecnosalud_sesion_activa') &&
      localStorage.getItem('tecnosalud_token')
    );
  });

  useEffect(() => {
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
    const nextPage = pages[pageId] ? pageId : '404';
    setCurrentPage(nextPage);
    window.location.hash = nextPage === 'inicio' ? '' : `/${nextPage}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginExitoso = () => {
    setSesionActiva(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('tecnosalud_sesion_activa');
    localStorage.removeItem('tecnosalud_token');
    setSesionActiva(false);
    handleNavigate('acceso');
  };

  // Servicios Clínicos visible si la sesión está autenticada
  const navItems = sesionActiva
    ? [...baseNavItems, { id: 'servicios', label: 'Servicios Clínicos' }]
    : baseNavItems;

  const currentPageLabel = pages[currentPage] ? currentPage : '404';

  // Renderiza el componente activo y aplica el guardián de ruta a "servicios"
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

    if (currentPage === 'servicios') {
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