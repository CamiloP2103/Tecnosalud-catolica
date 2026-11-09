import { useState, useEffect } from 'react';
import './PanelAfiliaciones.css'; 
import { llamarServicio, SERVICIO_REGISTRO } from '../../../utils/servicios';

const API_REGISTRO = import.meta.env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net/api/registro';
const API_AUTH = import.meta.env.VITE_API_AUTH_URL || 'https://tecnosalud-auth-2026-grgzcsa5ajhje5f8.brazilsouth-01.azurewebsites.net/api/auth';

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

function PanelAfiliaciones() {
  const [seccionActiva, setSeccionActiva] = useState('solicitudes');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Estados de Solicitudes
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [mensajeSolicitudes, setMensajeSolicitudes] = useState('');

  // Estados para Crear Usuario EPS
  const [formUsuario, setFormUsuario] = useState({
    tipo_doc: 'CC',
    documento: '',
    email: '',
    nombre: '',
    rol_id: '2'
  });
  const [cargandoCrear, setCargandoCrear] = useState(false);
  const [mensajeCrear, setMensajeCrear] = useState({ tipo: '', texto: '' });

  // Estados independientes de Maestros y Geografía
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [listaEps, setListaEps] = useState([]);
  const [generos, setGeneros] = useState([]);
  const [parentescos, setParentescos] = useState([]);
  
  const [cargandoGeo, setCargandoGeo] = useState(false);
  const [cargandoGeneros, setCargandoGeneros] = useState(false);
  const [cargandoParentescos, setCargandoParentescos] = useState(false);
  const [cargandoEps, setCargandoEps] = useState(false);

  // Campos de Formularios
  const [nombreDepartamento, setNombreDepartamento] = useState('');
  const [nombreMunicipio, setNombreMunicipio] = useState('');
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState('');
  const [nombreGenero, setNombreGenero] = useState('');
  const [nombreParentesco, setNombreParentesco] = useState('');
  const [nombreEps, setNombreEps] = useState('');
  
  const [mensajeCat, setMensajeCat] = useState({ tipo: '', texto: '' });
  const [mensajeGeo, setMensajeGeo] = useState({ tipo: '', texto: '' });

  // Estados del Formulario de Nueva Afiliación
  const [formAfiliacion, setFormAfiliacion] = useState(estadoInicialAfiliacion);
  const [errorMsgAfiliacion, setErrorMsgAfiliacion] = useState('');
  const [modalExitoAfiliacion, setModalExitoAfiliacion] = useState(false);
  const [correoEnviadoAfiliacion, setCorreoEnviadoAfiliacion] = useState('');
  const [cargandoAfiliacion, setCargandoAfiliacion] = useState(false);

  const token = localStorage.getItem('tecnosalud_token');

  useEffect(() => {
    setMensajeCat({ tipo: '', texto: '' });
    setMensajeGeo({ tipo: '', texto: '' });

    if (seccionActiva === 'solicitudes') {
      cargarSolicitudesPendientes();
    } else if (seccionActiva === 'generos') {
      cargarGeneros();
    } else if (seccionActiva === 'parentescos') {
      cargarParentescos();
    } else if (seccionActiva === 'eps') {
      cargarEps();
    } else if (seccionActiva === 'geografia') {
      cargarCatalogosGeograficos();
    } else if (seccionActiva === 'nueva-afiliacion') {
      cargarEps();
      cargarCatalogosGeograficos();
      cargarGeneros();
      cargarParentescos();
    }
  }, [seccionActiva]);

  const cargarSolicitudesPendientes = async () => {
    setCargandoSolicitudes(true);
    try {
      const res = await fetch(`${API_REGISTRO}/admin/afiliados?estado=PENDIENTE`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSolicitudes(data.afiliados || []);
      else setMensajeSolicitudes(data.error || 'No se pudieron cargar las solicitudes.');
    } catch {
      setMensajeSolicitudes('Error de conexión al cargar solicitudes.');
    } finally {
      setCargandoSolicitudes(false);
    }
  };

  const aprobarSolicitud = async (id) => {
    try {
      const res = await fetch(`${API_REGISTRO}/admin/afiliados/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'ACTIVO', observacion: 'Aprobado desde el panel de afiliaciones' })
      });
      if (res.ok) setSolicitudes(solicitudes.filter(s => s.id !== id));
      else {
        const data = await res.json();
        alert(data.error || 'No se pudo aprobar la solicitud.');
      }
    } catch {
      alert('Error de red al aprobar la solicitud.');
    }
  };

  // Carga usando el endpoint dedicado de géneros (o listado general si aplica)
  const cargarGeneros = async () => {
    setCargandoGeneros(true);
    try {
      const res = await fetch(`${API_REGISTRO}/generos?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setGeneros(await res.json());
    } catch (error) {
      console.error('Error cargando géneros:', error);
    } finally {
      setCargandoGeneros(false);
    }
  };

  const cargarParentescos = async () => {
    setCargandoParentescos(true);
    try {
      const res = await fetch(`${API_REGISTRO}/parentescos?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setParentescos(await res.json());
    } catch (error) {
      console.error('Error cargando parentescos:', error);
    } finally {
      setCargandoParentescos(false);
    }
  };

  const cargarEps = async () => {
    setCargandoEps(true);
    try {
      const res = await fetch(`${API_REGISTRO}/eps?_t=${Date.now()}`);
      if (res.ok) setListaEps(await res.json());
    } catch (error) {
      console.error('Error cargando EPS:', error);
    } finally {
      setCargandoEps(false);
    }
  };

  const cargarCatalogosGeograficos = async () => {
    setCargandoGeo(true);
    try {
      const timestamp = Date.now();
      const [resDeptos, resMun] = await Promise.all([
        fetch(`${API_REGISTRO}/departamentos?_t=${timestamp}`),
        fetch(`${API_REGISTRO}/municipios?_t=${timestamp}`)
      ]);
      if (resDeptos.ok) setDepartamentos(await resDeptos.json());
      if (resMun.ok) setMunicipios(await resMun.json());
    } catch (error) {
      console.error('Error cargando geografía:', error);
    } finally {
      setCargandoGeo(false);
    }
  };

  const handleCrearGenero = async (e) => {
    e.preventDefault();
    if (!nombreGenero.trim()) return;
    try {
      const res = await fetch(`${API_REGISTRO}/generos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nombreGenero.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeCat({ tipo: 'exito', texto: 'Género creado exitosamente.' });
        setNombreGenero('');
        cargarGeneros();
      } else setMensajeCat({ tipo: 'error', texto: data.error || 'Error al crear género.' });
    } catch {
      setMensajeCat({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCrearParentesco = async (e) => {
    e.preventDefault();
    if (!nombreParentesco.trim()) return;
    try {
      const res = await fetch(`${API_REGISTRO}/parentescos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nombreParentesco.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeCat({ tipo: 'exito', texto: 'Parentesco creado exitosamente.' });
        setNombreParentesco('');
        cargarParentescos();
      } else setMensajeCat({ tipo: 'error', texto: data.error || 'Error al crear parentesco.' });
    } catch {
      setMensajeCat({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCrearEps = async (e) => {
    e.preventDefault();
    if (!nombreEps.trim()) return;
    try {
      const res = await fetch(`${API_REGISTRO}/eps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nombreEps.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeCat({ tipo: 'exito', texto: 'EPS creada exitosamente.' });
        setNombreEps('');
        cargarEps();
      } else setMensajeCat({ tipo: 'error', texto: data.error || 'Error al crear EPS.' });
    } catch {
      setMensajeCat({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCrearDepartamento = async (e) => {
    e.preventDefault();
    if (!nombreDepartamento.trim()) return;
    try {
      const res = await fetch(`${API_REGISTRO}/departamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: nombreDepartamento.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeGeo({ tipo: 'exito', texto: 'Departamento creado exitosamente.' });
        setNombreDepartamento('');
        cargarCatalogosGeograficos();
      } else setMensajeGeo({ tipo: 'error', texto: data.error || 'No se pudo crear el departamento.' });
    } catch {
      setMensajeGeo({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCrearMunicipio = async (e) => {
    e.preventDefault();
    if (!nombreMunicipio.trim() || !departamentoSeleccionado) return;
    try {
      const res = await fetch(`${API_REGISTRO}/municipios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ departamento_id: departamentoSeleccionado, nombre: nombreMunicipio.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeGeo({ tipo: 'exito', texto: 'Ciudad/Municipio creado exitosamente.' });
        setNombreMunicipio('');
        cargarCatalogosGeograficos();
      } else setMensajeGeo({ tipo: 'error', texto: data.error || 'No se pudo crear la ciudad.' });
    } catch {
      setMensajeGeo({ tipo: 'error', texto: 'Error de conexión.' });
    }
  };

  const handleCrearUsuarioChange = (e) => {
    const { name, value } = e.target;
    setFormUsuario(prev => ({ ...prev, [name]: value }));
  };

  const handleCrearUsuarioSubmit = async (e) => {
    e.preventDefault();
    setCargandoCrear(true);
    setMensajeCrear({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_AUTH}/registro-interno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formUsuario)
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeCrear({ tipo: 'exito', texto: 'Usuario EPS creado correctamente. Se le envió un correo para activar su cuenta.' });
        setFormUsuario({ tipo_doc: 'CC', documento: '', email: '', nombre: '', rol_id: '2' });
      } else {
        setMensajeCrear({ tipo: 'error', texto: data.error || 'Error al crear el usuario.' });
      }
    } catch {
      setMensajeCrear({ tipo: 'error', texto: 'Error de conexión con el servicio de autenticación.' });
    } finally {
      setCargandoCrear(false);
    }
  };

  const handleAfiliacionChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormAfiliacion((prev) => {
      const nuevoForm = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'regimenCodigo' && value.toUpperCase() === 'CONTRIBUTIVO') {
        const epsTecnosalud = listaEps.find(epsItem => (epsItem.nombre || '').toLowerCase().includes('tecnosalud'));
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
    <div className="adm-panel">
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button
          type="button"
          className="adm-menu__alternar"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Abrir menú de afiliaciones"
        >
          ☰
        </button>
      </div>

      <aside className={`adm-menu ${menuAbierto ? 'adm-menu--abierto' : ''}`}>
        <p className="adm-menu__titulo">Gestión de Afiliaciones</p>
        <nav>
          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'solicitudes' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('solicitudes'); setMenuAbierto(false); }}
          >
            <span>Aprobación de Solicitudes</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'nueva-afiliacion' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('nueva-afiliacion'); setMenuAbierto(false); }}
          >
            <span>Nueva Afiliación</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'usuarios' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('usuarios'); setMenuAbierto(false); }}
          >
            <span>Crear Usuario EPS</span>
          </button>

          <div style={{ margin: '0.75rem 0 0.25rem 0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>Maestros y Catálogos</div>
          
          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'generos' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('generos'); setMenuAbierto(false); }}
          >
            <span>Gestión de Géneros</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'parentescos' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('parentescos'); setMenuAbierto(false); }}
          >
            <span>Gestión de Parentescos</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'eps' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('eps'); setMenuAbierto(false); }}
          >
            <span>Gestión de EPS</span>
          </button>

          <button
            type="button"
            className={`adm-menu__opcion ${seccionActiva === 'geografia' ? 'adm-menu__opcion--activa' : ''}`}
            onClick={() => { setSeccionActiva('geografia'); setMenuAbierto(false); }}
          >
            <span>Gestión Geográfica</span>
          </button>
        </nav>
      </aside>

      <main className="adm-contenido">
        <header className="adm-encabezado">
          <div>
            <h2>Panel de Gestión - Perfil Afiliaciones</h2>
            <p>Administración modular de solicitudes, padrón de usuarios y maestros independientes en Tecnosalud.</p>
          </div>
        </header>

        {/* 1. SOLICITUDES */}
        {seccionActiva === 'solicitudes' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Bandeja de Solicitudes Pendientes (Base de Datos)</h3>
                <button type="button" className="adm-btn" onClick={cargarSolicitudesPendientes} disabled={cargandoSolicitudes}>
                  {cargandoSolicitudes ? 'Actualizando...' : 'Actualizar Lista'}
                </button>
              </div>

              {mensajeSolicitudes && <p className="adm-error">{mensajeSolicitudes}</p>}

              <div className="adm-tabla-contenedor">
                <table className="adm-tabla">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Nombres y Apellidos</th>
                      <th>Correo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map((sol) => (
                      <tr key={sol.id}>
                        <td>{sol.tipo_doc || sol.tipoDocumento} {sol.documento}</td>
                        <td><strong>{sol.nombres} {sol.apellidos}</strong></td>
                        <td>{sol.correo}</td>
                        <td>
                          <span className="adm-insignia adm-insignia--pendiente">
                            {sol.estado}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="adm-btn adm-btn--verde"
                            onClick={() => aprobarSolicitud(sol.id)}
                          >
                            Aprobar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!cargandoSolicitudes && solicitudes.length === 0 && (
                      <tr>
                        <td colSpan="5" className="adm-vacio" style={{ textAlign: 'center', padding: '1.5rem' }}>
                          No hay solicitudes pendientes en la base de datos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* 2. NUEVA AFILIACIÓN */}
        {seccionActiva === 'nueva-afiliacion' && (
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
                        <small style={{ color: '#0369a1', fontWeight: 'normal', marginTop: '0.2rem' }}>Régimen Contributivo asignado automáticamente a Tecnosalud EPS.</small>
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
                          {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select name="nacimientoMes" value={formAfiliacion.nacimientoMes} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                          <option value="">Mes</option>
                          {MESES.map(m => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                        </select>
                        <select name="nacimientoAnio" value={formAfiliacion.nacimientoAnio} onChange={handleAfiliacionChange} className="adm-btn" style={{ width: '100%', background: '#fff' }} required>
                          <option value="">Año</option>
                          {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
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
          </section>
        )}

        {/* 3. CREAR USUARIO EPS */}
        {seccionActiva === 'usuarios' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Crear Nuevo Usuario EPS (Tecnosalud Fija)</h3>
              </div>
              <p className="adm-nota">Formulario conectado al servicio de autenticación para dar de alta registros internos con EPS fija en Tecnosalud.</p>

              {mensajeCrear.texto && (
                <div className="adm-aviso" style={{ marginBottom: '1rem', background: mensajeCrear.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeCrear.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>
                  {mensajeCrear.texto}
                </div>
              )}

              <form onSubmit={handleCrearUsuarioSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Tipo de Documento
                    <select name="tipo_doc" value={formUsuario.tipo_doc} onChange={handleCrearUsuarioChange} className="adm-btn" style={{ width: '100%', background: '#fff' }}>
                      <option value="CC">Cédula de Ciudadanía (CC)</option>
                      <option value="TI">Tarjeta de Identidad (TI)</option>
                      <option value="CE">Cédula de Extranjería (CE)</option>
                      <option value="PA">Pasaporte (PA)</option>
                    </select>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Número de Documento
                    <input type="text" name="documento" value={formUsuario.documento} onChange={handleCrearUsuarioChange} placeholder="Ej: 10203040" required className="adm-buscador" style={{ width: '100%' }} />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Nombre Completo
                    <input type="text" name="nombre" value={formUsuario.nombre} onChange={handleCrearUsuarioChange} placeholder="Nombres y Apellidos" required className="adm-buscador" style={{ width: '100%' }} />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
                    Correo Electrónico
                    <input type="email" name="email" value={formUsuario.email} onChange={handleCrearUsuarioChange} placeholder="correo@ucatolica.edu.co" required className="adm-buscador" style={{ width: '100%' }} />
                  </label>
                </div>

                <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start', marginTop: '0.5rem' }} disabled={cargandoCrear}>
                  {cargandoCrear ? 'Registrando usuario...' : 'Crear Usuario y Enviar Activación'}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* 4. MAESTRO: GÉNEROS (Endpoint /generos dedicado) */}
        {seccionActiva === 'generos' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Gestión de Géneros</h3>
                <button type="button" className="adm-btn" onClick={cargarGeneros} disabled={cargandoGeneros}>Actualizar</button>
              </div>
              {mensajeCat.texto && <div className="adm-aviso" style={{ marginTop: '1rem', background: mensajeCat.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeCat.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>{mensajeCat.texto}</div>}
              <form onSubmit={handleCrearGenero} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)', marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nuevo Género</h4>
                <input type="text" placeholder="Nombre del género" value={nombreGenero} onChange={(e) => setNombreGenero(e.target.value)} required className="adm-buscador" />
                <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start' }}>Crear Género</button>
              </form>
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>Géneros Registrados ({generos.length})</h4>
                <ul style={{ listStyle: 'none', padding: 0, maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
                  {generos.map((g, idx) => <li key={idx} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{g.nombre}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 5. MAESTRO: PARENTESCOS (Endpoint /parentescos dedicado) */}
        {seccionActiva === 'parentescos' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Gestión de Parentescos</h3>
                <button type="button" className="adm-btn" onClick={cargarParentescos} disabled={cargandoParentescos}>Actualizar</button>
              </div>
              {mensajeCat.texto && <div className="adm-aviso" style={{ marginTop: '1rem', background: mensajeCat.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeCat.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>{mensajeCat.texto}</div>}
              <form onSubmit={handleCrearParentesco} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)', marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nuevo Parentesco</h4>
                <input type="text" placeholder="Nombre del parentesco" value={nombreParentesco} onChange={(e) => setNombreParentesco(e.target.value)} required className="adm-buscador" />
                <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start' }}>Crear Parentesco</button>
              </form>
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>Parentescos Registrados ({parentescos.length})</h4>
                <ul style={{ listStyle: 'none', padding: 0, maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
                  {parentescos.map((p, idx) => <li key={idx} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{p.nombre}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 6. MAESTRO: EPS (Endpoint /eps dedicado) */}
        {seccionActiva === 'eps' && (
          <section className="adm-seccion">
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Gestión de Entidades Promotoras de Salud (EPS)</h3>
                <button type="button" className="adm-btn" onClick={cargarEps} disabled={cargandoEps}>Actualizar</button>
              </div>
              {mensajeCat.texto && <div className="adm-aviso" style={{ marginTop: '1rem', background: mensajeCat.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeCat.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>{mensajeCat.texto}</div>}
              <form onSubmit={handleCrearEps} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)', marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nueva EPS</h4>
                <input type="text" placeholder="Nombre de la EPS" value={nombreEps} onChange={(e) => setNombreEps(e.target.value)} required className="adm-buscador" />
                <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start' }}>Crear EPS</button>
              </form>
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>EPS Activas en el Sistema ({listaEps.length})</h4>
                <ul style={{ listStyle: 'none', padding: 0, maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
                  {listaEps.map((e, idx) => <li key={idx} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{e.nombre}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 7. MAESTRO: GESTIÓN GEOGRÁFICA (Departamentos y Municipios) */}
        {seccionActiva === 'geografia' && (
          <section className="adm-seccion" style={{ display: 'grid', gap: '1.5rem' }}>
            <div className="adm-tarjeta">
              <div className="adm-tarjeta__encabezado">
                <h3>Gestión Geográfica (Departamentos y Ciudades)</h3>
                <button type="button" className="adm-btn" onClick={cargarCatalogosGeograficos} disabled={cargandoGeo}>Actualizar Listas</button>
              </div>
              {mensajeGeo.texto && <div className="adm-aviso" style={{ marginTop: '1rem', background: mensajeGeo.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeGeo.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>{mensajeGeo.texto}</div>}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                <form onSubmit={handleCrearDepartamento} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nuevo Departamento</h4>
                  <input type="text" placeholder="Nombre del departamento" value={nombreDepartamento} onChange={(e) => setNombreDepartamento(e.target.value)} required className="adm-buscador" />
                  <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start' }}>Crear Departamento</button>
                </form>

                <form onSubmit={handleCrearMunicipio} style={{ display: 'grid', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--adm-borde)' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--adm-azul)' }}>Nueva Ciudad / Municipio</h4>
                  <select value={departamentoSeleccionado} onChange={(e) => setDepartamentoSeleccionado(e.target.value)} required className="adm-btn" style={{ background: '#fff' }}>
                    <option value="">Selecciona departamento...</option>
                    {departamentos.map((dep, idx) => (<option key={idx} value={dep.codigo || dep.id || dep.nombre}>{dep.nombre || dep}</option>))}
                  </select>
                  <input type="text" placeholder="Nombre de la ciudad" value={nombreMunicipio} onChange={(e) => setNombreMunicipio(e.target.value)} required className="adm-buscador" />
                  <button type="submit" className="adm-btn adm-btn--verde" style={{ justifySelf: 'start' }}>Crear Ciudad</button>
                </form>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div>
                  <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>Departamentos Habilitados ({departamentos.length})</h4>
                  <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
                    {departamentos.map((dep, idx) => <li key={idx} style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{dep.nombre || dep}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 style={{ color: 'var(--adm-azul)', marginBottom: '0.5rem' }}>Ciudades / Municipios ({municipios.length})</h4>
                  <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--adm-borde)', borderRadius: '8px' }}>
                    {municipios.map((mun, idx) => <li key={idx} style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>{mun.nombre || mun}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

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
    </div>
  );
}

export default PanelAfiliaciones;