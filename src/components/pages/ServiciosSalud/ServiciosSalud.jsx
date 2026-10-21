import { useCallback, useEffect, useRef, useState } from 'react';
import './ServiciosSalud.css';
import { llamarServicio, mensajeDeError, SERVICIO_CITAS } from '../../../utils/servicios';

// URL del Microservicio de Citas
const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3007/api/citas';

const ETIQUETAS_ESTADO_CITA = {
  PROGRAMADA: 'Programada',
  ATENDIDA: 'Atendida',
  NO_ASISTIO: 'No asistió',
  CANCELADA: 'Cancelada',
};

function encabezadosSesion() {
  const token = localStorage.getItem('tecnosalud_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

// "2026-10-19" -> "lunes 19 de octubre"
const fechaLegible = (fecha) =>
  new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

// "13:30" -> "1:30 p. m."
const horaLegible = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
};

// 2. Datos iniciales simulados para imágenes diagnósticas
const IMAGENES_INICIALES = [
  {
    id: 1,
    tipo: 'Radiografía de Tórax AP',
    fecha: '2026-08-15',
    medico: 'Dr. Roberto Silva',
    archivoNombre: 'rx_torax_082026.png',
    url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
    informe: 'Estructuras óseas y parénquima pulmonar sin alteraciones pleuropulmonares agudas.'
  },
  {
    id: 2,
    tipo: 'Resonancia Magnética de Rodilla',
    fecha: '2026-07-22',
    medico: 'Dra. Claudia Rincón',
    archivoNombre: 'rm_rodilla_izq.png',
    url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
    informe: 'Integridad ligamentaria conservada. Leve edema periarticular sin roturas meniscales.'
  }
];

function ServiciosSalud() {
  const [seccionActiva, setSeccionActiva] = useState('agendar'); // 'agendar' | 'consultar' | 'imagenes'

  // Estados para Citas (citas-service)
  const [especialidades, setEspecialidades] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [filtroCita, setFiltroCita] = useState({ especialidadId: '', sedeId: '' });
  const [franjas, setFranjas] = useState([]);
  const [franjaElegida, setFranjaElegida] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [cargandoFranjas, setCargandoFranjas] = useState(false);
  const [citas, setCitas] = useState([]);
  const [cargandoCitas, setCargandoCitas] = useState(false);
  const [enviandoCita, setEnviandoCita] = useState(false);

  // Estados para Imágenes Diagnósticas
  const [imagenes, setImagenes] = useState(IMAGENES_INICIALES);
  const [formImagen, setFormImagen] = useState({
    tipo: '',
    fecha: '',
    medico: '',
    informe: '',
  });
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imagenModal, setImagenModal] = useState(null);

  // URLs temporales (blob:) creadas para las vistas previas; se liberan al salir de la página
  const urlsTemporales = useRef(new Set());
  useEffect(() => {
    const urls = urlsTemporales.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Estados para alertas y notificaciones
  const [mensajeAlerta, setMensajeAlerta] = useState({ tipo: '', texto: '' });

  // Especialidades y sedes reales al abrir la página
  useEffect(() => {
    (async () => {
      try {
        const [e, s] = await Promise.all([
          llamarServicio(`${API_CITAS}/especialidades`, {}, SERVICIO_CITAS),
          llamarServicio(`${API_CITAS}/sedes`, {}, SERVICIO_CITAS),
        ]);
        if (e.ok) setEspecialidades(e.datos.especialidades);
        if (s.ok) setSedes(s.datos.sedes);
      } catch (error) {
        setMensajeAlerta({ tipo: 'error', texto: mensajeDeError(error, SERVICIO_CITAS) });
      }
    })();
  }, []);

  // Franjas libres de los próximos 7 días para la especialidad y sede elegidas
  useEffect(() => {
    setFranjaElegida(null);
    if (!filtroCita.especialidadId) {
      setFranjas([]);
      return;
    }
    (async () => {
      setCargandoFranjas(true);
      try {
        const parametros = new URLSearchParams({ especialidadId: filtroCita.especialidadId, dias: '7' });
        if (filtroCita.sedeId) parametros.set('sedeId', filtroCita.sedeId);
        const { ok, datos } = await llamarServicio(`${API_CITAS}/disponibilidad?${parametros}`, {}, SERVICIO_CITAS);
        if (!ok) throw new Error(datos.error);
        setFranjas(datos.franjas);
      } catch (error) {
        setFranjas([]);
        setMensajeAlerta({ tipo: 'error', texto: error.message || mensajeDeError(error, SERVICIO_CITAS) });
      } finally {
        setCargandoFranjas(false);
      }
    })();
  }, [filtroCita]);

  const cargarCitas = useCallback(async () => {
    setCargandoCitas(true);
    try {
      const { ok, datos } = await llamarServicio(`${API_CITAS}/citas`, { headers: encabezadosSesion() }, SERVICIO_CITAS);
      if (!ok) throw new Error(datos.error);
      setCitas(datos.citas);
    } catch (error) {
      setMensajeAlerta({ tipo: 'error', texto: error.message || mensajeDeError(error, SERVICIO_CITAS) });
    } finally {
      setCargandoCitas(false);
    }
  }, []);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  const citasProgramadas = citas.filter((c) => c.estado === 'PROGRAMADA');

  // Franjas agrupadas por día para mostrarlas como agenda
  const franjasPorDia = franjas.reduce((dias, f) => {
    (dias[f.fecha] = dias[f.fecha] || []).push(f);
    return dias;
  }, {});

  const handleAgendarCita = async (e) => {
    e.preventDefault();
    if (!franjaElegida) {
      setMensajeAlerta({ tipo: 'error', texto: 'Elige la especialidad y luego un horario disponible.' });
      return;
    }
    setEnviandoCita(true);
    try {
      const { ok, datos } = await llamarServicio(`${API_CITAS}/citas`, {
        method: 'POST',
        headers: encabezadosSesion(),
        body: JSON.stringify({ medicoId: franjaElegida.medico.id, fecha: franjaElegida.fecha, hora: franjaElegida.hora, motivo }),
      }, SERVICIO_CITAS);
      if (!ok) {
        setMensajeAlerta({ tipo: 'error', texto: datos.error || 'No se pudo reservar la cita.' });
        // El horario pudo ser tomado por otra persona: se recarga la disponibilidad
        setFiltroCita((f) => ({ ...f }));
        return;
      }
      setMotivo('');
      setFiltroCita({ especialidadId: '', sedeId: '' });
      await cargarCitas();
      setMensajeAlerta({
        tipo: 'exito',
        texto: `Cita programada: ${datos.especialidad} con ${datos.medico}, ${fechaLegible(datos.fecha)} a las ${horaLegible(datos.hora)} en ${datos.sede}. Te enviamos la confirmación por correo.`,
      });
      setSeccionActiva('consultar');
    } catch (error) {
      setMensajeAlerta({ tipo: 'error', texto: mensajeDeError(error, SERVICIO_CITAS) });
    } finally {
      setEnviandoCita(false);
    }
  };

  const handleCancelarCita = async (id) => {
    if (!window.confirm('¿Estás seguro de cancelar esta cita médica?')) return;
    try {
      const { ok, datos } = await llamarServicio(`${API_CITAS}/citas/${id}/cancelar`, { method: 'PATCH', headers: encabezadosSesion() }, SERVICIO_CITAS);
      if (!ok) {
        setMensajeAlerta({ tipo: 'error', texto: datos.error || 'No se pudo cancelar la cita.' });
        return;
      }
      await cargarCitas();
      setMensajeAlerta({ tipo: 'exito', texto: 'Cita cancelada. El horario quedó libre para otros pacientes.' });
    } catch (error) {
      setMensajeAlerta({ tipo: 'error', texto: mensajeDeError(error, SERVICIO_CITAS) });
    }
  };

  // Manejador carga de archivos simulados
  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivoSeleccionado(file);
      // Liberar la vista previa anterior si el usuario cambió de archivo sin guardarla
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        urlsTemporales.current.delete(previewUrl);
      }
      // Generar URL temporal de vista previa en memoria
      const localUrl = URL.createObjectURL(file);
      urlsTemporales.current.add(localUrl);
      setPreviewUrl(localUrl);
    }
  };

  const handleCargarImagen = (e) => {
    e.preventDefault();
    if (!formImagen.tipo || !formImagen.fecha || !archivoSeleccionado) {
      setMensajeAlerta({ tipo: 'error', texto: 'Por favor adjunta el archivo e ingresa los campos requeridos.' });
      return;
    }

    const nuevoEstudio = {
      id: Date.now(),
      tipo: formImagen.tipo,
      fecha: formImagen.fecha,
      medico: formImagen.medico || 'Especialista Radiólogo',
      informe: formImagen.informe || 'Estudio adjuntado por el usuario.',
      archivoNombre: archivoSeleccionado.name,
      url: previewUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80'
    };

    setImagenes([nuevoEstudio, ...imagenes]);
    setFormImagen({ tipo: '', fecha: '', medico: '', informe: '' });
    setArchivoSeleccionado(null);
    setPreviewUrl('');
    setMensajeAlerta({ tipo: 'exito', texto: '¡Estudio de imagenología guardado exitosamente!' });
  };

  return (
    <section className="salud-panel">
      <div className="salud-panel__header">
        <h2>Portal Clínico Tecnosalud</h2>
        <p>Gestiona tus citas médicas y consulta tus estudios diagnósticos en línea.</p>
      </div>

      <nav className="salud-nav" aria-label="Menú de servicios de salud">
        <button
          type="button"
          className={`salud-nav__btn ${seccionActiva === 'citas' ? 'salud-nav__btn--active' : ''}`}
          onClick={() => { setSeccionActiva('citas'); setMensajeAlerta({ tipo: '', texto: '' }); }}
        >
          CC Consultar Citas ({citasProgramadas.length})
        </button>

        <button
          type="button"
          className={`salud-nav__btn ${seccionActiva === 'imagenes' ? 'salud-nav__btn--active' : ''}`}
          onClick={() => { setSeccionActiva('imagenes'); setMensajeAlerta({ tipo: '', texto: '' }); }}
        >
          ID Imágenes Diagnósticas ({imagenes.length})
        </button>
      </nav>

      {/* BANNERS DE ALERTA */}
      {mensajeAlerta.texto && (
        <div className={`salud-alert salud-alert--${mensajeAlerta.tipo}`} role="alert">
          {mensajeAlerta.texto}
        </div>
      )}

      {/* 1. SECCIÓN: AGENDAR CITA */}
      {seccionActiva === 'agendar' && (
        <div className="salud-card">
          <h3>Agendamiento de Nueva Cita Médica</h3>
          <p>Elige la especialidad y, si quieres, la sede. Te mostramos los horarios libres de los próximos 7 días.</p>

          <form onSubmit={handleAgendarCita} className="salud-form">
            <div className="salud-grid">
              <label>
                Especialidad Médica *
                <select
                  value={filtroCita.especialidadId}
                  onChange={(e) => setFiltroCita((f) => ({ ...f, especialidadId: e.target.value }))}
                  required
                >
                  <option value="">Selecciona especialidad...</option>
                  {especialidades.map((esp) => (
                    <option key={esp.id} value={esp.id}>{esp.nombre} ({esp.medicos} {esp.medicos === 1 ? 'médico' : 'médicos'})</option>
                  ))}
                </select>
              </label>

              <label>
                Sede de Atención
                <select value={filtroCita.sedeId} onChange={(e) => setFiltroCita((f) => ({ ...f, sedeId: e.target.value }))}>
                  <option value="">Todas las sedes</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </label>
            </div>

            {filtroCita.especialidadId && (
              <div className="salud-agenda" aria-live="polite">
                {cargandoFranjas && <p className="salud-agenda__vacio">Buscando horarios disponibles...</p>}
                {!cargandoFranjas && franjas.length === 0 && (
                  <p className="salud-agenda__vacio">No hay horarios libres en los próximos 7 días para esta selección. Prueba otra sede.</p>
                )}
                {!cargandoFranjas && Object.entries(franjasPorDia).map(([fecha, lista]) => (
                  <div key={fecha} className="salud-agenda__dia">
                    <h4>{fechaLegible(fecha)}</h4>
                    <div className="salud-agenda__franjas">
                      {lista.map((f) => {
                        const elegida = franjaElegida && franjaElegida.fecha === f.fecha && franjaElegida.hora === f.hora && franjaElegida.medico.id === f.medico.id;
                        return (
                          <button
                            key={`${f.medico.id}-${f.hora}`}
                            type="button"
                            className={`salud-franja ${elegida ? 'salud-franja--elegida' : ''}`}
                            aria-pressed={Boolean(elegida)}
                            onClick={() => setFranjaElegida(f)}
                            title={`${f.medico.nombre} · ${f.sede.nombre}`}
                          >
                            <strong>{horaLegible(f.hora)}</strong>
                            <span>{f.medico.nombre}</span>
                            <span>{f.sede.nombre}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {franjaElegida && (
              <div className="salud-resumen-cita">
                <p>
                  <strong>Tu cita:</strong> {franjaElegida.especialidad} con {franjaElegida.medico.nombre},{' '}
                  {fechaLegible(franjaElegida.fecha)} a las {horaLegible(franjaElegida.hora)} en {franjaElegida.sede.nombre}.
                </p>
                <label className="salud-col-full">
                  Motivo de la consulta (opcional)
                  <input
                    type="text"
                    maxLength={300}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Control de presión arterial"
                  />
                </label>
              </div>
            )}

            <button type="submit" className="salud-btn-primary" disabled={!franjaElegida || enviandoCita}>
              {enviandoCita ? 'Reservando...' : 'Confirmar Agendamiento'}
            </button>
          </form>
        </div>
      )}

      {/* 2. SECCIÓN: CONSULTAR CITAS */}
      {seccionActiva === 'consultar' && (
        <div className="salud-card">
          <h3>Tus Citas Médicas</h3>
          <p>Revisa el estado de tus citas o cancela las que no puedas atender para liberar el horario.</p>

          {cargandoCitas && <p>Cargando tus citas...</p>}
          {!cargandoCitas && citas.length === 0 ? (
            <div className="salud-vacio">
              <p>No tienes citas médicas registradas.</p>
              <button type="button" className="salud-btn-link" onClick={() => setSeccionActiva('agendar')}>
                Haz clic aquí para agendar tu primera cita.
              </button>
            </div>
          ) : (
            <div className="salud-table-responsive">
              <table className="salud-table">
                <thead>
                  <tr>
                    <th>Especialidad</th>
                    <th>Profesional</th>
                    <th>Fecha y Hora</th>
                    <th>Sede</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {citas.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.especialidad}</strong></td>
                      <td>{c.medico}</td>
                      <td>{fechaLegible(c.fecha)} - <span className="badge-hora">{horaLegible(c.hora)}</span></td>
                      <td>{c.sede}</td>
                      <td><span className={`badge-estado badge-estado--${c.estado.toLowerCase()}`}>{ETIQUETAS_ESTADO_CITA[c.estado] || c.estado}</span></td>
                      <td>
                        {c.estado === 'PROGRAMADA' && (
                          <button type="button" className="salud-btn-danger" onClick={() => handleCancelarCita(c.id)}>
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. SECCIÓN: IMÁGENES DIAGNÓSTICAS */}
      {seccionActiva === 'imagenes' && (
        <div className="salud-card">
          <h3>Historial y Carga de Imágenes Diagnósticas</h3>
          <p>Visualiza tus estudios médicos radiológicos o adjunta nuevos archivos digitales (DICOM, PNG, JPG, PDF).</p>

          {/* Formulario para adjuntar archivo simulado */}
          <details className="salud-uploader-details">
            <summary className="salud-uploader-summary">+ Adjuntar nuevo estudio radiológico</summary>
            <form onSubmit={handleCargarImagen} className="salud-form salud-form--uploader">
              <div className="salud-grid">
                <label>
                  Tipo de Estudio *
                  <input
                    type="text"
                    placeholder="Ej. Resonancia Lumbar, Ecografía Renal"
                    value={formImagen.tipo}
                    onChange={(e) => setFormImagen({ ...formImagen, tipo: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Fecha del Estudio *
                  <input
                    type="date"
                    value={formImagen.fecha}
                    onChange={(e) => setFormImagen({ ...formImagen, fecha: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Especialista / Radiólogo
                  <input
                    type="text"
                    placeholder="Nombre del médico radiólogo"
                    value={formImagen.medico}
                    onChange={(e) => setFormImagen({ ...formImagen, medico: e.target.value })}
                  />
                </label>

                <label>
                  Seleccionar archivo de imagen *
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleArchivoChange}
                    required
                  />
                </label>

                <label className="salud-col-full">
                  Observaciones / Informe médico
                  <textarea
                    rows="2"
                    placeholder="Conclusiones del estudio radiológico..."
                    value={formImagen.informe}
                    onChange={(e) => setFormImagen({ ...formImagen, informe: e.target.value })}
                  />
                </label>
              </div>

              <button type="submit" className="salud-btn-primary">Guardar e Incorporar Estudio</button>
            </form>
          </details>

          {/* Galería de Estudios */}
          <div className="salud-gallery">
            {imagenes.map((img) => (
              <div key={img.id} className="salud-card-item">
                <div className="salud-card-item__preview" onClick={() => setImagenModal(img)}>
                  <img src={img.url} alt={img.tipo} />
                  <span className="salud-card-item__zoom">VD Ver en detalle</span>
                </div>
                <div className="salud-card-item__info">
                  <h4>{img.tipo}</h4>
                  <p><strong>Fecha:</strong> {img.fecha}</p>
                  <p><strong>Médico:</strong> {img.medico}</p>
                  <p className="salud-card-item__informe"><em>&ldquo;{img.informe}&rdquo;</em></p>
                  <div className="salud-card-item__actions">
                    <button type="button" className="salud-btn-secondary" onClick={() => setImagenModal(img)}>
                      Visualizar
                    </button>
                    <a href={img.url} download={img.archivoNombre} target="_blank" rel="noreferrer" className="salud-btn-outline">
                      Descargar
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL VISUALIZADOR DE IMAGEN DIAGNÓSTICA */}
      {imagenModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content modal-content--wide">
            <div className="modal-header-flex">
              <h3>{imagenModal.tipo}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setImagenModal(null)}>X</button>
            </div>
            
            <div className="modal-visor-body">
              <div className="modal-visor-img-container">
                <img src={imagenModal.url} alt={imagenModal.tipo} className="modal-visor-img" />
              </div>
              <div className="modal-visor-details">
                <p><strong>Fecha del estudio:</strong> {imagenModal.fecha}</p>
                <p><strong>Especialista:</strong> {imagenModal.medico}</p>
                <p><strong>Archivo:</strong> <code>{imagenModal.archivoNombre}</code></p>
                <hr />
                <p><strong>Informe Radiológico:</strong></p>
                <div className="modal-visor-report">
                  {imagenModal.informe}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="modal-btn-confirm" onClick={() => setImagenModal(null)}>
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
export default ServiciosSalud;