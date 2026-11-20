import { useState } from 'react';

const API_DOCUMENTOS = import.meta.env.VITE_API_DOCUMENTOS_URL || 'http://localhost:3006/api/documentos';

const TIPOS_SUGERIDOS = [
  'Examen de laboratorio',
  'Radiografía / Imagen diagnóstica',
  'Examen externo',
  'Ecografía / Resonancia',
  'Otro documento clínico',
];

const estiloCampo = {
  width: '100%',
  height: '42px',
  padding: '0 0.75rem',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box',
  fontSize: '0.95rem',
  backgroundColor: '#fff',
};

function DocumentosExternosMedico() {
  // Estado del bloque 1 (Consulta)
  const [documentoConsulta, setDocumentoConsulta] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [consultadoDoc, setConsultadoDoc] = useState('');
  const [cargandoLista, setCargandoLista] = useState(false);
  const [descargandoId, setDescargandoId] = useState(null);

  // Estado del bloque 2 (Carga)
  const [documentoCarga, setDocumentoCarga] = useState('');
  const [tipoExamen, setTipoExamen] = useState(TIPOS_SUGERIDOS[0]);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const obtenerToken = () => localStorage.getItem('tecnosalud_token') || '';

  const obtenerDocMedico = () => {
    try {
      const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
      return sesion?.documento || '';
    } catch {
      return '';
    }
  };

  const consultarDocumentos = async (docObjetivo, limpiarMensaje = true) => {
    const docLimpio = String(docObjetivo ?? documentoConsulta).trim();
    if (!docLimpio) {
      setMensaje({ tipo: 'error', texto: 'Ingresa el número de documento del paciente para consultar.' });
      return;
    }

    setCargandoLista(true);
    if (limpiarMensaje) {
      setMensaje({ tipo: '', texto: '' });
    }
    try {
      const res = await fetch(
        `${API_DOCUMENTOS}?documentoPaciente=${encodeURIComponent(docLimpio)}`,
        {
          headers: { Authorization: `Bearer ${obtenerToken()}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudieron consultar los documentos.' });
        setDocumentos([]);
        return;
      }
      setDocumentos(data.documentos || []);
      setConsultadoDoc(docLimpio);
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión con el servicio de documentos.' });
    } finally {
      setCargandoLista(false);
    }
  };

  const handleSubirDocumento = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    const docLimpio = documentoCarga.trim();
    const tituloFinal = titulo.trim() || tipoExamen;

    if (!docLimpio) {
      setMensaje({ tipo: 'error', texto: 'Ingresa la identificación del paciente en el formulario de carga.' });
      return;
    }
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un archivo PDF, PNG o JPG.' });
      return;
    }

    const formData = new FormData();
    formData.append('documentoPaciente', docLimpio);
    formData.append('tipoDocumento', tipoExamen);
    formData.append('titulo', tituloFinal.slice(0, 150));
    formData.append('descripcion', descripcion.trim().slice(0, 500));
    formData.append('archivo', archivo);

    setSubiendo(true);
    try {
      const res = await fetch(API_DOCUMENTOS, {
        method: 'POST',
        headers: { Authorization: `Bearer ${obtenerToken()}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo cargar el documento.' });
        return;
      }

      setMensaje({
        tipo: 'exito',
        texto: `Documento "${data.documento?.titulo || tituloFinal}" cargado correctamente para el paciente ${docLimpio}.`,
      });
      setTitulo('');
      setDescripcion('');
      setArchivo(null);
      e.target.reset();

      // Si el paciente consultado en el punto 1 es el mismo, refresca la lista automáticamente
      if (consultadoDoc === docLimpio) {
        await consultarDocumentos(docLimpio, false);
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al subir el documento.' });
    } finally {
      setSubiendo(false);
    }
  };

  const handleDescargar = async (docItem) => {
    const docMedico = obtenerDocMedico();
    if (!docMedico) {
      setMensaje({ tipo: 'error', texto: 'No se encontró la identificación del médico en la sesión.' });
      return;
    }

    setDescargandoId(docItem.id);
    setMensaje({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_DOCUMENTOS}/${docItem.id}/descargar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${obtenerToken()}`,
        },
        body: JSON.stringify({ documentoAcceso: docMedico }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: 'error', texto: data.error || 'No se pudo descargar el archivo.' });
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = docItem.nombreOriginal || `${docItem.titulo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión al descargar el documento.' });
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <h2>Documentos y Exámenes Externos</h2>
      <p style={{ color: '#475569', marginBottom: '1.25rem' }}>
        Consulta los archivos existentes de un paciente o carga nuevos resultados de laboratorio, radiografías y exámenes externos.
      </p>

      {mensaje.texto && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            backgroundColor: mensaje.tipo === 'exito' ? '#ecfdf5' : '#fef2f2',
            color: mensaje.tipo === 'exito' ? '#065f46' : '#991b1b',
            border: `1px solid ${mensaje.tipo === 'exito' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Bloque 1: Consulta y resultados en el mismo contenedor */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ marginTop: 0 }}>1. Consultar documentos del paciente</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={documentoConsulta}
            onChange={(e) => setDocumentoConsulta(e.target.value)}
            placeholder="Número de documento del paciente (ej. 72000607)"
            style={{ ...estiloCampo, flex: '1 1 260px', width: 'auto' }}
          />
          <button
            type="button"
            onClick={() => consultarDocumentos()}
            disabled={cargandoLista}
            style={{
              backgroundColor: '#145da0',
              color: '#fff',
              border: 'none',
              height: '42px',
              padding: '0 1.25rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {cargandoLista ? 'Consultando...' : 'Consultar documentos'}
          </button>
        </div>

        {consultadoDoc && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#0f172a' }}>
              Documentos del paciente {consultadoDoc} ({documentos.length})
            </h4>
            {documentos.length === 0 ? (
              <p style={{ color: '#64748b', margin: 0 }}>No hay documentos registrados para este paciente.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {documentos.map((doc) => (
                  <li
                    key={doc.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.85rem 1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong>{doc.titulo}</strong>
                        {doc.tipoDocumento && (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              backgroundColor: '#eff6ff',
                              color: '#145da0',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '999px',
                              fontWeight: 600,
                            }}
                          >
                            {doc.tipoDocumento}
                          </span>
                        )}
                      </div>
                      {doc.descripcion && <div style={{ fontSize: '0.9rem', color: '#475569' }}>{doc.descripcion}</div>}
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {doc.nombreOriginal} · {new Date(doc.creadoEn).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDescargar(doc)}
                      disabled={descargandoId === doc.id}
                      style={{
                        backgroundColor: '#0f766e',
                        color: '#fff',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {descargandoId === doc.id ? 'Descargando...' : 'Descargar'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Bloque 2: Formulario de carga con su propio campo de documento */}
      <form
        onSubmit={handleSubirDocumento}
        style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}
      >
        <h3 style={{ marginTop: 0 }}>2. Cargar documento clínico</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 0, marginBottom: '1rem' }}>
          Formatos permitidos: PDF, PNG o JPG. Tamaño máximo: 10 MB.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '1rem 1.25rem',
            alignItems: 'end',
            marginBottom: '1.25rem',
          }}
        >
          <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600 }}>
            <span>Número de documento del paciente *</span>
            <input
              type="text"
              value={documentoCarga}
              onChange={(e) => setDocumentoCarga(e.target.value)}
              placeholder="Ej: 72000607"
              required
              style={estiloCampo}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600 }}>
            <span>Tipo de documento *</span>
            <select
              value={tipoExamen}
              onChange={(e) => setTipoExamen(e.target.value)}
              style={estiloCampo}
            >
              {TIPOS_SUGERIDOS.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600 }}>
            <span>Título del documento *</span>
            <input
              type="text"
              maxLength={150}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Radiografía de tórax"
              required
              style={estiloCampo}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600 }}>
            <span>Descripción (opcional)</span>
            <input
              type="text"
              maxLength={500}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Laboratorio externo - control anual"
              style={estiloCampo}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600 }}>
            <span>Archivo (PDF, PNG, JPG) *</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              required
              style={{ ...estiloCampo, padding: '0.45rem 0.6rem' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={subiendo}
          style={{
            backgroundColor: '#145da0',
            color: '#fff',
            border: 'none',
            padding: '0.7rem 1.4rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {subiendo ? 'Subiendo archivo...' : 'Guardar en historia clínica'}
        </button>
      </form>
    </div>
  );
}

export default DocumentosExternosMedico;