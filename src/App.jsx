import { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import Layout from './components/Layout/Layout';
import Inicio from './components/pages/Inicio/Inicio';
import Nosotros from './components/pages/Nosotros/Nosotros';
import Registro from './components/pages/Registro/Registro';
import Acceso from './components/pages/Acceso/Acceso';
import ServiciosSalud from './components/pages/ServiciosSalud/ServiciosSalud';
import './styles/global.css';

const baseNavItems = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'registro', label: 'Registro' },
  { id: 'acceso', label: 'Acceso' },
];

const pages = {
  inicio: Inicio,
  nosotros: Nosotros,
  registro: Registro,
  acceso: Acceso,
  servicios: ServiciosSalud,
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
        logo="Tecnosalud Católica"
        navItems={navItems}
      />
      <Layout>
        <ActivePage 
          onLoginExitoso={handleLoginExitoso} 
          onLogout={handleLogout}
        />
      </Layout>
    </>
  );
}

export default App;