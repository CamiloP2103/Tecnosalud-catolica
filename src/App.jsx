import { useState, lazy, Suspense } from 'react';
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

const baseNavItems = [
  { id: 'inicio', label: 'Inicio' },
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
  nosotros: Nosotros,
  registro: Registro,
  acceso: Acceso,
  servicios: ServiciosSalud,
  'muerte-digna': MuerteDigna,
  medicamentos: Medicamentos,
  triage: Triage,
};

function App() {
  const [currentPage, setCurrentPage] = useState('inicio');
  const [sesionActiva, setSesionActiva] = useState(() => {
    return Boolean(localStorage.getItem('tecnosalud_sesion_activa'));
  });

  const ActivePage = pages[currentPage] || Inicio;

  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
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

  return (
    <>
      <Navbar
        currentPage={currentPage}
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
          />
        </Suspense>
      </Layout>
    </>
  );
}

export default App;