import { useEffect, useRef, useState } from 'react';
import './Acceso.css';

const captchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

// Base de datos simulada (datos dummies)
const DUMMY_USERS = [
  { id: 1, tipoDoc: 'CC', documento: '72000607', email: 'caenjiro@gmail.com', nombre: 'Carlos Jiménez' },
  { id: 2, tipoDoc: 'CC', documento: '1020304050', email: 'carlos.jimenez@tecnosalud.com.co', nombre: 'Carlos Admin' },
  { id: 3, tipoDoc: 'CE', documento: '52148963', email: 'maria.gomez@clinicaejemplo.com', nombre: 'María Gómez' },
  { id: 4, tipoDoc: 'TI', documento: '80123456', email: 'soporte.tecnosalud@gmail.com', nombre: 'Soporte Técnico' },
  { id: 5, tipoDoc: 'PA', documento: '19456789', email: 'afiliados.bogota@redsalud.com', nombre: 'Afiliaciones Bogotá' }
];

// Distractores de correos y documentos
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

// Funciones para enmascarar
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

function Acceso({ onLoginExitoso }) {
  const [form, setForm] = useState({
    usuario: '',
    contrasena: '',
    recordarUsuario: false,
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Modales
  const [modalRecuperarUsuario, setModalRecuperarUsuario] = useState(false);
  const [modalRecuperarClave, setModalRecuperarClave] = useState(false);
  const [modalAviso, setModalAviso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [esLoginExitoso, setEsLoginExitoso] = useState(false);

  // Estados para Recuperación de Usuario
  const [pasoUsuario, setPasoUsuario] = useState(1);
  const [tipoDocRecuperar, setTipoDocRecuperar] = useState('');
  const [docRecuperar, setDocRecuperar] = useState('');
  const [usuarioEncontradoUser, setUsuarioEncontradoUser] = useState(null);
  const [opcionesCorreos, setOpcionesCorreos] = useState([]);
  const [correoSeleccionado, setCorreoSeleccionado] = useState('');
  const [intentosUsuario, setIntentosUsuario] = useState(0);
  const [alertaRecuperarUser, setAlertaRecuperarUser] = useState('');

  // Estados para Recuperación de Contraseña
  const [pasoClave, setPasoClave] = useState(1);
  const [correoClaveRecuperar, setCorreoClaveRecuperar] = useState('');
  const [usuarioEncontradoClave, setUsuarioEncontradoClave] = useState(null);
  const [opcionesDocumentos, setOpcionesDocumentos] = useState([]);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState('');
  const [intentosClave, setIntentosClave] = useState(0);
  const [alertaRecuperarClave, setAlertaRecuperarClave] = useState('');

  const recaptchaRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Cargar usuario recordado
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('tecnosalud_usuario_recordado');
    if (usuarioGuardado) {
      setForm((prev) => ({
        ...prev,
        usuario: usuarioGuardado,
        recordarUsuario: true,
      }));
    }
  }, []);

  // Inicialización de reCAPTCHA
  useEffect(() => {
    const renderRecaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.render && recaptchaRef.current && widgetIdRef.current === null) {
        try {
          widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, {
            sitekey: captchaKey,
          });
        } catch (error) {
          console.warn('reCAPTCHA ya cargado:', error);
        }
      }
    };

    if (window.grecaptcha?.render) {
      renderRecaptcha();
    } else {
      const interval = setInterval(() => {
        if (window.grecaptcha?.render) {
          renderRecaptcha();
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

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

    if (!form.usuario.trim() || !form.contrasena.trim()) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.');
      return;
    }

    let response = '';
    if (window.grecaptcha && widgetIdRef.current !== null) {
      try {
        response = window.grecaptcha.getResponse(widgetIdRef.current);
      } catch (err) {
        console.error('Error al obtener captcha:', err);
      }
    }

    if (!response) {
      setErrorMsg('Por favor, completa el captcha para iniciar sesión.');
      return;
    }

    if (form.recordarUsuario) {
      localStorage.setItem('tecnosalud_usuario_recordado', form.usuario);
    } else {
      localStorage.removeItem('tecnosalud_usuario_recordado');
    }

    setMensajeExito(`¡Bienvenido de nuevo! Has iniciado sesión correctamente con la cuenta: ${form.usuario}`);
    setEsLoginExitoso(true);
    setModalAviso(true);

    setForm((prev) => ({
      ...prev,
      contrasena: '',
      usuario: prev.recordarUsuario ? prev.usuario : '',
    }));

    if (window.grecaptcha && widgetIdRef.current !== null) {
      try {
        window.grecaptcha.reset(widgetIdRef.current);
      } catch (err) {
        console.warn('Error al resetear captcha:', err);
      }
    }
  };

  // --- MODAL RECUPERAR USUARIO ---
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
      setAlertaRecuperarUser('No se encontró ningún usuario registrado con el tipo y número de documento ingresados.');
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
      setMensajeExito(`Validación exitosa. Hemos enviado tu nombre de usuario al correo registrado (${enmascararCorreo(usuarioEncontradoUser.email)}).`);
      setEsLoginExitoso(false);
      setModalAviso(true);
    } else {
      const nuevosIntentos = intentosUsuario + 1;
      setIntentosUsuario(nuevosIntentos);

      if (nuevosIntentos >= 3) {
        setModalRecuperarUsuario(false);
        setMensajeExito('Has superado el límite de 3 intentos permitidos. Por motivos de seguridad, el proceso ha sido cancelado y tu cuenta será bloqueada preventivamente si continúas ingresando datos erróneos.');
        setEsLoginExitoso(false);
        setModalAviso(true);
      } else {
        setAlertaRecuperarUser(
          `El correo seleccionado no coincide con el registrado. Intento ${nuevosIntentos} de 3. Advertencia: Al tercer intento fallido el proceso se cancelará por seguridad.`
        );
      }
    }
  };

  // --- MODAL RECUPERAR CONTRASEÑA ---
  const handleAbrirModalClave = () => {
    setPasoClave(1);
    setCorreoClaveRecuperar(form.usuario || '');
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
      setAlertaRecuperarClave('Por favor ingresa un correo electrónico con formato válido (ej. usuario@dominio.com).');
      return;
    }

    const userFound = DUMMY_USERS.find(
      (u) => u.email.toLowerCase() === correoClaveRecuperar.trim().toLowerCase()
    );

    if (!userFound) {
      setAlertaRecuperarClave('El correo ingresado no corresponde a ninguna cuenta registrada en Tecnosalud.');
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
      setMensajeExito(`Validación exitosa. Se ha generado una contraseña temporal que fue enviada al correo: ${enmascararCorreo(usuarioEncontradoClave.email)}.`);
      setEsLoginExitoso(false);
      setModalAviso(true);
    } else {
      const nuevosIntentos = intentosClave + 1;
      setIntentosClave(nuevosIntentos);

      if (nuevosIntentos >= 3) {
        setModalRecuperarClave(false);
        setMensajeExito('Has superado el límite de 3 intentos permitidos. Por seguridad, la recuperación de clave ha sido cancelada y la cuenta será bloqueada si se reiteran accesos no autorizados.');
        setEsLoginExitoso(false);
        setModalAviso(true);
      } else {
        setAlertaRecuperarClave(
          `El documento seleccionado no coincide con la cuenta registrada. Intento ${nuevosIntentos} de 3. Advertencia: Si fallas 3 veces tu cuenta será bloqueada.`
        );
      }
    }
  };

  // Cierre de modal y redirección condicional
  const handleCerrarAviso = () => {
    setModalAviso(false);
    if (esLoginExitoso && onLoginExitoso) {
      onLoginExitoso();
    }
  };

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

        <div className="form__captcha-container">
          <div ref={recaptchaRef}></div>
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
                  Selecciona tu correo electrónico para verificar tu identidad:
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
                  Selecciona el documento de identidad asociado a esta cuenta:
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

      {/* Modal 3: Aviso / Notificación */}
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