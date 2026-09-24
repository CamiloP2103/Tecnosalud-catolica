<<<<<<< HEAD
import { useState, lazy, Suspense, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import Layout from './components/Layout/Layout';
import Footer from './components/Footer/Footer';
import Breadcrumbs from './components/Breadcrumbs/Breadcrumbs';
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
};

const normalizeHashPage = (hashValue) => {
  const cleaned = (hashValue || '').replace(/^#\/?/, '').trim();
  return cleaned || 'inicio';
};

function App() {
  const [currentPage, setCurrentPage] = useState(() => normalizeHashPage(window.location.hash));
  const [sesionActiva, setSesionActiva] = useState(() => {
    return Boolean(localStorage.getItem('tecnosalud_sesion_activa'));
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
    setSesionActiva(false);
    handleNavigate('acceso');
  };

  // Servicios Clínicos se agrega inmediatamente cuando sesionActiva es true
  const navItems = sesionActiva
    ? [...baseNavItems, { id: 'servicios', label: 'Servicios Clínicos' }]
    : baseNavItems;

  const currentPageLabel = pages[currentPage] ? currentPage : '404';

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
          <ActivePage
            sesionActiva={sesionActiva}
            onLoginExitoso={handleLoginExitoso}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            seccion={currentPage}
          />
        </Suspense>
      </Layout>
      <Footer />
    </>
  );
}

export default App;
=======
import { useState, lazy, Suspense, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import Layout from './components/Layout/Layout';
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

const baseNavItems = [
  { id: 'inicio', label: 'Inicio' },
  {
    id: 'nosotros',
    label: 'Nosotros',
    children: [
      { id: 'historia', label: 'Historia' },
      { id: 'mision-vision', label: 'Misión y visión' },
      { id: 'valores', label: 'Valores' },
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

const pages = {
  inicio: Inicio,
  historia: Nosotros,
  'mision-vision': Nosotros,
  valores: Nosotros,
  'trabaja-con-nosotros': Nosotros,
  registro: Registro,
  acceso: Acceso,
  servicios: ServiciosSalud,
  'muerte-digna': MuerteDigna,
  medicamentos: Medicamentos,
  triage: Triage,
};

const normalizeHashPage = (hashValue) => {
  const cleaned = (hashValue || '').replace(/^#\/?/, '').trim();
  return cleaned || 'inicio';
};

function App() {
  const [currentPage, setCurrentPage] = useState(() => normalizeHashPage(window.location.hash));
  const [sesionActiva, setSesionActiva] = useState(() => {
    return Boolean(localStorage.getItem('tecnosalud_sesion_activa'));
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
    setSesionActiva(false);
    handleNavigate('acceso');
  };

  // Servicios Clínicos se agrega inmediatamente cuando sesionActiva es true
  const navItems = sesionActiva
    ? [...baseNavItems, { id: 'servicios', label: 'Servicios Clínicos' }]
    : baseNavItems;

  const currentPageLabel = pages[currentPage] ? currentPage : '404';

  return (
    <>
      <Navbar
        currentPage={currentPageLabel}
        onNavigate={handleNavigate}
        navItems={navItems}
        ctaItem={accesoItem}
      />
      <Layout>
        <Suspense
          fallback={
            <div style={{ padding: '4rem 0', textAlign: 'center', color: '#64748b' }}>
              <p>Cargando contenido...</p>
            </div>
          }
        >
          <ActivePage
            sesionActiva={sesionActiva}
            onLoginExitoso={handleLoginExitoso}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            seccion={currentPage}
          />
        </Suspense>
      </Layout>
    </>
  );
}

export default App;
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
