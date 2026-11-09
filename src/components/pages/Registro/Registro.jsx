import { useEffect, useState } from 'react';
import './Registro.css';
import { llamarServicio, SERVICIO_REGISTRO } from '../../../utils/servicios';

const DIAS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MESES = [
  { valor: '01', nombre: 'Enero' },
  { valor: '02', nombre: 'Febrero' },
  { valor: '03', nombre: 'Marzo' },
  { valor: '04', nombre: 'Abril' },
  { valor: '05', nombre: 'Mayo' },
  { valor: '06', nombre: 'Junio' },
  { valor: '07', nombre: 'Julio' },
  { valor: '08', nombre: 'Agosto' },
  { valor: '09', nombre: 'Septiembre' },
  { valor: '10', nombre: 'Octubre' },
  { valor: '11', nombre: 'Noviembre' },
  { valor: '12', nombre: 'Diciembre' },
];

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: anioActual - 1920 + 1 }, (_, i) => String(anioActual - i));
const API_REGISTRO = import.meta.env.VITE_API_REGISTRO_URL || 'http://localhost:3004/api/registro';

const estadoInicial = {
  nombres: '',
  apellidos: '',
  tipoDocumentoCodigo: 'CC',
  documento: '',
  nacimientoDia: '',
  nacimientoMes: '',
  nacimientoAnio: '',
  generoCodigo: 'M',
  correo: '',
  telefono: '',
  direccion: '',
  municipioCodigo: '',
  tipoAfiliacionCodigo: 'PROFESIONAL',
  epsCodigo: '',
  regimenCodigo: '',
  contactoEmergenciaNombre: '',
  contactoEmergenciaTelefono: '',
  contactoEmergenciaParentescoCodigo: '',
  aceptaTratamientoDatos: false,
};

const camposRequeridos = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  tipoDocumentoCodigo: 'Tipo de documento',
  documento: 'Número de documento',
  nacimientoDia: 'Día de nacimiento',
  nacimientoMes: 'Mes de nacimiento',
  nacimientoAnio: 'Año de nacimiento',
  generoCodigo: 'Género',
  correo: 'Correo electrónico',
  telefono: 'Teléfono / Celular',
  direccion: 'Dirección de residencia',
  municipioCodigo: 'Ciudad / Municipio',
  regimenCodigo: 'Régimen de salud',
  epsCodigo: 'EPS / Entidad actual',
  contactoEmergenciaNombre: 'Nombre de contacto de emergencia',
  contactoEmergenciaTelefono: 'Teléfono de contacto de emergencia',
  contactoEmergenciaParentescoCodigo: 'Parentesco de emergencia',
};

