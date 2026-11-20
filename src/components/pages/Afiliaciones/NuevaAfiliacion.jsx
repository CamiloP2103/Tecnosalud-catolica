import { useState, useEffect } from 'react';
import { llamarServicio, SERVICIO_REGISTRO } from '../../../utils/servicios';

const API_REGISTRO = import.meta.env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net/api/registro';

const DIAS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MESES = [
  { valor: '01', nombre: 'Enero' }, { valor: '02', nombre: 'Febrero' }, { valor: '03', nombre: 'Marzo' },
  { valor: '04', nombre: 'Abril' }, { valor: '05', nombre: 'Mayo' }, { valor: '06', nombre: 'Junio' },
  { valor: '07', nombre: 'Julio' }, { valor: '08', nombre: 'Agosto' }, { valor: '09', nombre: 'Septiembre' },
  { valor: '10', nombre: 'Octubre' }, { valor: '11', nombre: 'Noviembre' }, { valor: '12', nombre: 'Diciembre' },
];

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: anioActual - 1900 + 1 }, (_, i) => String(anioActual - i));

const estadoInicialAfiliacion = {
  nombres: '', apellidos: '', tipoDocumentoCodigo: 'CC', documento: '',
  nacimientoDia: '', nacimientoMes: '', nacimientoAnio: '', generoCodigo: '',
  correo: '', telefono: '', direccion: '', municipioCodigo: '',
  tipoAfiliacionCodigo: '', epsCodigo: '', regimenCodigo: '', salario: '',
  contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
  contactoEmergenciaParentescoCodigo: '', aceptaTratamientoDatos: false,
};

