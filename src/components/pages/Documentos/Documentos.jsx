import { useEffect, useState } from 'react';
import './Documentos.css';

const API_DOCUMENTOS = import.meta.env.VITE_API_DOCUMENTOS_URL || 'http://localhost:3004/api/documentos';
const DOCUMENT_PATTERN = /^[A-Za-z0-9.-]{5,20}$/;

function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
  } catch (error) {
    return {};
  }
}

async function solicitarDocumentos(url, options = {}) {
  const token = localStorage.getItem('tecnosalud_token');
  const respuesta = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (respuesta.status === 401) {
    localStorage.removeItem('tecnosalud_token');
    localStorage.removeItem('tecnosalud_sesion_activa');
    window.location.hash = '/acceso';
    window.location.reload();
  }

  return respuesta;
}

function Documentos() {
  const [usuario] = useState(obtenerUsuario);
  const documentoSesion = usuario.documento || '';
  const esPersonal = ['MEDICO', 'ADMIN'].includes(String(usuario.rol || '').toUpperCase());
  const [documentoPaciente, setDocumentoPaciente] = useState(documentoSesion);
  const [documentoAcceso, setDocumentoAcceso] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [contenido, setContenido] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const consultarDocumentos = async (event) => {
    if (event) event.preventDefault();
    setMensaje({ tipo: '', texto: '' });

    if (!DOCUMENT_PATTERN.test(documentoPaciente.trim())) {
      setMensaje({ tipo: 'error', texto: 'Ingresa una identificación de paciente válida.' });
      return;
    }

    setCargando(true);
    try {
      const query = new URLSearchParams({ documentoPaciente: documentoPaciente.trim() });
      const respuesta = await solicitarDocumentos(`${API_DOCUMENTOS}?${query}`);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible consultar los documentos.');
      setDocumentos(datos.documentos);
    } catch (error) {
      setDocumentos([]);
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (documentoSesion) consultarDocumentos();
  }, []);

  const manejarCarga = async (event) => {
    event.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un archivo PDF, PNG o JPG.' });
      return;
    }

    const datosFormulario = new FormData();
    datosFormulario.append('documentoPaciente', documentoPaciente.trim());
    datosFormulario.append('titulo', titulo.trim());
    datosFormulario.append('descripcion', descripcion.trim());
    datosFormulario.append('archivo', archivo);

    setCargando(true);
    try {
      const respuesta = await solicitarDocumentos(API_DOCUMENTOS, {
        method: 'POST',
        body: datosFormulario,
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible cargar el archivo.');
      setTitulo('');
      setDescripcion('');
      setArchivo(null);
      event.target.reset();
      await consultarDocumentos();
      setMensaje({ tipo: 'exito', texto: 'Documento cargado correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };

  const manejarGeneracion = async (event) => {
    event.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    setCargando(true);
    try {
      const respuesta = await solicitarDocumentos(`${API_DOCUMENTOS}/generar`, {
        method: 'POST',
        body: JSON.stringify({
          documentoPaciente: documentoPaciente.trim(),
          titulo: titulo.trim(),
          contenido: contenido.trim(),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No fue posible generar el documento.');
      setTitulo('');
      setContenido('');
      await consultarDocumentos();
      setMensaje({ tipo: 'exito', texto: 'Documento clínico generado correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };

  const descargarDocumento = async (documento) => {
    setMensaje({ tipo: '', texto: '' });
    if (documentoAcceso.trim() !== documentoSesion) {
      setMensaje({ tipo: 'error', texto: 'Confirma tu identificación exactamente como aparece en tu sesión.' });
      return;
    }

    setCargando(true);
    try {
      const respuesta = await solicitarDocumentos(`${API_DOCUMENTOS}/${documento.id}/descargar`, {
        method: 'POST',
        body: JSON.stringify({ documentoAcceso: documentoAcceso.trim() }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.error || 'No fue posible descargar el documento.');
      }
      const archivoBlob = await respuesta.blob();
      const url = URL.createObjectURL(archivoBlob);
      const enlace = window.document.createElement('a');
      enlace.href = url;
      enlace.download = documento.nombreOriginal;
      window.document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMensaje({ tipo: 'exito', texto: 'Descarga iniciada. Abre el archivo desde las descargas de tu dispositivo.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="documentos-panel">
      <header className="documentos-panel__header">
        <h2>Documentos clínicos</h2>
        <p>Consulta y descarga los archivos asociados a una historia clínica.</p>
      </header>

      {mensaje.texto && (
        <div className={`documentos-alerta documentos-alerta--${mensaje.tipo}`} role="alert">
          {mensaje.texto}
        </div>
      )}

      <section className="documentos-card">
        <h3>Buscar historia clínica</h3>
        <p>Los pacientes solo pueden consultar sus propios documentos. El personal clínico debe estar autenticado.</p>
        <form className="documentos-form documentos-form--busqueda" onSubmit={consultarDocumentos}>
          <label>
            Identificación del paciente
            <input
              value={documentoPaciente}
              onChange={(event) => setDocumentoPaciente(event.target.value)}
              readOnly={!esPersonal}
              required
            />
          </label>
          <button className="documentos-boton" type="submit" disabled={cargando}>
            Consultar documentos
          </button>
        </form>
      </section>

      <section className="documentos-card">
        <h3>Cargar un documento</h3>
        <p>Formatos permitidos: PDF, PNG o JPG. Tamaño máximo: 10 MB.</p>
        <form className="documentos-form" onSubmit={manejarCarga}>
          <label>
            Título del documento
            <input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength="150" required />
          </label>
          <label>
            Descripción (opcional)
            <input value={descripcion} onChange={(event) => setDescripcion(event.target.value)} maxLength="500" />
          </label>
          <label>
            Archivo
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(event) => setArchivo(event.target.files[0] || null)}
              required
            />
          </label>
          <button className="documentos-boton" type="submit" disabled={cargando}>
            Cargar archivo
          </button>
        </form>
      </section>

      {esPersonal && (
        <section className="documentos-card">
          <h3>Generar documento clínico</h3>
          <p>Genera un archivo de texto con el contenido ingresado. Revisa su exactitud antes de compartirlo.</p>
          <form className="documentos-form" onSubmit={manejarGeneracion}>
            <label>
              Título
              <input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength="150" required />
            </label>
            <label>
              Contenido del documento
              <textarea
                value={contenido}
                onChange={(event) => setContenido(event.target.value)}
                rows="6"
                maxLength="20000"
                required
              />
            </label>
            <button className="documentos-boton" type="submit" disabled={cargando}>
              Generar documento
            </button>
          </form>
        </section>
      )}

      <section className="documentos-card">
        <h3>Archivos disponibles ({documentos.length})</h3>
        <p>Para cada descarga confirma tu identificación, que debe coincidir con la sesión iniciada.</p>
        <label className="documentos-identificacion">
          Identificación de quien accede y descarga
          <input
            value={documentoAcceso}
            onChange={(event) => setDocumentoAcceso(event.target.value)}
            autoComplete="off"
            inputMode="text"
            placeholder="Confirma tu número de identificación"
            required
          />
        </label>
        {documentos.length === 0 ? (
          <p className="documentos-vacio">
            {cargando ? 'Consultando documentos…' : 'No hay documentos disponibles para esta identificación.'}
          </p>
        ) : (
          <ul className="documentos-lista">
            {documentos.map((documento) => (
              <li key={documento.id} className="documentos-lista__item">
                <div>
                  <strong>{documento.titulo}</strong>
                  <span>{documento.nombreOriginal}</span>
                  {documento.descripcion && <span>{documento.descripcion}</span>}
                  <span>{new Date(documento.creadoEn).toLocaleString('es-CO')}</span>
                </div>
                <button
                  type="button"
                  className="documentos-boton documentos-boton--secundario"
                  onClick={() => descargarDocumento(documento)}
                  disabled={cargando || !documentoAcceso.trim()}
                >
                  Descargar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default Documentos;
