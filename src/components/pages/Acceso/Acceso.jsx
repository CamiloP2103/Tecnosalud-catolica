import { useEffect, useState } from 'react';
import './Acceso.css';

// URL del Microservicio de Autenticación (/api/auth según diagrama)
const API_AUTH = import.meta.env.VITE_API_AUTH_URL || 'http://localhost:3002/api/auth';

const CORREOS_DISTRACTORES = [
  'usuario.contacto@gmail.com',
  'clinica.paciente@hotmail.com',
  'c.rodriguez@outlook.com',
  'salud.consulta@yahoo.es'
];

const DOCUMENTOS_DISTRACTORES = [
  { tipoDoc: 'CC', documento: '1018456789' },
  { tipoDoc: 'CC', documento: '79654123' },
  { tipoDoc: 'CE', documento: '43219876' },
  { tipoDoc: 'TI', documento: '1098765432' }
];

const enmascararCorreo = (email) => {
  if (!email || email.length <= 7) return email;
  const inicio = email.slice(0, 2);
  const fin = email.slice(-5);
  return `${inicio}*****${fin}`;
};

const enmascararDocumento = (doc) => {
  if (!doc || doc.length <= 4) return doc;
  const inicio = doc.slice(0, 2);
  const fin = doc.slice(-2);
  return `${inicio}****${fin}`;
};

