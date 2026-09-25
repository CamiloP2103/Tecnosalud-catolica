import { useState, useEffect } from 'react';
import './Acceso.css';

const API_AUTH = import.meta.env.VITE_API_AUTH_URL || 'http://localhost:3002/api/auth';

function RestablecerClave({ onNavigate }) {
  const [token, setToken] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    // Extraer token del hash: #restablecer-clave?token=VALOR
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    if (queryIndex !== -1) {
      const params = new URLSearchParams(hash.substring(queryIndex));
      setToken(params.get('token') || '');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg('Token de recuperación no encontrado o inválido.');
      return;
    }

    if (nuevaClave.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaClave !== confirmarClave) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${API_AUTH}/recuperar-clave/restablecer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaContrasena: nuevaClave }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo restablecer la contraseña.');
        return;
      }

      setExitoMsg('¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión.');
    } catch {
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="page page--form">
      <h2>Restablecer Contraseña</h2>
      <p>Ingresa tu nueva contraseña para acceder a Tecnosalud Católica.</p>

      {errorMsg && <div className="form__alert-error" role="alert">{errorMsg}</div>}
      {exitoMsg && (
        <div className="modal__alert-warning" style={{ background: '#ecfdf5', borderColor: '#10b981', color: '#047857' }} role="status">
          {exitoMsg}
          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="modal-btn-confirm"
              onClick={() => onNavigate('acceso')}
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      )}

      {!exitoMsg && (
        <form onSubmit={handleSubmit}>
          <fieldset className="form__section">
            <legend>Nueva Clave</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                Nueva contraseña *
                <input
                  type="password"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={cargando}
                />
              </label>

              <label>
                Confirmar nueva contraseña *
                <input
                  type="password"
                  value={confirmarClave}
                  onChange={(e) => setConfirmarClave(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  disabled={cargando}
                />
              </label>
            </div>
          </fieldset>

          <button type="submit" className="form__submit-btn" disabled={cargando}>
            {cargando ? 'Actualizando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      )}
    </section>
  );
}

export default RestablecerClave;