function Registro() {
  const [form, setForm] = useState(estadoInicial);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalExito, setModalExito] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState('');

  const [departamentos, setDepartamentos] = useState([]);
  const [listaEps, setListaEps] = useState([]);
  const [errorCatalogos, setErrorCatalogos] = useState('');

  const [captchaChallenge, setCaptchaChallenge] = useState({ num1: 0, num2: 0, resultado: 0 });
  const [captchaInput, setCaptchaInput] = useState('');

  const generarCaptchaLocal = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setCaptchaChallenge({ num1, num2, resultado: num1 + num2 });
    setCaptchaInput('');
  };

  useEffect(() => {
    generarCaptchaLocal();
  }, []);

  useEffect(() => {
    let cancelado = false;

    const cargarCatalogos = async () => {
      try {
        const [respDeptos, respEps] = await Promise.all([
          fetch(`${API_REGISTRO}/departamentos`),
          fetch(`${API_REGISTRO}/eps`),
        ]);
        
        const deptos = await respDeptos.json();
        const eps = await respEps.json();

        if (cancelado) return;

        setDepartamentos(deptos);
        setListaEps(eps);
        setErrorCatalogos('');
      } catch {
        if (!cancelado) {
          setErrorCatalogos('No se pudieron cargar los catálogos.');
        }
      }
    };

    cargarCatalogos();
    return () => {
      cancelado = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => {
      const nuevoForm = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'regimenCodigo' && value.toUpperCase() === 'CONTRIBUTIVO') {
        const epsTecnosalud = listaEps.find(epsItem => (epsItem.nombre || '').toLowerCase().includes('tecnosalud'));
        if (epsTecnosalud) nuevoForm.epsCodigo = epsTecnosalud.codigo || epsTecnosalud.id || epsTecnosalud.nombre;
      }
      return nuevoForm;
    });
  };

  const handleNumericChange = (event) => {
    const { name, value } = event.target;
    const numericValue = value.replace(/\D/g, '');
    setForm((prev) => ({ ...prev, [name]: numericValue }));
  };

  const validarFormulario = () => {
    for (const [campo, etiqueta] of Object.entries(camposRequeridos)) {
      if (!form[campo] || String(form[campo]).trim() === '') {
        return `Por favor completa el campo: ${etiqueta}`;
      }
    }

    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regexEmail.test(form.correo.trim())) {
      return 'Por favor ingresa un correo electrónico válido (ej. usuario@dominio.com).';
    }

    if (form.telefono.length < 7 || form.telefono.length > 10) {
      return 'El número de teléfono debe tener entre 7 y 10 dígitos.';
    }

    if (form.contactoEmergenciaTelefono.length < 7 || form.contactoEmergenciaTelefono.length > 10) {
      return 'El teléfono de emergencia debe tener entre 7 y 10 dígitos.';
    }

    if (!form.aceptaTratamientoDatos) {
      return 'Debes autorizar el tratamiento de datos personales conforme a la Ley 1581 de 2012.';
    }

    if (parseInt(captchaInput, 10) !== captchaChallenge.resultado) {
      return 'El resultado del captcha es incorrecto. Intenta de nuevo.';
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    const error = validarFormulario();
    if (error) {
      setErrorMsg(error);
      if (parseInt(captchaInput, 10) !== captchaChallenge.resultado) {
        generarCaptchaLocal();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const fechaNacimiento = `${form.nacimientoAnio}-${form.nacimientoMes}-${form.nacimientoDia}`;

    const datosEnviar = {
      nombres: form.nombres,
      apellidos: form.apellidos,
      tipoDocumentoCodigo: form.tipoDocumentoCodigo,
      tipoDocumento: form.tipoDocumentoCodigo,
      documento: form.documento,
      fechaNacimiento,
      generoCodigo: form.generoCodigo,
      genero: form.generoCodigo,
      correo: form.correo,
      telefono: form.telefono,
      direccion: form.direccion,
      municipioCodigo: form.municipioCodigo,
      ciudad: form.municipioCodigo,
      municipio: form.municipioCodigo,
      tipoAfiliacionCodigo: 'PROFESIONAL',
      tipoAfiliacion: 'PROFESIONAL',
      epsCodigo: form.epsCodigo,
      eps: form.epsCodigo,
      regimenCodigo: form.regimenCodigo,
      regimen: form.regimenCodigo,
      salario: null,
      contactoEmergenciaNombre: form.contactoEmergenciaNombre,
      contactoEmergenciaTelefono: form.contactoEmergenciaTelefono,
      contactoEmergenciaParentescoCodigo: form.contactoEmergenciaParentescoCodigo,
      contactoEmergenciaParentesco: form.contactoEmergenciaParentescoCodigo,
      aceptaTratamientoDatos: form.aceptaTratamientoDatos,
    };
    
    try {
      const { ok, datos } = await llamarServicio(API_REGISTRO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnviar),
      }, SERVICIO_REGISTRO);

      if (!ok) {
        setErrorMsg(datos.error || Object.values(datos.errores || {})[0] || 'No se pudo completar el registro de usuario.');
        return;
      }

      setCorreoEnviado(datos.email || form.correo);
      setModalExito(true);
      setForm(estadoInicial);
      generarCaptchaLocal();
    } catch {
      setErrorMsg('No se pudo conectar con el micro-servicio de registro.');
    }
  };

  const cerrarModal = () => {
    setModalExito(false);
    setCorreoEnviado('');
  };

  return (
    <section className="page page--form">
      <h2>Registro de Usuario - Perfil Farmacia</h2>
      <p>Completa tus datos personales para habilitar tu acceso al módulo de farmacia con autogestión y activación por correo.</p>

      {errorMsg && (
        <div className="form__alert-error" role="alert">
          {errorMsg}
        </div>
      )}

      {errorCatalogos && (
        <p className="form__alert-error" role="status">
          {errorCatalogos}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* SECCIÓN 1: DATOS PERSONALES */}
        <fieldset className="form__section">
          <legend>Datos Personales e Identificación</legend>
          <div className="form__grid">
            <label>
              Nombres *
              <input
                type="text"
                name="nombres"
                value={form.nombres}
                onChange={handleChange}
                placeholder="Ej. Juan Carlos"
                required
              />
            </label>

            <label>
              Apellidos *
              <input
                type="text"
                name="apellidos"
                value={form.apellidos}
                onChange={handleChange}
                placeholder="Ej. Pérez Gómez"
                required
              />
            </label>

            <label>
              Tipo de documento *
              <select name="tipoDocumentoCodigo" value={form.tipoDocumentoCodigo} onChange={handleChange} required>
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PA">Pasaporte (PA)</option>
              </select>
            </label>

            <label>
              Número de documento *
              <input
                type="text"
                name="documento"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.documento}
                onChange={handleNumericChange}
                placeholder="Solo números"
                required
              />
            </label>

            <div className="form__date-wrapper">
              <span className="form__date-title">Fecha de nacimiento *</span>
              <div className="form__date-group">
                <select
                  name="nacimientoDia"
                  value={form.nacimientoDia}
                  onChange={handleChange}
                  required
                  aria-label="Día de nacimiento"
                >
                  <option value="">Día</option>
                  {DIAS.map((dia) => (
                    <option key={dia} value={dia}>{dia}</option>
                  ))}
                </select>

                <select
                  name="nacimientoMes"
                  value={form.nacimientoMes}
                  onChange={handleChange}
                  required
                  aria-label="Mes de nacimiento"
                >
                  <option value="">Mes</option>
                  {MESES.map((mes) => (
                    <option key={mes.valor} value={mes.valor}>{mes.nombre}</option>
                  ))}
                </select>

                <select
                  name="nacimientoAnio"
                  value={form.nacimientoAnio}
                  onChange={handleChange}
                  required
                  aria-label="Año de nacimiento"
                >
                  <option value="">Año</option>
                  {ANIOS.map((anio) => (
                    <option key={anio} value={anio}>{anio}</option>
                  ))}
                </select>
              </div>
            </div>

            <label>
              Género *
              <select name="generoCodigo" value={form.generoCodigo} onChange={handleChange} required>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="OTRO">Otro / Prefiero no decir</option>
              </select>
            </label>
          </div>
        </fieldset>

        {/* SECCIÓN 2: CONTACTO Y UBICACIÓN */}
        <fieldset className="form__section">
          <legend>Información de Contacto y Ubicación</legend>
          <div className="form__grid">
            <label>
              Correo electrónico *
              <input
                type="email"
                name="correo"
                value={form.correo}
                onChange={handleChange}
                placeholder="nombre@ejemplo.com"
                required
              />
            </label>

            <label>
              Teléfono / Celular *
              <input
                type="tel"
                name="telefono"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.telefono}
                onChange={handleNumericChange}
                placeholder="Ej. 3001234567"
                maxLength={10}
                required
              />
            </label>

            <label>
              Dirección de residencia *
              <input
                type="text"
                name="direccion"
                value={form.direccion}
                onChange={handleChange}
                placeholder="Ej. Calle 45 # 12-34"
                required
              />
            </label>

            <label>
              Ciudad / Municipio (Colombia) *
              <select name="municipioCodigo" value={form.municipioCodigo} onChange={handleChange} required>
                <option value="">Selecciona tu municipio...</option>
                {departamentos.map((depto) => (
                  <optgroup key={depto.codigo} label={depto.nombre}>
                    {(depto.municipios || []).map((mun) => (
                      <option key={mun.codigo} value={mun.codigo}>
                        {mun.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {/* SECCIÓN 3: SISTEMA DE SALUD */}
        <fieldset className="form__section">
          <legend>Datos del Sistema de Salud</legend>
          <div className="form__grid">
            <label className="form__col-full">
              Régimen de salud *
              <select name="regimenCodigo" value={form.regimenCodigo} onChange={handleChange} required>
                <option value="">Selecciona una opción</option>
                <option value="CONTRIBUTIVO">Contributivo</option>
                <option value="SUBSIDIADO">Subsidiado</option>
                <option value="ESPECIAL">Especial / Régimen de Excepción</option>
                <option value="PARTICULAR">Particular / Póliza de Salud</option>
              </select>
            </label>

            <label className="form__col-full">
              EPS / Entidad actual *
              <select 
                name="epsCodigo" 
                value={form.epsCodigo} 
                onChange={handleChange} 
                disabled={form.regimenCodigo.toUpperCase() === 'CONTRIBUTIVO'}
                required
              >
                <option value="">Selecciona tu EPS...</option>
                {listaEps.map((eps) => {
                  const valEps = eps.codigo || eps.id || eps.nit || eps.nombre;
                  return (
                    <option key={valEps} value={valEps}>
                      {eps.nombre}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </fieldset>

        {/* SECCIÓN 4: CONTACTO DE EMERGENCIA */}
        <fieldset className="form__section">
          <legend>Contacto de Emergencia</legend>
          <div className="form__grid">
            <label>
              Nombre completo del contacto *
              <input
                type="text"
                name="contactoEmergenciaNombre"
                value={form.contactoEmergenciaNombre}
                onChange={handleChange}
                placeholder="Familiar o persona responsable"
                required
              />
            </label>

            <label>
              Teléfono de emergencia *
              <input
                type="tel"
                name="contactoEmergenciaTelefono"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.contactoEmergenciaTelefono}
                onChange={handleNumericChange}
                placeholder="Ej. 3109876543"
                maxLength={10}
                required
              />
            </label>

            <label className="form__col-full">
              Parentesco del contacto de emergencia *
              <select name="contactoEmergenciaParentescoCodigo" value={form.contactoEmergenciaParentescoCodigo} onChange={handleChange} required>
                <option value="">Selecciona el parentesco...</option>
                <option value="conyuge">Cónyuge o compañero(a)</option>
                <option value="padre">Padre</option>
                <option value="madre">Madre</option>
                <option value="hijo">Hijo(a)</option>
                <option value="hermano">Hermano(a)</option>
                <option value="abuelo">Abuelo(a)</option>
                <option value="tio">Tío(a)</option>
                <option value="amigo">Amigo(a)</option>
                <option value="otro">Otro</option>
              </select>
            </label>
          </div>
        </fieldset>

        {/* SECCIÓN 5: POLÍTICA DE DATOS */}
        <fieldset className="form__section form__section--legal">
          <legend>Tratamiento de Datos Personales</legend>
          <div className="form__legal-notice">
            <p>
              En cumplimiento de la Ley 1581 de 2012, sus datos serán tratados para gestionar su acceso al perfil y servicios de farmacia.
            </p>
          </div>
          <label className="form__checkbox-label">
            <input
              type="checkbox"
              name="aceptaTratamientoDatos"
              checked={form.aceptaTratamientoDatos}
              onChange={handleChange}
              required
            />
            <span>
              Autorizo el tratamiento de mis datos personales para la creación de mi cuenta de perfil de farmacia. *
            </span>
          </label>
        </fieldset>

        {/* CONTROL DE SEGURIDAD LOCAL */}
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
                style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontWeight: 600 }}
              >
                Cambiar
              </button>
            </div>
          </label>
        </div>

        <button type="submit" className="form__submit-btn">Completar Registro de Usuario</button>
      </form>

      {modalExito && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h3>¡Registro Exitoso!</h3>
            <p>Hemos procesado tu alta para el perfil de farmacia en <strong>Tecnosalud</strong>.</p>
            <div className="modal-info-box">
              <p>Se ha enviado tu contraseña temporal al correo:</p>
              <span className="modal-email-highlight">{correoEnviado}</span>
            </div>
            <p className="modal-instruction">
              Revisa tu bandeja de entrada para activar tu cuenta y acceder al módulo de farmacia.
            </p>
            <button type="button" className="modal-btn-confirm" onClick={cerrarModal}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Registro;