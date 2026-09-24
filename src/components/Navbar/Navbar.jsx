import { useEffect, useRef, useState } from 'react';
import './Navbar.css';
import IconoTecnosalud from './Images/Icono.png';

function Navbar({ currentPage, onNavigate, navItems, ctaItem }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    setMenuOpen(false);
    setOpenDropdown(null);
  };

  const isChildActive = (item) =>
    Array.isArray(item.children) &&
    item.children.some((child) => child.id === currentPage);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpen(false);
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className={`navbar ${menuOpen ? 'navbar--open' : ''}`} ref={navRef} aria-label="Navegación principal">
      <div
        className="navbar__brand"
        role="button"
        tabIndex={0}
        onClick={() => handleNavigate('inicio')}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleNavigate('inicio');
          }
        }}
      >
        <img src={IconoTecnosalud} alt="Logo Tecnosalud" className="navbar__logo" />
        <div className="navbar__brand-text">
          <span className="navbar__brand-name">Tecnosalud</span>
          <span className="navbar__brand-subtitle">Católica</span>
        </div>
      </div>

      <button
        type="button"
        className="navbar__toggle"
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`navbar__menu ${menuOpen ? 'navbar__menu--open' : ''}`}>
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
                      onClick={() => {
                        handleNavigate(child.id);
                        setMenuOpen(false);
                      }}
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
              onClick={() => {
                handleNavigate(item.id);
                setMenuOpen(false);
              }}
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