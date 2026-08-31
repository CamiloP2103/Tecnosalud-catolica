import { useEffect, useState } from 'react';
import './Registro.css';

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

const MUNICIPIOS_COLOMBIA = [
  { depto: 'Cundinamarca / D.C.', ciudades: ['Bogotá D.C.', 'Soacha', 'Chía', 'Zipaquirá', 'Facatativá', 'Girardot'] },
  { depto: 'Antioquia', ciudades: ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Rionegro', 'Apartadó'] },
  { depto: 'Valle del Cauca', ciudades: ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga'] },
  { depto: 'Atlántico', ciudades: ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia'] },
  { depto: 'Santander', ciudades: ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja'] },
  { depto: 'Bolívar', ciudades: ['Cartagena', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar'] },
  { depto: 'Eje Cafetero', ciudades: ['Pereira', 'Manizales', 'Armenia', 'Dosquebradas', 'Santa Rosa de Cabal'] },
  { depto: 'Tolima y Huila', ciudades: ['Ibagué', 'Neiva', 'Espinal', 'Pitalito', 'Melgar'] },
  { depto: 'Nariño y Cauca', ciudades: ['Pasto', 'Popayán', 'Ipiales', 'Tumaco', 'Santander de Quilichao'] },
  { depto: 'Norte de Santander', ciudades: ['Cúcuta', 'Ocaña', 'Villa del Rosario', 'Los Patios', 'Pamplona'] },
  { depto: 'Costa Caribe (Otras)', ciudades: ['Santa Marta', 'Valledupar', 'Montería', 'Sincelejo', 'Riohacha'] },
  { depto: 'Llanos y Amazonía/Orinoquía', ciudades: ['Villavicencio', 'Yopal', 'Florencia', 'Arauca', 'Leticia', 'San José del Guaviare'] },
  { depto: 'Otros', ciudades: ['Otro Municipio'] }
];

const estadoInicial = {
  nombres: '',
  apellidos: '',
  tipoDocumento: '',
  documento: '',
  nacimientoDia: '',
  nacimientoMes: '',
  nacimientoAnio: '',
  genero: '',
  correo: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  tipoAfiliacion: '',
  eps: '',
  regimen: '',
  contactoEmergenciaNombre: '',
  contactoEmergenciaTelefono: '',
  aceptaTratamientoDatos: false,
};

const camposRequeridos = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  tipoDocumento: 'Tipo de documento',
  documento: 'Número de documento',
  nacimientoDia: 'Día de nacimiento',
  nacimientoMes: 'Mes de nacimiento',
  nacimientoAnio: 'Año de nacimiento',
  genero: 'Género',
  correo: 'Correo electrónico',
  telefono: 'Teléfono / Celular',
  direccion: 'Dirección de residencia',
  ciudad: 'Ciudad / Municipio',
  tipoAfiliacion: 'Tipo de afiliación',
  eps: 'EPS / Entidad actual',
  regimen: 'Régimen de salud',
  contactoEmergenciaNombre: 'Nombre de contacto de emergencia',
  contactoEmergenciaTelefono: 'Teléfono de contacto de emergencia',
};

function Registro() {
  const [form, setForm] = useState(estadoInicial);
  const [errorMsg, setErrorMsg] = useState('');
  const [modalExito, setModalExito] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState('');

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
    generarCaptchaLocal();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

    const diaNum = Number(form.nacimientoDia);
    const mesNum = Number(form.nacimientoMes);
    const anioNum = Number(form.nacimientoAnio);
    const fechaArmada = new Date(anioNum, mesNum - 1, diaNum);

    if (
      fechaArmada.getFullYear() !== anioNum ||
      fechaArmada.getMonth() !== mesNum - 1 ||
      fechaArmada.getDate() !== diaNum
    ) {
      return 'La fecha de nacimiento seleccionada no es válida.';
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
      return 'Debes autorizar el tratamiento de tus datos personales y sensibles conforme a la Ley 1581 de 2012 para afiliarte.';
    }

    if (parseInt(captchaInput, 10) !== captchaChallenge.resultado) {
      return 'El resultado del captcha es incorrecto. Intenta de nuevo.';
    }

    return null;
  };

  const handleSubmit = (event) => {
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

    setCorreoEnviado(form.correo);
    setModalExito(true);

    setForm(estadoInicial);
    generarCaptchaLocal();
  };

  const cerrarModal = () => {
    setModalExito(false);
    setCorreoEnviado('');
  };

  return (
    <section className="page page--form">
      <h2>Afiliación al Sistema Tecnosalud</h2>
      <p>Completa el formulario con tus datos para tramitar tu solicitud de afiliación.</p>

      {errorMsg && (
        <div className="form__alert-error" role="alert">
          {errorMsg}
        </div>
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
              <select name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange} required>
                <option value="">Selecciona una opción</option>
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
              <select name="genero" value={form.genero} onChange={handleChange} required>
                <option value="">Selecciona una opción</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro / Prefiero no decir</option>
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
              <select name="ciudad" value={form.ciudad} onChange={handleChange} required>
                <option value="">Selecciona tu municipio...</option>
                {MUNICIPIOS_COLOMBIA.map((grupo) => (
                  <optgroup key={grupo.depto} label={grupo.depto}>
                    {grupo.ciudades.map((ciudad) => (
                      <option key={ciudad} value={ciudad}>
                        {ciudad}
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
            <label>
              Tipo de afiliación requerida *
              <select name="tipoAfiliacion" value={form.tipoAfiliacion} onChange={handleChange} required>
                <option value="">Selecciona una opción</option>
                <option value="paciente">Paciente / Afiliado General</option>
                <option value="profesional">Profesional de la salud</option>
                <option value="empresa">Empresa / Convenio Institucional</option>
              </select>
            </label>

            <label>
              EPS / Entidad actual *
              <input
                type="text"
                name="eps"
                value={form.eps}
                onChange={handleChange}
                placeholder="Ej. Sanitas, Sura, Famisanar"
                required
              />
            </label>

            <label className="form__col-full">
              Régimen de salud *
              <select name="regimen" value={form.regimen} onChange={handleChange} required>
                <option value="">Selecciona una opción</option>
                <option value="contributivo">Contributivo</option>
                <option value="subsidiado">Subsidiado</option>
                <option value="especial">Especial / Régimen de Excepción</option>
                <option value="particular">Particular / Póliza de Salud</option>
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
          </div>
        </fieldset>

        {/* SECCIÓN 5: POLÍTICA DE TRATAMIENTO DE DATOS */}
        <fieldset className="form__section form__section--legal">
          <legend>Tratamiento de Datos Personales y Sensibles</legend>
          <div className="form__legal-notice">
            <p>
              En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> y el Decreto 1377 de 2013 de la República de Colombia, 
              <strong> Tecnosalud</strong> le informa que los datos recolectados (incluyendo información médica y de salud catalogada como dato sensible) 
              serán tratados para fines asistenciales, administrativos y de gestión del servicio. Como titular, usted tiene derecho a conocer, actualizar, 
              rectificar y suprimir sus datos mediante los canales oficiales de atención.
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
              Autorizo de manera libre, previa, expresa e informada a <strong>Tecnosalud</strong> para el tratamiento de mis datos personales y sensibles según la Política de Protección de Datos Personales. *
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
                🔄 Cambiar
              </button>
            </div>
          </label>
        </div>

        <button type="submit" className="form__submit-btn">Completar Afiliación</button>
      </form>

      {modalExito && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-icon">✉️</div>
            <h3>¡Registro Exitoso!</h3>
            <p>Hemos procesado tu afiliación a <strong>Tecnosalud</strong>.</p>
            <div className="modal-info-box">
              <p>Se ha enviado un mensaje con tu <strong>contraseña temporal autogenerada</strong> a:</p>
              <span className="modal-email-highlight">{correoEnviado}</span>
            </div>
            <p className="modal-instruction">
              Utiliza esta credencial para iniciar sesión por primera vez y realizar el cambio de tu contraseña por una definitiva.
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