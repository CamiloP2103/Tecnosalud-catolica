import './Navbar.css';

function Navbar({ currentPage, onNavigate, logo, navItems }) {
  return (
    <nav className="navbar" aria-label="Navegación principal">
      <h1 className="navbar__logo">{logo}</h1>
      <div className="navbar__buttons">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`navbar__btn ${currentPage === item.id ? 'navbar__btn--active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={currentPage === item.id ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default Navbar;
