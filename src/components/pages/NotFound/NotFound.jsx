function NotFound({ onNavigate }) {
  return (
    <section
      style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div>
        <p style={{ margin: 0, color: '#0f766e', fontWeight: 700, letterSpacing: '0.12em' }}>
          ERROR 404
        </p>
        <h1 style={{ fontSize: 'clamp(3rem, 8vw, 5rem)', margin: '0.75rem 0 1rem' }}>
          404
        </h1>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.8rem' }}>Página no encontrada</h2>
        <p style={{ maxWidth: '560px', margin: '0 auto 1.5rem', color: '#475569', lineHeight: 1.6 }}>
          La sección que intentas abrir no existe o fue movida. Puedes volver al inicio para continuar navegando.
        </p>
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('inicio')}
          style={{
            padding: '0.9rem 1.5rem',
            border: 'none',
            borderRadius: '10px',
            background: '#0f766e',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Volver al inicio
        </button>
      </div>
    </section>
  );
}

export default NotFound;
