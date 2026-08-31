import { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import Layout from './components/Layout/Layout';
import Inicio from './components/pages/Inicio/Inicio';
import Nosotros from './components/pages/Nosotros/Nosotros';
import Registro from './components/pages/Registro/Registro';
import Acceso from './components/pages/Acceso/Acceso';
import ServiciosSalud from './components/pages/ServiciosSalud/ServiciosSalud';
import MuerteDigna from './components/pages/Afiliados/MuerteDigna';
import Medicamentos from './components/pages/Afiliados/Medicamentos';
import Triage from './components/pages/Afiliados/Triage';
import './styles/global.css';

// Enlaces principales del navbar (sin contar el botón Acceso, que va aparte como CTA)
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
    handleNavigate('servicios');
  };

  const handleLogout = () => {
    setSesionActiva(false);
    handleNavigate('acceso');
  };

  // El botón "Servicios Clínicos" solo se agrega a navItems si sesionActiva es true
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
        <ActivePage
          onLoginExitoso={handleLoginExitoso}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
        />
      </Layout>
    </>
  );
}

export default App;