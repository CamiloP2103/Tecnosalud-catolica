import { useEffect, useRef, useState } from 'react';
import './Navbar.css';
import IconoTecnosalud from './Images/Icono.png';

function Navbar({ currentPage, onNavigate, navItems, ctaItem }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const navRef = useRef(null);

  // Cierra el desplegable si se hace clic fuera del navbar
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    setOpenDropdown(null);
  };

  const isChildActive = (item) =>
    item.children?.some((child) => child.id === currentPage);

  return (
    <nav className="navbar" aria-label="Navegación principal" ref={navRef}>
      <div className="navbar__brand">
        <img src={IconoTecnosalud} alt="Icono Tecnosalud" className="navbar__icon" />
        <div className="navbar__brand-text">
          <h1 className="navbar__logo">
            <span className="navbar__logo-primary">TECNO</span>
            <span className="navbar__logo-accent">SALUD</span>
          </h1>
          <span className="navbar__tagline">Católica · innovación al servicio de tu salud</span>
        </div>
      </div>

      <div className="navbar__links">
        {navItems.map((item) =>
          item.children ? (
            <div className="navbar__dropdown" key={item.id}>
              <button
                type="button"
                className={`navbar__link navbar__dropdown-trigger ${
                  isChildActive(item) ? 'navbar__link--active' : ''
                }`}
                aria-haspopup="true"
                aria-expanded={openDropdown === item.id}
                onClick={() =>
                  setOpenDropdown((current) => (current === item.id ? null : item.id))
                }
              >
                {item.label}
                <svg
                  className={`navbar__chevron ${openDropdown === item.id ? 'navbar__chevron--open' : ''}`}
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openDropdown === item.id && (
                <div className="navbar__dropdown-menu" role="menu">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      role="menuitem"
                      type="button"
                      className={`navbar__dropdown-item ${currentPage === child.id ? 'navbar__dropdown-item--active' : ''}`}
                      onClick={() => handleNavigate(child.id)}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              key={item.id}
              type="button"
              className={`navbar__link ${currentPage === item.id ? 'navbar__link--active' : ''}`}
              onClick={() => handleNavigate(item.id)}
              aria-current={currentPage === item.id ? 'page' : undefined}
            >
              {item.label}
            </button>
          )
        )}
      </div>

      {ctaItem && (
        <button
          type="button"
          className="navbar__cta"
          onClick={() => handleNavigate(ctaItem.id)}
          aria-current={currentPage === ctaItem.id ? 'page' : undefined}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {ctaItem.label}
        </button>
      )}
    </nav>
  );
}

export default Navbar;