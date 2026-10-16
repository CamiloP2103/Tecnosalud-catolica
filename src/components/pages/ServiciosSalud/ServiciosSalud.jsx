import { useState } from 'react';
import CitasMedicas from './CitasMedicas';
import './ServiciosSalud.css';

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
  const [seccionActiva, setSeccionActiva] = useState('citas');

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

      <nav className="salud-nav" aria-label="Menú de servicios de salud">
        <button
          type="button"
          className={`salud-nav__btn ${seccionActiva === 'citas' ? 'salud-nav__btn--active' : ''}`}
          onClick={() => { setSeccionActiva('citas'); setMensajeAlerta({ tipo: '', texto: '' }); }}
        >
          Citas médicas
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

      {seccionActiva === 'citas' && <CitasMedicas />}

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