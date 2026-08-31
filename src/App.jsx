import { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import Layout from './components/Layout/Layout';
import Inicio from './components/pages/Inicio/Inicio';
import Nosotros from './components/pages/Nosotros/Nosotros';
import Afiliados from './components/pages/Afiliados/Afiliados';
import Acceso from './components/pages/Acceso/Acceso';
import ServiciosSalud from './components/pages/ServiciosSalud/ServiciosSalud';
import './styles/global.css';

const baseNavItems = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'nosotros', label: 'Nosotros' },
  { id: 'afiliados', label: 'Afiliados' },
  { id: 'acceso', label: 'Acceso' },
];

const pages = {
  inicio: Inicio,
  nosotros: Nosotros,
  afiliados: Afiliados,
  acceso: Acceso,
  servicios: ServiciosSalud, // 1. Registrada la página de servicios
};

function App() {
  const [currentPage, setCurrentPage] = useState('inicio');
  const [sesionActiva, setSesionActiva] = useState(false);

  const ActivePage = pages[currentPage] || Inicio;

  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Manejador que se dispara al iniciar sesión exitosamente
  const handleLoginExitoso = () => {
    setSesionActiva(true);
    handleNavigate('servicios');
  };

  // Si la sesión está activa, agregamos la pestaña de Servicios Clínicos a la barra de navegación
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
        {/* Pasamos la función onLoginExitoso por props */}
        <ActivePage onLoginExitoso={handleLoginExitoso} />
      </Layout>
    </>
  );
}

export default App;