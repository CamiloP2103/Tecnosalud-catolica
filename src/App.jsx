import { useState } from 'react';
import Navbar from './components/Navbar/Navbar';
import Layout from './components/Layout/Layout';
import Inicio from './components/pages/Inicio/Inicio';
import Nosotros from './components/pages/Nosotros/Nosotros';
import Afiliados from './components/pages/Afiliados/Afiliados';
import Acceso from './components/pages/Acceso/Acceso';
import './styles/global.css';

const navItems = [
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
};

function App() {
  const [currentPage, setCurrentPage] = useState('inicio');
  const ActivePage = pages[currentPage] || Inicio;

  const handleNavigate = (pageId) => {
    setCurrentPage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        logo="Tecnosalud Católica"
        navItems={navItems}
      />
      <Layout>
        <ActivePage />
      </Layout>
    </>
  );
}

export default App;
