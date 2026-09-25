import React from 'react';

// Decodificador seguro del payload de un JWT sin librerías externas
const decodificarJWT = (token) => {
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64);
    return JSON.parse(decodedJson);
  } catch (error) {
    return null;
  }
};

function RutaProtegida({ children, onNavigate }) {
  const token = localStorage.getItem('tecnosalud_token');
  const sesionActiva = localStorage.getItem('tecnosalud_sesion_activa');

  let esValido = false;

  if (token && sesionActiva) {
    const payload = decodificarJWT(token);
    // Valida que el token contenga payload y no haya expirado (exp está en segundos)
    if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
      esValido = true;
    }
  }

  if (!esValido) {
    // Si el token es inválido o expiró, limpia almacenamiento residual y redirige
    localStorage.removeItem('tecnosalud_token');
    localStorage.removeItem('tecnosalud_sesion_activa');

    return (
      <section className="page page--form" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fff', padding: '2rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#145da0', marginBottom: '0.5rem' }}>Acceso Restringido</h2>
          <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Debes iniciar sesión con tus credenciales de afiliado para acceder a los <strong>Servicios Clínicos</strong> de Tecnosalud.
          </p>
          <button
            type="button"
            className="modal-btn-confirm"
            onClick={() => onNavigate('acceso')}
            style={{ width: '100%', minHeight: '44px', padding: '0.7rem 1rem', background: '#145da0', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </section>
    );
  }

  return children;
}

export default RutaProtegida;