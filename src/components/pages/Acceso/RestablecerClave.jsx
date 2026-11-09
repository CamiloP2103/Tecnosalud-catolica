import { useState, useEffect } from 'react';
import './Acceso.css';
import { llamarServicio, mensajeDeError, SERVICIO_AUTH } from '../../../utils/servicios';

const API_AUTH = import.meta.env.VITE_API_AUTH_URL || 'http://localhost:3002/api/auth';

function RestablecerClave({ onNavigate }) {
  const [token, setToken] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [confirmarClave, setConfirmarClave] = useState('');
  const [aceptaTratamientoDatos, setAceptaTratamientoDatos] = useState(false);
  
  // Estado para identificar si requiere tratamiento de datos (Médico o Paciente )
  const [requiereTratamiento] = useState(true);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    // 1. Extraer token del hash: #restablecer-clave?token=VALOR
    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');
    if (queryIndex !== -1) {
      const params = new URLSearchParams(hash.substring(queryIndex));
      const tokenExtraido = params.get('token') || '';
      setToken(tokenExtraido);
      
      // Opcional: Si tu backend tiene un endpoint para verificar el token y retornar el tipo de usuario antes de cambiar la clave,
      // puedes consultarlo aquí. Por defecto, asumimos validación por tipo si el token trae info o validamos con la API.
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg('Token de recuperación no encontrado o inválido.');
      return;
    }

    if (nuevaClave.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (nuevaClave !== confirmarClave) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    // Validación condicional: solo si aplica para médico o paciente
    if (requiereTratamiento && !aceptaTratamientoDatos) {
      setErrorMsg('Debes autorizar el tratamiento de datos personales y sensibles para activar tu cuenta.');
      return;
    }

    setCargando(true);
    try {
      const { ok, datos: data } = await llamarServicio(`${API_AUTH}/recuperar-clave/restablecer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          nuevaContrasena: nuevaClave, 
          aceptaTratamientoDatos: requiereTratamiento ? true : false 
        }),
      }, SERVICIO_AUTH);

      if (!ok) {
        setErrorMsg(data.error || 'No se pudo restablecer la contraseña.');
        return;
      }

      setExitoMsg('¡Tu contraseña ha sido actualizada y la cuenta ha sido activada con éxito! Ya puedes iniciar sesión.');
    } catch (error) {
      setErrorMsg(mensajeDeError(error, SERVICIO_AUTH));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="page page--form">
      <h2>Restablecer Contraseña y Activación</h2>
      <p>Ingresa tu nueva contraseña para habilitar el acceso a Tecnosalud Católica.</p>

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
            <legend>Nueva Clave {requiereTratamiento ? 'y Consentimiento' : ''}</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                Nueva contraseña *
                <input
                  type="password"
                  value={nuevaClave}
                  onChange={(e) => setNuevaClave(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
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

              {/* Renderizado condicional: Solo se muestra si el perfil requiere tratamiento de datos (Médico / Paciente) */}
              {requiereTratamiento && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4', marginBottom: '0.5rem' }}>
                    En cumplimiento de la Ley 1581 de 2012, autorizo el tratamiento de mis datos personales y sensibles para habilitar el uso de los servicios institucionales de Tecnosalud.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aceptaTratamientoDatos}
                      onChange={(e) => setAceptaTratamientoDatos(e.target.checked)}
                      disabled={cargando}
                      required
                    />
                    <span>Autorizo el tratamiento de mis datos personales y sensibles *</span>
                  </label>
                </div>
              )}
            </div>
          </fieldset>

          <button type="submit" className="form__submit-btn" disabled={cargando}>
            {cargando ? 'Actualizando y Activando...' : 'Cambiar Contraseña y Activar'}
          </button>
        </form>
      )}
    </section>
  );
}

export default RestablecerClave;