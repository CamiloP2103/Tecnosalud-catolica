import { useEffect, useState } from 'react';
import './Acceso.css';

const DUMMY_USERS = [
  { id: 1, tipoDoc: 'CC', documento: '72000607', email: 'caenjiro@gmail.com', contrasena: '123456', nombre: 'Carlos Jiménez' },
  { id: 2, tipoDoc: 'CC', documento: '1020304050', email: 'carlos.jimenez@tecnosalud.com.co', contrasena: 'admin2026', nombre: 'Carlos Admin' },
  { id: 3, tipoDoc: 'CE', documento: '52148963', email: 'maria.gomez@clinicaejemplo.com', contrasena: 'maria2026', nombre: 'María Gómez' },
  { id: 4, tipoDoc: 'TI', documento: '80123456', email: 'soporte.tecnosalud@gmail.com', contrasena: 'soporte123', nombre: 'Soporte Técnico' },
  { id: 5, tipoDoc: 'PA', documento: '19456789', email: 'afiliados.bogota@redsalud.com', contrasena: 'afiliados2026', nombre: 'Afiliaciones Bogotá' }
];

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
  const [usuarioEncontradoUser, setUsuarioEncontradoUser] = useState(null);
  const [opcionesCorreos, setOpcionesCorreos] = useState([]);
  const [correoSeleccionado, setCorreoSeleccionado] = useState('');
  const [intentosUsuario, setIntentosUsuario] = useState(0);
  const [alertaRecuperarUser, setAlertaRecuperarUser] = useState('');

  // Recuperación de Contraseña
  const [pasoClave, setPasoClave] = useState(1);
  const [correoClaveRecuperar, setCorreoClaveRecuperar] = useState('');
  const [usuarioEncontradoClave, setUsuarioEncontradoClave] = useState(null);
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

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMsg('');

    const correoIngresado = form.usuario.trim().toLowerCase();
    const claveIngresada = form.contrasena.trim();

    if (!correoIngresado || !claveIngresada) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.');
      return;
    }

    const usuarioValido = DUMMY_USERS.find(
      (u) => u.email.toLowerCase() === correoIngresado
    );

    if (!usuarioValido) {
      setErrorMsg('El correo electrónico no se encuentra registrado en el sistema.');
      return;
    }

    if (usuarioValido.contrasena !== claveIngresada) {
      setErrorMsg('La contraseña ingresada es incorrecta.');
      return;
    }

    if (parseInt(captchaInput, 10) !== captchaChallenge.resultado) {
      setErrorMsg('El resultado del captcha es incorrecto. Intenta de nuevo.');
      generarCaptchaLocal();
      return;
    }

    if (form.recordarUsuario) {
      localStorage.setItem('tecnosalud_usuario_recordado', form.usuario.trim());
    } else {
      localStorage.removeItem('tecnosalud_usuario_recordado');
    }

    // 1. Guardar en localStorage
    localStorage.setItem('tecnosalud_sesion_activa', JSON.stringify(usuarioValido));
    setUsuarioLogueado(usuarioValido);

    // 2. Notificar inmediatamente a App para activar "Servicios Clínicos" en el Navbar
    if (onLoginExitoso) {
      onLoginExitoso();
    }

    // 3. Mostrar modal de bienvenida
    setMensajeExito(`¡Bienvenido de nuevo, ${usuarioValido.nombre}! Has ingresado correctamente.`);
    setEsLoginExitoso(true);
    setModalAviso(true);

    setForm((prev) => ({
      ...prev,
      contrasena: '',
      usuario: prev.recordarUsuario ? prev.usuario : '',
    }));

    generarCaptchaLocal();
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem('tecnosalud_sesion_activa');
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
    setUsuarioEncontradoUser(null);
    setOpcionesCorreos([]);
    setCorreoSeleccionado('');
    setAlertaRecuperarUser('');
    setIntentosUsuario(0);
    setModalRecuperarUsuario(true);
  };

  const handleConsultarDocumentoUsuario = (e) => {
    e.preventDefault();
    setAlertaRecuperarUser('');

    const userFound = DUMMY_USERS.find(
      (u) => u.tipoDoc === tipoDocRecuperar && u.documento === docRecuperar.trim()
    );

    if (!userFound) {
      setAlertaRecuperarUser('No se encontró ningún usuario con ese tipo y número de documento.');
      return;
    }

    const distractores = [...CORREOS_DISTRACTORES].sort(() => 0.5 - Math.random()).slice(0, 2);
    const listaMezclada = [userFound.email, ...distractores].sort(() => 0.5 - Math.random());

    setUsuarioEncontradoUser(userFound);
    setOpcionesCorreos(listaMezclada);
    setPasoUsuario(2);
  };

  const handleValidarCorreoUsuario = (e) => {
    e.preventDefault();
    setAlertaRecuperarUser('');

    if (!correoSeleccionado) {
      setAlertaRecuperarUser('Por favor selecciona una opción de correo.');
      return;
    }

    if (correoSeleccionado === usuarioEncontradoUser.email) {
      setModalRecuperarUsuario(false);
      setMensajeExito(`Validación exitosa. Hemos enviado tu usuario a ${enmascararCorreo(usuarioEncontradoUser.email)}.`);
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
        setAlertaRecuperarUser(
          `El correo no coincide. Intento ${nuevosIntentos} de 3. Al tercer fallo la cuenta será bloqueada.`
        );
      }
    }
  };

  // Recuperar Contraseña
  const handleAbrirModalClave = () => {
    setPasoClave(1);
    setCorreoClaveRecuperar('');
    setUsuarioEncontradoClave(null);
    setOpcionesDocumentos([]);
    setDocumentoSeleccionado('');
    setAlertaRecuperarClave('');
    setIntentosClave(0);
    setModalRecuperarClave(true);
  };

  const handleConsultarCorreoClave = (e) => {
    e.preventDefault();
    setAlertaRecuperarClave('');

    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regexEmail.test(correoClaveRecuperar.trim())) {
      setAlertaRecuperarClave('Por favor ingresa un correo electrónico válido.');
      return;
    }

    const userFound = DUMMY_USERS.find(
      (u) => u.email.toLowerCase() === correoClaveRecuperar.trim().toLowerCase()
    );

    if (!userFound) {
      setAlertaRecuperarClave('El correo ingresado no se encuentra registrado en el sistema.');
      return;
    }

    const distractores = [...DOCUMENTOS_DISTRACTORES].sort(() => 0.5 - Math.random()).slice(0, 2);
    const listaMezclada = [
      { tipoDoc: userFound.tipoDoc, documento: userFound.documento, esReal: true },
      ...distractores.map((d) => ({ ...d, esReal: false }))
    ].sort(() => 0.5 - Math.random());

    setUsuarioEncontradoClave(userFound);
    setOpcionesDocumentos(listaMezclada);
    setPasoClave(2);
  };

  const handleValidarDocumentoClave = (e) => {
    e.preventDefault();
    setAlertaRecuperarClave('');

    if (!documentoSeleccionado) {
      setAlertaRecuperarClave('Por favor selecciona una opción de documento.');
      return;
    }

    if (documentoSeleccionado === usuarioEncontradoClave.documento) {
      setModalRecuperarClave(false);
      setMensajeExito(`Validación exitosa. Se ha generado una clave temporal enviada a ${enmascararCorreo(usuarioEncontradoClave.email)}.`);
      setEsLoginExitoso(false);
      setModalAviso(true);
    } else {
      const nuevosIntentos = intentosClave + 1;
      setIntentosClave(nuevosIntentos);

      if (nuevosIntentos >= 3) {
        setModalRecuperarClave(false);
        setMensajeExito('Has superado los 3 intentos permitidos. Por seguridad, la recuperación fue cancelada.');
        setEsLoginExitoso(false);
        setModalAviso(true);
      } else {
        setAlertaRecuperarClave(
          `El documento no coincide. Intento ${nuevosIntentos} de 3. Al tercer fallo la cuenta será bloqueada.`
        );
      }
    }
  };

  const handleCerrarAviso = () => {
    setModalAviso(false);
    if (esLoginExitoso && onNavigate) {
      onNavigate('servicios');
    }
  };

  // VISTA: SESIÓN ACTIVA (Cuando no hay modal abierto)
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

  // VISTA: FORMULARIO DE ACCESO (O Modal de bienvenida activo)
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

        {/* Control de Seguridad Local */}
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
              />
              <button
                type="button"
                onClick={generarCaptchaLocal}
                className="acceso__link-btn"
                title="Generar nueva operación"
              >
                🔄 Cambiar
              </button>
            </div>
          </label>
        </div>

        <button type="submit" className="form__submit-btn">Iniciar sesión</button>
      </form>

      {/* Modal 1: Recuperar Usuario */}
      {modalRecuperarUsuario && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-icon">👤</div>
            <h3>Recuperar Usuario</h3>

            {alertaRecuperarUser && (
              <div className="modal__alert-warning" role="alert">
                ⚠️ {alertaRecuperarUser}
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
                  Selecciona tu correo electrónico:
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
                ⚠️ {alertaRecuperarClave}
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
                  Selecciona el documento de identidad asociado:
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