function NuevaAfiliacion() {
  const [listaEps, setListaEps] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [parentescos, setParentescos] = useState([]);

  const [formAfiliacion, setFormAfiliacion] = useState(estadoInicialAfiliacion);
  const [errorMsgAfiliacion, setErrorMsgAfiliacion] = useState('');
  const [modalExitoAfiliacion, setModalExitoAfiliacion] = useState(false);
  const [correoEnviadoAfiliacion, setCorreoEnviadoAfiliacion] = useState('');
  const [cargandoAfiliacion, setCargandoAfiliacion] = useState(false);

  const token = localStorage.getItem('tecnosalud_token');

  useEffect(() => {
    const cargarCatalogos = async () => {
      const timestamp = Date.now();
      try {
        const [resEps, resDeptos, resGeneros, resParentescos] = await Promise.all([
          fetch(`${API_REGISTRO}/eps?_t=${timestamp}`),
          fetch(`${API_REGISTRO}/departamentos?_t=${timestamp}`),
          fetch(`${API_REGISTRO}/generos?_t=${timestamp}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_REGISTRO}/parentescos?_t=${timestamp}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (resEps.ok) setListaEps(await resEps.json());
        if (resDeptos.ok) setDepartamentos(await resDeptos.json());
        if (resGeneros.ok) setGeneros(await resGeneros.json());
        if (resParentescos.ok) setParentescos(await resParentescos.json());
      } catch (error) {
        console.error('Error cargando catálogos para nueva afiliación:', error);
      }
    };
    cargarCatalogos();
  }, [token]);

  const handleAfiliacionChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormAfiliacion((prev) => {
      const nuevoForm = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'regimenCodigo' && value.toUpperCase() === 'CONTRIBUTIVO') {
        const epsTecnosalud = listaEps.find((epsItem) => (epsItem.nombre || '').toLowerCase().includes('tecnosalud'));
        if (epsTecnosalud) nuevoForm.epsCodigo = epsTecnosalud.codigo || epsTecnosalud.id || epsTecnosalud.nombre;
      }
      if (name === 'regimenCodigo' && value.toUpperCase() !== 'CONTRIBUTIVO') nuevoForm.salario = '';
      return nuevoForm;
    });
  };

  const handleAfiliacionNumericChange = (event) => {
    const { name, value } = event.target;
    setFormAfiliacion((prev) => ({ ...prev, [name]: value.replace(/\D/g, '') }));
  };

  const validarAfiliacionForm = () => {
    if (!formAfiliacion.tipoAfiliacionCodigo) return 'Por favor selecciona el tipo de afiliación.';
    if (!formAfiliacion.regimenCodigo) return 'Por favor selecciona el régimen de salud.';
    if (!formAfiliacion.epsCodigo) return 'Por favor selecciona la EPS.';
    if (!formAfiliacion.nombres.trim()) return 'Por favor completa los nombres.';
    if (!formAfiliacion.apellidos.trim()) return 'Por favor completa los apellidos.';
    if (!formAfiliacion.tipoDocumentoCodigo) return 'Selecciona el tipo de documento.';
    if (!formAfiliacion.documento.trim()) return 'Ingresa el número de documento.';
    if (!formAfiliacion.nacimientoDia || !formAfiliacion.nacimientoMes || !formAfiliacion.nacimientoAnio) return 'Selecciona la fecha de nacimiento completa.';
    if (!formAfiliacion.generoCodigo) return 'Selecciona el género.';
    if (!formAfiliacion.correo.trim()) return 'Ingresa el correo electrónico.';
    if (!formAfiliacion.telefono.trim()) return 'Ingresa el teléfono celular.';
    if (!formAfiliacion.direccion.trim()) return 'Ingresa la dirección de residencia.';
    if (!formAfiliacion.municipioCodigo) return 'Selecciona la ciudad o municipio.';

    if (formAfiliacion.regimenCodigo.toUpperCase() === 'CONTRIBUTIVO' && (!formAfiliacion.salario || String(formAfiliacion.salario).trim() === '')) {
      return 'Debes ingresar tu salario básico mensual para calcular la tarifa del régimen contributivo.';
    }

    if (!formAfiliacion.contactoEmergenciaNombre.trim() || !formAfiliacion.contactoEmergenciaTelefono.trim() || !formAfiliacion.contactoEmergenciaParentescoCodigo) {
      return 'Completa todos los campos obligatorios del contacto de emergencia.';
    }

    return null;
  };

  const handleAfiliacionSubmit = async (event) => {
    event.preventDefault();
    setErrorMsgAfiliacion('');

    const error = validarAfiliacionForm();
    if (error) {
      setErrorMsgAfiliacion(error);
      return;
    }

    setCargandoAfiliacion(true);
    const fechaNacimiento = `${formAfiliacion.nacimientoAnio}-${formAfiliacion.nacimientoMes}-${formAfiliacion.nacimientoDia}`;
    const datosEnviar = {
      nombres: formAfiliacion.nombres,
      apellidos: formAfiliacion.apellidos,
      tipoDocumentoCodigo: formAfiliacion.tipoDocumentoCodigo,
      tipoDocumento: formAfiliacion.tipoDocumentoCodigo,
      documento: formAfiliacion.documento,
      fechaNacimiento,
      generoCodigo: formAfiliacion.generoCodigo,
      genero: formAfiliacion.generoCodigo,
      correo: formAfiliacion.correo,
      telefono: formAfiliacion.telefono,
      direccion: formAfiliacion.direccion,
      municipioCodigo: formAfiliacion.municipioCodigo,
      ciudad: formAfiliacion.municipioCodigo,
      municipio: formAfiliacion.municipioCodigo,
      tipoAfiliacionCodigo: formAfiliacion.tipoAfiliacionCodigo,
      tipoAfiliacion: formAfiliacion.tipoAfiliacionCodigo,
      epsCodigo: formAfiliacion.epsCodigo,
      eps: formAfiliacion.epsCodigo,
      regimenCodigo: formAfiliacion.regimenCodigo,
      regimen: formAfiliacion.regimenCodigo,
      salario: formAfiliacion.regimenCodigo.toUpperCase() === 'CONTRIBUTIVO' ? formAfiliacion.salario : null,
      contactoEmergenciaNombre: formAfiliacion.contactoEmergenciaNombre,
      contactoEmergenciaTelefono: formAfiliacion.contactoEmergenciaTelefono,
      contactoEmergenciaParentescoCodigo: formAfiliacion.contactoEmergenciaParentescoCodigo,
      contactoEmergenciaParentesco: formAfiliacion.contactoEmergenciaParentescoCodigo,
      aceptaTratamientoDatos: false,
    };

    try {
      const { ok, datos } = await llamarServicio(API_REGISTRO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEnviar),
      }, SERVICIO_REGISTRO);

      if (!ok) {
        setErrorMsgAfiliacion(datos.error || Object.values(datos.errores || {})[0] || 'No se pudo completar el registro.');
        return;
      }
      setCorreoEnviadoAfiliacion(datos.email || formAfiliacion.correo);
      setModalExitoAfiliacion(true);
      setFormAfiliacion(estadoInicialAfiliacion);
    } catch {
      setErrorMsgAfiliacion('No se pudo conectar con el micro-servicio de registro.');
    } finally {
      setCargandoAfiliacion(false);
    }
  };

  return (
    <section className="adm-seccion">
      <div className="adm-tarjeta">
        <div className="adm-tarjeta__encabezado">
          <h3>Formulario de Nueva Afiliación al Sistema Tecnosalud</h3>
        </div>
        <p className="adm-nota">Completa el formulario institucional para tramitar una nueva solicitud de afiliación.</p>

        {errorMsgAfiliacion && (
          <div style={{ margin: '1rem 0', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontWeight: '500' }} role="alert">
            {errorMsgAfiliacion}
          </div>
        )}

        <form onSubmit={handleAfiliacionSubmit} noValidate style={{ display: 'grid', gap: '1.5rem', marginTop: '1rem' }}>
          <fieldset style={{ border: '1px solid var(--adm-borde)', padding: '1.2rem', borderRadius: '8px', background: '#f8fafc' }}>
            <legend style={{ fontWeight: 'bold', color: 'var(--adm-azul)', padding: '0 0.5rem' }}>Datos del Sistema de Salud</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Tipo de afiliación requerida *
                <select name="tipoAfiliacionCodigo" value={formAfiliacion.tipoAfiliacionCodigo} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                  <option value="">Selecciona una opción</option>
                  <option value="PACIENTE">Paciente / Afiliado General</option>
                  <option value="PROFESIONAL">Profesional de la salud</option>
                  <option value="EMPRESA">Empresa / Convenio Institucional</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Régimen de salud *
                <select name="regimenCodigo" value={formAfiliacion.regimenCodigo} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                  <option value="">Selecciona una opción</option>
                  <option value="CONTRIBUTIVO">Contributivo</option>
                  <option value="SUBSIDIADO">Subsidiado</option>
                  <option value="ESPECIAL">Especial / Régimen de Excepción</option>
                  <option value="PARTICULAR">Particular / Póliza de Salud</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600', gridColumn: formAfiliacion.regimenCodigo.toUpperCase() === 'CONTRIBUTIVO' ? 'span 1' : 'span 2' }}>
                EPS / Entidad actual *
                <select
                  name="epsCodigo"
                  value={formAfiliacion.epsCodigo}
                  onChange={handleAfiliacionChange}
                  className="adm-btn"
                  style={{ width: '100%', background: '#fff' }}
                  disabled={formAfiliacion.regimenCodigo.toUpperCase() === 'CONTRIBUTIVO'}
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
                {formAfiliacion.regimenCodigo.toUpperCase() === 'CONTRIBUTIVO' && (
                  <small style={{ color: '#0369a1', fontWeight: 'normal', marginTop: '0.2rem' }}>
                    Régimen Contributivo asignado automáticamente a Tecnosalud EPS.
                  </small>
                )}
              </label>

              {formAfiliacion.regimenCodigo.toUpperCase() === 'CONTRIBUTIVO' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                  Salario base (COP) *
                  <input
                    type="text"
                    name="salario"
                    inputMode="numeric"
                    value={formAfiliacion.salario}
                    onChange={handleAfiliacionNumericChange}
                    placeholder="Ej. 1300000"
                    required
                    className="adm-buscador"
                    style={{ width: '100%' }}
                  />
                </label>
              )}
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid var(--adm-borde)', padding: '1.2rem', borderRadius: '8px' }}>
            <legend style={{ fontWeight: 'bold', color: 'var(--adm-azul)', padding: '0 0.5rem' }}>Datos Personales e Identificación</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Nombres *
                <input type="text" name="nombres" value={formAfiliacion.nombres} onChange={handleAfiliacionChange} placeholder="Ej. Juan Carlos" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Apellidos *
                <input type="text" name="apellidos" value={formAfiliacion.apellidos} onChange={handleAfiliacionChange} placeholder="Ej. Pérez Gómez" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Tipo de documento *
                <select name="tipoDocumentoCodigo" value={formAfiliacion.tipoDocumentoCodigo} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="TI">Tarjeta de Identidad (TI)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="PA">Pasaporte (PA)</option>
                  <option value="RC">Registro Civil (RC)</option>
                  <option value="PPT">Permiso por Protección Temporal (PPT)</option>
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Número de documento *
                <input type="text" name="documento" inputMode="numeric" value={formAfiliacion.documento} onChange={handleAfiliacionNumericChange} placeholder="Solo números" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                <span>Fecha de nacimiento *</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <select name="nacimientoDia" value={formAfiliacion.nacimientoDia} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                    <option value="">Día</option>
                    {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select name="nacimientoMes" value={formAfiliacion.nacimientoMes} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                    <option value="">Mes</option>
                    {MESES.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                  </select>
                  <select name="nacimientoAnio" value={formAfiliacion.nacimientoAnio} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                    <option value="">Año</option>
                    {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600', gridColumn: 'span 2' }}>
                Género *
                <select name="generoCodigo" value={formAfiliacion.generoCodigo} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                  <option value="">Selecciona una opción</option>
                  {generos.map((g, idx) => (
                    <option key={idx} value={g.codigo || g.nombre}>{g.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid var(--adm-borde)', padding: '1.2rem', borderRadius: '8px' }}>
            <legend style={{ fontWeight: 'bold', color: 'var(--adm-azul)', padding: '0 0.5rem' }}>Información de Contacto y Ubicación</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Correo electrónico *
                <input type="email" name="correo" value={formAfiliacion.correo} onChange={handleAfiliacionChange} placeholder="nombre@ejemplo.com" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Teléfono / Celular *
                <input type="tel" name="telefono" inputMode="numeric" value={formAfiliacion.telefono} onChange={handleAfiliacionNumericChange} maxLength={10} placeholder="Ej. 3001234567" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Dirección de residencia *
                <input type="text" name="direccion" value={formAfiliacion.direccion} onChange={handleAfiliacionChange} placeholder="Ej. Calle 45 # 12-34" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Ciudad / Municipio (Colombia) *
                <select name="municipioCodigo" value={formAfiliacion.municipioCodigo} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                  <option value="">Selecciona tu municipio...</option>
                  {departamentos.map((depto) => (
                    <optgroup key={depto.codigo || depto.nombre} label={depto.nombre}>
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

          <fieldset style={{ border: '1px solid var(--adm-borde)', padding: '1.2rem', borderRadius: '8px' }}>
            <legend style={{ fontWeight: 'bold', color: 'var(--adm-azul)', padding: '0 0.5rem' }}>Contacto de Emergencia</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Nombre completo del contacto *
                <input type="text" name="contactoEmergenciaNombre" value={formAfiliacion.contactoEmergenciaNombre} onChange={handleAfiliacionChange} placeholder="Familiar o responsable" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                Teléfono de emergencia *
                <input type="tel" name="contactoEmergenciaTelefono" inputMode="numeric" value={formAfiliacion.contactoEmergenciaTelefono} onChange={handleAfiliacionNumericChange} maxLength={10} placeholder="Ej. 3109876543" required className="adm-buscador" style={{ width: '100%' }} />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600', gridColumn: 'span 2' }}>
                Parentesco del contacto de emergencia *
                <select name="contactoEmergenciaParentescoCodigo" value={formAfiliacion.contactoEmergenciaParentescoCodigo} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                  <option value="">Selecciona el parentesco...</option>
                  {parentescos.map((p, idx) => (
                    <option key={idx} value={p.codigo || p.nombre}>{p.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start', padding: '0.75rem 1.5rem' }} disabled={cargandoAfiliacion}>
            {cargandoAfiliacion ? 'Procesando Afiliación...' : 'Completar Afiliación'}
          </button>
        </form>
      </div>

      {modalExitoAfiliacion && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <h3>¡Afiliación Exitosa!</h3>
            <p>Hemos procesado tu solicitud en el sistema Tecnosalud.</p>
            <div className="modal-info-box" style={{ margin: '1rem 0', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <p>Se ha enviado tu contraseña temporal al correo:</p>
              <span className="modal-email-highlight" style={{ fontWeight: 'bold', color: 'var(--adm-azul)' }}>{correoEnviadoAfiliacion}</span>
            </div>
            <button type="button" className="modal-btn-confirm adm-btn adm-btn--azul" onClick={() => setModalExitoAfiliacion(false)}>Entendido</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default NuevaAfiliacion;