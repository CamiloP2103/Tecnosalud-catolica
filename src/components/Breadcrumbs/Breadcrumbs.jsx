import './Breadcrumbs.css';

const breadcrumbMap = {
  inicio: 'Inicio',
  historia: 'Historia',
  'mision-vision': 'Misión y visión',
  valores: 'Valores',
  'trabaja-con-nosotros': 'Trabaja con nosotros',
  organigrama: 'Organigrama',
  registro: 'Registro',
  acceso: 'Acceso',
  servicios: 'Servicios clínicos',
  'muerte-digna': 'Muerte digna',
  medicamentos: 'Medicamentos',
  triage: 'Triage',
  404: '404',
};

function Breadcrumbs({ currentPage, onNavigate }) {
  const pageId = currentPage || 'inicio';
  const labels = [breadcrumbMap[pageId] || 'Página'];

  if (pageId === 'inicio') {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Migas de pan">
      <button type="button" className="breadcrumbs__link" onClick={() => onNavigate && onNavigate('inicio')}>
        Inicio
      </button>
      <span className="breadcrumbs__separator" aria-hidden="true">/</span>
      <span className="breadcrumbs__current">{labels[0]}</span>
    </nav>
  );
}

export default Breadcrumbs;