function Acceso({ sesionActiva, onLoginExitoso, onLogout, onNavigate }) {
  const [form, setForm] = useState({
    usuario: '',
    contrasena: '',
    recordarUsuario: false,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  // Estado del usuario activo
  const [usuarioLogueado, setUsuarioLogueado] = useState(() => {
    const sesionGuardada = localStorage.getItem('tecnosalud_sesion_activa');
    if (sesionGuardada) {
      try {
        return JSON.parse(sesionGuardada);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Modales
  const [modalRecuperarUsuario, setModalRecuperarUsuario] = useState(false);
  const [modalRecuperarClave, setModalRecuperarClave] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [esLoginExitoso, setEsLoginExitoso] = useState(false);

  // Recuperación de Usuario
  const [pasoUsuario, setPasoUsuario] = useState(1);
  const [tipoDocRecuperar, setTipoDocRecuperar] = useState('');
  const [docRecuperar, setDocRecuperar] = useState('');
  const [opcionesCorreos, setOpcionesCorreos] = useState([]);
  const [correoSeleccionado, setCorreoSeleccionado] = useState('');
  const [intentosUsuario, setIntentosUsuario] = useState(0);
  const [alertaRecuperarUser, setAlertaRecuperarUser] = useState('');

  // Recuperación de Contraseña
  const [pasoClave, setPasoClave] = useState(1);
  const [correoClaveRecuperar, setCorreoClaveRecuperar] = useState('');
  const [opcionesDocumentos, setOpcionesDocumentos] = useState([]);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState('');
  const [intentosClave, setIntentosClave] = useState(0);
  const [alertaRecuperarClave, setAlertaRecuperarClave] = useState('');

  // Captcha local
  const [captchaChallenge, setCaptchaChallenge] = useState({ num1: 0, num2: 0, resultado: 0 });
  const [captchaInput, setCaptchaInput] = useState('');

  const generarCaptchaLocal = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setCaptchaChallenge({ num1, num2, resultado: num1 + num2 });
    setCaptchaInput('');
  };

  useEffect(() => {
    const sesionGuardada = localStorage.getItem('tecnosalud_sesion_activa');
    if (sesionGuardada) {
      try {
        setUsuarioLogueado(JSON.parse(sesionGuardada));
      } catch (e) {
        localStorage.removeItem('tecnosalud_sesion_activa');
        setUsuarioLogueado(null);
      }
    } else {
      setUsuarioLogueado(null);
    }

    const usuarioRecordado = localStorage.getItem('tecnosalud_usuario_recordado');
    if (usuarioRecordado) {
      setForm((prev) => ({
        ...prev,
        usuario: usuarioRecordado,
        recordarUsuario: true,
      }));
    }

    generarCaptchaLocal();
  }, [sesionActiva]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    const correoIngresado = form.usuario.trim().toLowerCase();
    const claveIngresada = form.contrasena.trim();

    if (!correoIngresado || !claveIngresada) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (parseInt(captchaInput, 10) !== captchaChallenge.resultado) {
      setErrorMsg('El resultado del control de seguridad es incorrecto.');
      generarCaptchaLocal();
      return;
    }

    setCargando(true);
    try {
      // Petición al Microservicio de Autenticación
      const respuesta = await fetch(`${API_AUTH}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: correoIngresado, contrasena: claveIngresada }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setErrorMsg(datos.error || 'Credenciales inválidas.');
        setCargando(false);
        generarCaptchaLocal();
        return;
      }

      // Persistencia segura: Token JWT y datos del usuario
      localStorage.setItem('tecnosalud_token', datos.token);
      localStorage.setItem('tecnosalud_sesion_activa', JSON.stringify(datos.usuario));
      setUsuarioLogueado(datos.usuario);

      if (form.recordarUsuario) {
        localStorage.setItem('tecnosalud_usuario_recordado', form.usuario.trim());
      } else {
        localStorage.removeItem('tecnosalud_usuario_recordado');
      }

      if (onLoginExitoso) {
        onLoginExitoso();
      }

      setMensajeExito(`¡Bienvenido de nuevo, ${datos.usuario.nombre}! Has ingresado correctamente.`);
      setEsLoginExitoso(true);
      setModalAviso(true);

      setForm((prev) => ({
        ...prev,
        contrasena: '',
        usuario: prev.recordarUsuario ? prev.usuario : '',
      }));
    } catch {
      setErrorMsg('No se pudo conectar con el microservicio de autenticación. Verifica la conexión con el servidor.');
    } finally {
      setCargando(false);
      generarCaptchaLocal();
    }
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('tecnosalud_sesion_activa');
    localStorage.removeItem('tecnosalud_token');
    setUsuarioLogueado(null);

    const usuarioRecordado = localStorage.getItem('tecnosalud_usuario_recordado');
    setForm({
      usuario: usuarioRecordado || '',
      contrasena: '',
      recordarUsuario: Boolean(usuarioRecordado),
    });

    generarCaptchaLocal();

    if (onLogout) {
      onLogout();
    }
  };

  // Recuperar Usuario
  const handleAbrirModalUsuario = () => {
    setPasoUsuario(1);
    setTipoDocRecuperar('');
    setDocRecuperar('');
    setOpcionesCorreos([]);
    setCorreoSeleccionado('');
    setAlertaRecuperarUser('');
    setIntentosUsuario(0);
    setModalRecuperarUsuario(true);
  };

  const handleConsultarDocumentoUsuario = async (e) => {
    e.preventDefault();
    setAlertaRecuperarUser('');

    try {
      const res = await fetch(`${API_AUTH}/recuperar-usuario/consultar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipoDoc: tipoDocRecuperar, documento: docRecuperar.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlertaRecuperarUser(data.error || 'No se encontró el usuario registrado.');
        return;
      }
      setOpcionesCorreos(data.opciones);
      setPasoUsuario(2);
    } catch {
      setAlertaRecuperarUser('Error conectando con el servicio de autenticación.');
    }
  };

  const handleValidarCorreoUsuario = async (e) => {
    e.preventDefault();
    setAlertaRecuperarUser('');

    if (!correoSeleccionado) {
      setAlertaRecuperarUser('Por favor selecciona una opción de correo.');
      return;
    }

    try {
      const res = await fetch(`${API_AUTH}/recuperar-usuario/verificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoDoc: tipoDocRecuperar,
          documento: docRecuperar.trim(),
          correoSeleccionado
        }),
      });

      const data = await res.json();

      if (res.ok && data.valido) {
        setModalRecuperarUsuario(false);
        setMensajeExito(`Validación exitosa. Hemos enviado tu usuario a ${enmascararCorreo(data.email)}.`);
        setEsLoginExitoso(false);
        setModalAviso(true);
      } else {
        const nuevosIntentos = intentosUsuario + 1;
        setIntentosUsuario(nuevosIntentos);
        if (nuevosIntentos >= 3) {
          setModalRecuperarUsuario(false);
          setMensajeExito('Has superado los 3 intentos permitidos. Por seguridad, el proceso fue cancelado.');
          setEsLoginExitoso(false);
          setModalAviso(true);
        } else {
          setAlertaRecuperarUser(`El correo no coincide. Intento ${nuevosIntentos} de 3.`);
        }
      }
    } catch {
      setAlertaRecuperarUser('Error al verificar la información.');
    }
  };

  // Recuperar Contraseña
  const handleAbrirModalClave = () => {
    setPasoClave(1);
    setCorreoClaveRecuperar('');
    setOpcionesDocumentos([]);
    setDocumentoSeleccionado('');
    setAlertaRecuperarClave('');
    setIntentosClave(0);
    setModalRecuperarClave(true);
  };

// En src/components/pages/Acceso/Acceso.jsx

  const handleConsultarCorreoClave = async (e) => {
    e.preventDefault();
    setAlertaRecuperarClave('');

    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const correoLimpio = correoClaveRecuperar.trim();

    if (!regexEmail.test(correoLimpio)) {
      setAlertaRecuperarClave('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch(`${API_AUTH}/recuperar-clave/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correoLimpio }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAlertaRecuperarClave(data.error || 'No se pudo enviar el correo.');
        setCargando(false);
        return;
      }

      setModalRecuperarClave(false);
      setMensajeExito(`Hemos enviado un enlace seguro a ${enmascararCorreo(correoLimpio)}. Revisa tu bandeja de entrada o spam para restablecer tu contraseña.`);
      setEsLoginExitoso(false);
      setModalAviso(true);
    } catch {
      setAlertaRecuperarClave('Error de conexión con el microservicio de autenticación.');
    } finally {
      setCargando(false);
    }
  };
  
  const handleValidarDocumentoClave = (e) => {
    e.preventDefault();
    setAlertaRecuperarClave('');

    if (!documentoSeleccionado) {
      setAlertaRecuperarClave('Por favor selecciona una opción de documento.');
      return;
    }

    setModalRecuperarClave(false);
    setMensajeExito(`Validación procesada. Se ha generado un enlace de restablecimiento a ${enmascararCorreo(correoClaveRecuperar)}.`);
    setEsLoginExitoso(false);
    setModalAviso(true);
  };

  const handleCerrarAviso = () => {
    setModalAviso(false);
    if (esLoginExitoso && onNavigate) {
      onNavigate('servicios');
    }
  };

  if (sesionActiva && usuarioLogueado && !modalAviso) {
    return (
      <section className="page page--form">
        <div className="acceso-logueado-card">
          <div className="acceso-logueado-icon">👤</div>
          <h2>Sesión Activa</h2>
          <p>Actualmente ya te encuentras autenticado en el portal de <strong>Tecnosalud</strong>.</p>
          
          <div className="acceso-logueado-info">
            <p><strong>Nombre:</strong> {usuarioLogueado.nombre}</p>
            <p><strong>Correo:</strong> {usuarioLogueado.email}</p>
            <p><strong>Documento:</strong> {usuarioLogueado.tipoDoc} {usuarioLogueado.documento}</p>
            <p><strong>Rol:</strong> {usuarioLogueado.rol}</p>
          </div>

          <div className="acceso-logueado-actions">
            <button
              type="button"
              className="modal-btn-confirm"
              onClick={() => onNavigate && onNavigate('servicios')}
            >
              Ir a Servicios Clínicos
            </button>
            <button
              type="button"
              className="modal-btn-cancel"
              onClick={handleCerrarSesion}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page page--form">
      <h2>Acceso</h2>
      <p>Ingresa tus datos para acceder a tu cuenta de Tecnosalud.</p>

      {errorMsg && (
        <div className="form__alert-error" role="alert">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className="form__section">
          <legend>Credenciales de Ingreso</legend>
          <div className="acceso__grid">
            <label>
              Correo electrónico *
              <input
                type="email"
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                placeholder="ejemplo@correo.com"
                required
                disabled={cargando}
              />
            </label>

            <label>
              Contraseña *
              <input
                type="password"
                name="contrasena"
                value={form.contrasena}
                onChange={handleChange}
                placeholder="••••••••"
                required
                disabled={cargando}
              />
            </label>

            <div className="acceso__opciones">
              <label className="acceso__checkbox-label">
                <input
                  type="checkbox"
                  name="recordarUsuario"
                  checked={form.recordarUsuario}
                  onChange={handleChange}
                />
                <span>Recordar usuario en este equipo</span>
              </label>

              <div className="acceso__links-group">
                <button
                  type="button"
                  className="acceso__link-btn"
                  onClick={handleAbrirModalUsuario}
                >
                  ¿Olvidaste tu usuario?
                </button>
                <span className="acceso__link-separator">|</span>
                <button
                  type="button"
                  className="acceso__link-btn"
                  onClick={handleAbrirModalClave}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="form__captcha-container">
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 'bold' }}>
            <span>Seguridad: ¿Cuánto es {captchaChallenge.num1} + {captchaChallenge.num2}? *</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="Respuesta"
                required
                style={{ width: '120px' }}
                disabled={cargando}
              />
              <button
                type="button"
                onClick={generarCaptchaLocal}
                className="acceso__link-btn"
                title="Generar nueva operación"
                disabled={cargando}
              >
                Cambiar
              </button>
            </div>
          </label>
        </div>

        <button type="submit" className="form__submit-btn" disabled={cargando}>
          {cargando ? 'Validando credenciales...' : 'Iniciar sesión'}
        </button>
      </form>

      {/* Modal 1: Recuperar Usuario */}
      {modalRecuperarUsuario && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-icon">U</div>
            <h3>Recuperar Usuario</h3>

            {alertaRecuperarUser && (
              <div className="modal__alert-warning" role="alert">
                {alertaRecuperarUser}
              </div>
            )}

            {pasoUsuario === 1 ? (
              <form onSubmit={handleConsultarDocumentoUsuario}>
                <p>Ingresa tu tipo y número de documento registrado:</p>
                <div className="modal-input-group modal-input-group--vertical">
                  <select
                    value={tipoDocRecuperar}
                    onChange={(e) => setTipoDocRecuperar(e.target.value)}
                    required
                  >
                    <option value="">Tipo de documento...</option>
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="TI">Tarjeta de Identidad (TI)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PA">Pasaporte (PA)</option>
                  </select>

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Número de documento"
                    value={docRecuperar}
                    onChange={(e) => setDocRecuperar(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="modal-btn-confirm">
                    Continuar
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setModalRecuperarUsuario(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleValidarCorreoUsuario}>
                <p>
                  Documento validado: <strong>{tipoDocRecuperar} {enmascararDocumento(docRecuperar)}</strong>.
                  <br />
                  Selecciona tu correo electrónico registrado:
                </p>

                <div className="modal-input-group">
                  <select
                    value={correoSeleccionado}
                    onChange={(e) => setCorreoSeleccionado(e.target.value)}
                    required
                  >
                    <option value="">Selecciona tu correo...</option>
                    {opcionesCorreos.map((email, idx) => (
                      <option key={idx} value={email}>
                        {enmascararCorreo(email)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="modal-btn-confirm">
                    Verificar y Enviar
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setPasoUsuario(1)}
                  >
                    Atrás
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Recuperar Contraseña */}
      {modalRecuperarClave && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-icon">🔑</div>
            <h3>Recuperar Contraseña</h3>

            {alertaRecuperarClave && (
              <div className="modal__alert-warning" role="alert">
                {alertaRecuperarClave}
              </div>
            )}

            {pasoClave === 1 ? (
              <form onSubmit={handleConsultarCorreoClave}>
                <p>Ingresa el correo electrónico asociado a tu cuenta:</p>
                <div className="modal-input-group">
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={correoClaveRecuperar}
                    onChange={(e) => setCorreoClaveRecuperar(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="submit" className="modal-btn-confirm">
                    Continuar
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setModalRecuperarClave(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleValidarDocumentoClave}>
                <p>
                  Correo verificado: <strong>{enmascararCorreo(correoClaveRecuperar)}</strong>.
                  <br />
                  Confirma tu documento de identidad:
                </p>

                <div className="modal-input-group">
                  <select
                    value={documentoSeleccionado}
                    onChange={(e) => setDocumentoSeleccionado(e.target.value)}
                    required
                  >
                    <option value="">Selecciona tu documento...</option>
                    {opcionesDocumentos.map((docItem, idx) => (
                      <option key={idx} value={docItem.documento}>
                        {docItem.tipoDoc}: {enmascararDocumento(docItem.documento)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="submit" className="modal-btn-confirm">
                    Generar Clave
                  </button>
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setPasoClave(1)}
                  >
                    Atrás
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Notificación de Bienvenida */}
      {modalAviso && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-icon">ℹ️</div>
            <h3>Notificación Tecnosalud</h3>
            <div className="modal-info-box">
              <p>{mensajeExito}</p>
            </div>
            <button
              type="button"
              className="modal-btn-confirm"
              onClick={handleCerrarAviso}
            >
              {esLoginExitoso ? 'Ingresar a Servicios Clínicos' : 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Acceso;