function NotFound({ onNavigate }) {
  return (
<<<<<<< HEAD
    <section className="notfound">
      <div className="notfound__card">
        <div className="notfound__embed">
          <img
            className="notfound__gif"
            src="https://media1.tenor.com/m/RrkSMr0bIJ0AAAAd/jesus-bailando.gif"
            alt="GIF animado de Jesús bailando"
          />
        </div>

        <p className="notfound__eyebrow">ERROR 404</p>
        <h1>404</h1>
        <h2>Página no encontrada</h2>
        <p>
          La sección que intentas abrir no existe o fue movida. Puedes volver al inicio para continuar navegando.
        </p>
        <button type="button" onClick={() => onNavigate && onNavigate('inicio')}>
          Volver al inicio
        </button>
      </div>
      <style>{`
        .notfound {
          min-height: 55vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 1.5rem;
          text-align: center;
        }

        .notfound__card {
          width: min(700px, 100%);
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 28px;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
          padding: 2rem 1.5rem 2.25rem;
        }

        .notfound__embed {
          width: min(100%, 440px);
          margin: 0 auto 1.5rem;
          border-radius: 22px;
          overflow: hidden;
          background: #eff6ff;
          box-shadow: 0 12px 26px rgba(37, 99, 235, 0.08);
        }

        .notfound__gif {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 22px;
        }

        .notfound__eyebrow {
          margin: 0;
          color: #0f766e;
          font-weight: 800;
          letter-spacing: 0.18em;
          font-size: 0.78rem;
        }

        .notfound h1 {
          margin: 0.9rem 0 0.5rem;
          font-size: clamp(3rem, 8vw, 5rem);
          line-height: 1;
          color: #0f172a;
        }

        .notfound h2 {
          margin: 0 0 0.85rem;
          font-size: clamp(1.8rem, 4vw, 2.5rem);
          color: #0f172a;
        }

        .notfound p {
          max-width: 560px;
          margin: 0 auto 1.5rem;
          color: #475569;
          line-height: 1.7;
        }

        .notfound button {
          padding: 0.9rem 1.5rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #0f766e 0%, #2563eb 100%);
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 22px rgba(37, 99, 235, 0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .notfound button:hover {
          transform: translateY(-1px);
          box-shadow: 0 16px 24px rgba(37, 99, 235, 0.25);
        }
      `}</style>
=======
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
>>>>>>> 53552554eb647337d7076193bfa5a2c89a304d99
    </section>
  );
}

export default NotFound;
