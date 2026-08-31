import { useState } from 'react';
import './ServiciosSalud.css';

// 1. Datos iniciales simulados para citas
const CITAS_INICIALES = [
  {
    id: 1,
    especialidad: 'Medicina General',
    medico: 'Dr. Alejandro Morales',
    fecha: '2026-09-10',
    hora: '08:30 AM',
    sede: 'Sede Principal - Bogotá',
    estado: 'Confirmada'
  },
  {
    id: 2,
    especialidad: 'Cardiología',
    medico: 'Dra. Sandra Martínez',
    fecha: '2026-09-18',
    hora: '10:00 AM',
    sede: 'Sede Norte - Bogotá',
    estado: 'Confirmada'
  }
];

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

const ESPECIALIDADES = [
  'Medicina General',
  'Cardiología',
  'Dermatología',
  'Ortopedia y Traumatología',
  'Pediatría',
  'Oftalmología',
  'Radiología e Imágenes'
];

const SEDES = [
  'Sede Principal - Chapinero',
  'Sede Norte - Calle 127',
  'Sede Occidente - Salitre',
  'Sede Sur - Restrepo'
];

function ServiciosSalud() {
  const [seccionActiva, setSeccionActiva] = useState('agendar'); // 'agendar' | 'consultar' | 'imagenes'

  // Estados para Citas
  const [citas, setCitas] = useState(CITAS_INICIALES);
  const [formCita, setFormCita] = useState({
    especialidad: '',
    medico: '',
    fecha: '',
    hora: '',
    sede: '',
  });

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

  // Estados para alertas y notificaciones
  const [mensajeAlerta, setMensajeAlerta] = useState({ tipo: '', texto: '' });

  // Manejador formulario de citas
  const handleCitaChange = (e) => {
    const { name, value } = e.target;
    setFormCita((prev) => ({ ...prev, [name]: value }));
  };

  const handleAgendarCita = (e) => {
    e.preventDefault();
    if (!formCita.especialidad || !formCita.fecha || !formCita.hora || !formCita.sede) {
      setMensajeAlerta({ tipo: 'error', texto: 'Por favor completa todos los datos de la cita médica.' });
      return;
    }

    const nuevaCita = {
      id: Date.now(),
      ...formCita,
      medico: formCita.medico || 'Médico Asignado en Turno',
      estado: 'Confirmada'
    };

    setCitas([nuevaCita, ...citas]);
    setFormCita({ especialidad: '', medico: '', fecha: '', hora: '', sede: '' });
    setMensajeAlerta({ tipo: 'exito', texto: '¡Cita médica programada exitosamente!' });
    setSeccionActiva('consultar');
  };

  const handleCancelarCita = (id) => {
    if (window.confirm('¿Estás seguro de cancelar esta cita médica?')) {
      setCitas(citas.filter((c) => c.id !== id));
      setMensajeAlerta({ tipo: 'exito', texto: 'Cita cancelada correctamente.' });
    }
  };

  // Manejador carga de archivos simulados
  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivoSeleccionado(file);
      // Generar URL temporal de vista previa en memoria
      const localUrl = URL.createObjectURL(file);
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

      {/* MENÚ DE NAVEGACIÓN PRINCIPAL DE SERVICIOS */}
      <nav className="salud-nav" aria-label="Menú de servicios de salud">
        <button
          type="button"
          className={`salud-nav__btn ${seccionActiva === 'agendar' ? 'salud-nav__btn--active' : ''}`}
          onClick={() => { setSeccionActiva('agendar'); setMensajeAlerta({ tipo: '', texto: '' }); }}
        >
          📅 Agendar Cita
        </button>

        <button
          type="button"
          className={`salud-nav__btn ${seccionActiva === 'consultar' ? 'salud-nav__btn--active' : ''}`}
          onClick={() => { setSeccionActiva('consultar'); setMensajeAlerta({ tipo: '', texto: '' }); }}
        >
          📋 Consultar Citas ({citas.length})
        </button>

        <button
          type="button"
          className={`salud-nav__btn ${seccionActiva === 'imagenes' ? 'salud-nav__btn--active' : ''}`}
          onClick={() => { setSeccionActiva('imagenes'); setMensajeAlerta({ tipo: '', texto: '' }); }}
        >
          🩻 Imágenes Diagnósticas ({imagenes.length})
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
          <p>Selecciona la especialidad, la fecha deseada y la sede de atención.</p>

          <form onSubmit={handleAgendarCita} className="salud-form">
            <div className="salud-grid">
              <label>
                Especialidad Médica *
                <select name="especialidad" value={formCita.especialidad} onChange={handleCitaChange} required>
                  <option value="">Selecciona especialidad...</option>
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </label>

              <label>
                Sede de Atención *
                <select name="sede" value={formCita.sede} onChange={handleCitaChange} required>
                  <option value="">Selecciona la sede...</option>
                  {SEDES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <label>
                Fecha de la cita *
                <input
                  type="date"
                  name="fecha"
                  value={formCita.fecha}
                  onChange={handleCitaChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </label>

              <label>
                Horario disponible *
                <select name="hora" value={formCita.hora} onChange={handleCitaChange} required>
                  <option value="">Selecciona horario...</option>
                  <option value="07:00 AM">07:00 AM</option>
                  <option value="08:30 AM">08:30 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="03:30 PM">03:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </select>
              </label>

              <label className="salud-col-full">
                Profesional de preferencia (Opcional)
                <input
                  type="text"
                  name="medico"
                  value={formCita.medico}
                  onChange={handleCitaChange}
                  placeholder="Ej. Dr. Andrés Restrepo (o dejar en blanco)"
                />
              </label>
            </div>

            <button type="submit" className="salud-btn-primary">Confirmar Agendamiento</button>
          </form>
        </div>
      )}

      {/* 2. SECCIÓN: CONSULTAR CITAS */}
      {seccionActiva === 'consultar' && (
        <div className="salud-card">
          <h3>Tus Citas Médicas Programadas</h3>
          <p>Revisa el estado de tus citas activas o cancela aquellas que no puedas atender.</p>

          {citas.length === 0 ? (
            <div className="salud-vacio">
              <p>No tienes citas médicas activas en este momento.</p>
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
                      <td>{c.fecha} - <span className="badge-hora">{c.hora}</span></td>
                      <td>{c.sede}</td>
                      <td><span className="badge-estado">{c.estado}</span></td>
                      <td>
                        <button
                          type="button"
                          className="salud-btn-danger"
                          onClick={() => handleCancelarCita(c.id)}
                        >
                          Cancelar
                        </button>
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
                  <span className="salud-card-item__zoom">🔍 Ver en detalle</span>
                </div>
                <div className="salud-card-item__info">
                  <h4>{img.tipo}</h4>
                  <p><strong>Fecha:</strong> {img.fecha}</p>
                  <p><strong>Médico:</strong> {img.medico}</p>
                  <p className="salud-card-item__informe"><em>"{img.informe}"</em></p>
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
              <button type="button" className="modal-close-btn" onClick={() => setImagenModal(null)}>✖</button>
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