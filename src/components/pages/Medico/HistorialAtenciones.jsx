import { useState, useEffect } from 'react';
import './Styles/AtencionMedica.css';
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';
const API_DOCUMENTOS = import.meta.env.VITE_API_DOCUMENTOS_URL || 'http://localhost:3003/api/documentos';
const API_NOTIFICACIONES = import.meta.env.VITE_API_NOTIFICACIONES_URL || '';

function HistorialAtenciones() {
  const [historias, setHistorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [descargandoKey, setDescargandoKey] = useState('');
  const [enviandoKey, setEnviandoKey] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  useEffect(() => {
    const cargarHistorial = async () => {
      setCargando(true);
      setErrorMsg('');
      try {
        const token = localStorage.getItem('tecnosalud_token') || '';

        const sesionStr = localStorage.getItem('tecnosalud_sesion_activa') || '{}';
        const sesion = JSON.parse(sesionStr);
        const medicoId = sesion.id || sesion.medico_id;

        if (!medicoId) {
          setErrorMsg('No se pudo identificar al médico en la sesión actual.');
          setCargando(false);
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`
        };

        const [respuesta, respCitas] = await Promise.all([
          llamarServicio(`${API_CITAS}/historias/medico/${medicoId}`, {
            method: 'GET',
            headers
          }),
          llamarServicio(`${API_CITAS}/medico/${medicoId}/citas`, {
            method: 'GET',
            headers
          })
        ]);

        const listaHistorias = respuesta && respuesta.ok
          ? (respuesta.datos?.historias || respuesta.datos || [])
          : [];

        const listaCanceladas = respCitas && respCitas.ok
          ? ((respCitas.datos?.citas || respCitas.datos || [])
              .filter((c) => c.estado === 'CANCELADA')
              .map((c) => ({
                id: `cancelada-${c.id}`,
                fecha_atencion: c.fecha ? `${c.fecha} ${c.hora || ''}` : (c.actualizado_en || 'N/A'),
                afiliado_nombre: c.afiliado_nombre || c.usuario_email || c.usuarioEmail || 'Paciente',
                afiliado_documento: c.afiliado_documento || c.usuario_doc || c.usuarioDoc || 'N/A',
                afiliado_correo: c.usuario_email || c.usuarioEmail || '',
                estado_registro: 'CANCELADA',
                motivo_cancelacion: c.motivo_cancelacion || 'Sin motivo especificado',
                diagnostico_principal: `Motivo de cancelación: ${c.motivo_cancelacion || 'Sin motivo especificado'}`,
                plan_manejo: 'No aplica (Cita cancelada)'
              })))
          : [];

        if ((!respuesta || !respuesta.ok) && listaCanceladas.length === 0) {
          setErrorMsg(respuesta?.datos?.error || 'El módulo de historial aún no está disponible en el servidor de citas (404).');
          setCargando(false);
          return;
        }

        setHistorias([...listaHistorias, ...listaCanceladas]);
      } catch (error) {
        console.error(error);
        setErrorMsg('Error de conexión al cargar el historial clínico.');
      } finally {
        setCargando(false);
      }
    };

    cargarHistorial();
  }, []);

  const dispararDescargaBlob = (blob, nombreArchivo) => {
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  };

  const construirContenidoDocumento = (item, tipoDocumento) => {
    const paciente = item.afiliado_nombre || item.nombre_paciente || 'Paciente';
    const docPaciente = item.afiliado_documento || item.documento || 'N/A';
    const fecha = item.fecha_atencion || item.fecha || 'N/A';

    if (tipoDocumento === 'RECETA_MEDICA') {
      const lineasReceta = [];
      if (item.receta?.indicaciones_generales) {
        lineasReceta.push(`Indicaciones generales: ${item.receta.indicaciones_generales}`);
      }
      if (Array.isArray(item.receta?.detalles) && item.receta.detalles.length > 0) {
        item.receta.detalles.forEach((med, idx) => {
          lineasReceta.push(
            `${idx + 1}. ${med.medicamento || 'Medicamento'} | Dosis: ${med.dosis || 'N/A'} | Frecuencia: ${med.frecuencia || 'N/A'} | Duración: ${med.duracion_tratamiento || 'N/A'}`
          );
        });
      } else {
        lineasReceta.push(`Plan / prescripción registrada: ${item.plan_manejo || 'No especificado'}`);
      }

      return [
        `Paciente: ${paciente} (Doc: ${docPaciente})`,
        `Fecha de atención: ${fecha}`,
        'Tipo de documento: RECETA MÉDICA',
        '',
        ...lineasReceta,
      ].join('\n');
    }

    return [
      `Paciente: ${paciente} (Doc: ${docPaciente})`,
      `Fecha de atención: ${fecha}`,
      'Tipo de documento: DIAGNÓSTICO Y ATENCIÓN CLÍNICA',
      `Motivo de consulta: ${item.motivo_consulta || 'No especificado'}`,
      `Diagnóstico principal: ${item.diagnostico_principal || 'No especificado'}`,
      `Diagnóstico secundario: ${item.diagnostico_secundario || 'No especificado'}`,
      `Plan de manejo: ${item.plan_manejo || 'No especificado'}`,
      `Observaciones: ${item.observaciones || 'Sin observaciones adicionales'}`,
    ].join('\n');
  };

  const descargarDocumentoPorId = async (documentoId, nombreArchivo, token, documentoAcceso) => {
    const respDescarga = await fetch(`${API_DOCUMENTOS}/${documentoId}/descargar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ documentoAcceso })
    });

    if (!respDescarga.ok) {
      let msg = 'No fue posible descargar el documento desde el servicio de documentos.';
      try {
        const errData = await respDescarga.json();
        if (errData?.error) msg = errData.error;
      } catch {
        // Ignorar error de parseo si no es JSON
      }
      throw new Error(msg);
    }

    const blob = await respDescarga.blob();
    dispararDescargaBlob(blob, nombreArchivo);
  };

  /**
   * Gestiona los dos documentos en documentos-service:
   * - tipoDocumento: 'ATENCION_DIAGNOSTICO' | 'RECETA_MEDICA'
   */
  const handleGenerarPdf = async (item, tipoDocumento, index) => {
    const historiaId = item.id || item.historia_clinica_id || index + 1;
    const claveAccion = `${tipoDocumento}-${historiaId}`;
    setDescargandoKey(claveAccion);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('tecnosalud_token') || '';
      const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
      const pacienteDoc = String(item.afiliado_documento || item.documento || '').trim();

      if (!token) {
        setErrorMsg('Debes iniciar sesión para generar o descargar documentos clínicos.');
        return;
      }
      if (!/^[A-Za-z0-9.-]{5,20}$/.test(pacienteDoc)) {
        setErrorMsg('El documento del paciente no cumple con el formato requerido (5 a 20 caracteres).');
        return;
      }

      const esReceta = tipoDocumento === 'RECETA_MEDICA';
      const sufijoArchivo = esReceta ? 'receta_medica' : 'diagnostico_atencion';
      const nombreArchivo = `${sufijoArchivo}_${pacienteDoc}_${historiaId}.pdf`;

      const respHttp = await fetch(`${API_DOCUMENTOS}/generar-pdf-clinico`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo_documento: tipoDocumento,
          historia_clinica_id: item.historia_clinica_id || item.id,
          cita_id: item.cita_id || null,
          afiliado_id: item.afiliado_id || null,
          afiliado_nombre: item.afiliado_nombre || item.nombre_paciente || 'Paciente',
          afiliado_documento: pacienteDoc,
          afiliado_correo: item.afiliado_correo || item.usuario_email || '',
          medico_nombre: item.medico_nombre || item.medico || sesion.nombre || '',
          registro_medico: item.registro_medico || item.registroMedico || sesion.registro_medico || '',
          especialidad: item.especialidad || sesion.especialidad || '',
          fecha_atencion: item.fecha_atencion || item.fecha || '',
          motivo_consulta: item.motivo_consulta || '',
          diagnostico_principal: item.diagnostico_principal || '',
          diagnostico_secundario: item.diagnostico_secundario || '',
          plan_manejo: item.plan_manejo || '',
          observaciones: item.observaciones || '',
          receta: item.receta || null,
        }),
      });

      const dataJson = await respHttp.json().catch(() => ({}));
      if (!respHttp.ok) {
        setErrorMsg(dataJson?.error || 'No se pudo generar el PDF clínico.');
        return;
      }

      if (dataJson?.base64) {
        const base64Limpio = String(dataJson.base64).replace(/^data:application\/pdf;base64,/, '');
        const bytes = Uint8Array.from(atob(base64Limpio), (c) => c.charCodeAt(0));
        dispararDescargaBlob(new Blob([bytes], { type: 'application/pdf' }), nombreArchivo);
      } else {
        setErrorMsg('El servicio de documentos no devolvió el contenido PDF.');
      }
    } catch (error) {
      console.error(`Error al generar PDF (${tipoDocumento}):`, error);
      setErrorMsg(error?.message || 'Error de conexión con el servicio de documentos.');
    } finally {
      setDescargandoKey('');
    }
  };

  // Sin integración todavía: se conectará luego con el servicio de documentos y notificación
  const handleEnviarCorreo = async (item, index) => {
    const historiaId = item.id || item.historia_clinica_id || index + 1;
    const claveAccion = `CORREO-${historiaId}`;
    setEnviandoKey(claveAccion);
    setErrorMsg('');
    setExitoMsg('');

    try {
      const token = localStorage.getItem('tecnosalud_token') || '';
      const sesion = JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
      const correoDestino = String(
        item.afiliado_correo || item.usuario_email || item.email || ''
      ).trim();
      const pacienteDoc = String(item.afiliado_documento || item.documento || '').trim();

      if (!token) {
        setErrorMsg('Debes iniciar sesión para enviar documentos clínicos por correo.');
        return;
      }
      if (!correoDestino) {
        setErrorMsg('El registro del paciente no tiene un correo electrónico asociado.');
        return;
      }

      const payload = {
        destinatario: correoDestino,
        afiliado_correo: correoDestino,
        afiliado_nombre: item.afiliado_nombre || item.nombre_paciente || 'Paciente',
        afiliado_documento: pacienteDoc,
        historia_clinica_id: item.historia_clinica_id || item.id,
        cita_id: item.cita_id || null,
        fecha_atencion: item.fecha_atencion || item.fecha || '',
        motivo_consulta: item.motivo_consulta || '',
        diagnostico_principal: item.diagnostico_principal || '',
        diagnostico_secundario: item.diagnostico_secundario || '',
        plan_manejo: item.plan_manejo || '',
        observaciones: item.observaciones || '',
        receta: item.receta || null,
        medico_nombre: item.medico_nombre || item.medico || sesion.nombre || '',
        registro_medico: item.registro_medico || item.registroMedico || sesion.registro_medico || '',
        especialidad: item.especialidad || sesion.especialidad || '',
        incluir_receta: Boolean(
          item.receta &&
            ((Array.isArray(item.receta.detalles) && item.receta.detalles.length > 0) ||
              item.receta.indicaciones_generales)
        ),
      };

      const urlEnvio = API_NOTIFICACIONES
        ? `${API_NOTIFICACIONES}/notificaciones/documentos-clinicos`
        : `${API_DOCUMENTOS}/api/notifications/email`;

      const respHttp = await fetch(urlEnvio, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const dataJson = await respHttp.json().catch(() => ({}));
      if (!respHttp.ok) {
        setErrorMsg(
          dataJson?.error || dataJson?.mensaje || 'No se pudo enviar el correo con los documentos clínicos.'
        );
        return;
      }

      setExitoMsg(
        dataJson?.mensaje ||
          `Documentos clínicos enviados correctamente a ${correoDestino}.`
      );
    } catch (error) {
      console.error('Error al enviar correo clínico:', error);
      setErrorMsg('Error de conexión al intentar enviar los documentos por correo.');
    } finally {
      setEnviandoKey('');
    }
  };

  const historiasFiltradas = historias.filter((item) => {
    const termino = busqueda.toLowerCase();
    const nombre = (item.afiliado_nombre || item.nombre_paciente || item.usuario_email || '').toLowerCase();
    const documento = String(item.afiliado_documento || item.documento || item.usuario_doc || '');
    const motivoCancel = String(item.motivo_cancelacion || item.diagnostico_principal || '').toLowerCase();
    return nombre.includes(termino) || documento.includes(termino) || motivoCancel.includes(termino);
  });

  return (
    <div className="atencion-container">
      <h2>Historial de Atenciones Clínicas</h2>
      <p>Consulta de registros médicos previos, generación/descarga de documentos (atención y receta) y envío al correo del paciente.</p>

      {/* Barra de Búsqueda */}
      <div style={{ margin: '1.5rem 0 1rem 0' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre del paciente, documento o motivo de cancelación..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '1rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {errorMsg && <div className="alert-error" role="alert">{errorMsg}</div>}

      {cargando ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando historial médico...</p>
      ) : historiasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '1.5rem' }}>
          <p>No se encuentran atenciones médicas registradas que coincidan con la búsqueda.</p>
        </div>
      ) : (
        <div className="tabla-historial-container" style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px' }}>Fecha</th>
                <th style={{ padding: '12px' }}>Paciente</th>
                <th style={{ padding: '12px' }}>Documento</th>
                <th style={{ padding: '12px' }}>Diagnóstico Principal / Cancelación</th>
                <th style={{ padding: '12px' }}>Plan de Manejo</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Documentos</th>
              </tr>
            </thead>
            <tbody>
              {historiasFiltradas.map((item, index) => {
                const esCancelada = item.estado_registro === 'CANCELADA';
                const historiaId = item.id || item.historia_clinica_id || index + 1;
                const cargandoAtencion = descargandoKey === `ATENCION_DIAGNOSTICO-${historiaId}`;
                const cargandoReceta = descargandoKey === `RECETA_MEDICA-${historiaId}`;

                return (
                  <tr
                    key={item.id || index}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: esCancelada ? '#fffafa' : '#ffffff'
                    }}
                  >
                    <td style={{ padding: '12px' }}>{item.fecha_atencion || item.fecha || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <strong>{item.afiliado_nombre || item.nombre_paciente || 'Paciente'}</strong>
                    </td>
                    <td style={{ padding: '12px' }}>{item.afiliado_documento || item.documento || 'N/A'}</td>
                    <td style={{ padding: '12px', color: esCancelada ? '#b91c1c' : '#1e293b' }}>
                      {esCancelada && (
                        <strong style={{
                          display: 'inline-block',
                          background: '#fee2e2',
                          color: '#991b1b',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          marginRight: '6px'
                        }}>
                          CANCELADA
                        </strong>
                      )}
                      {item.diagnostico_principal || 'No especificado'}
                    </td>
                    <td style={{ padding: '12px' }}>{item.plan_manejo || 'N/A'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!esCancelada ? (
                        <div className="historial-acciones-doc">
                          <button
                            type="button"
                            className="btn-doc-pdf"
                            disabled={cargandoAtencion}
                            onClick={() => handleGenerarPdf(item, 'ATENCION_DIAGNOSTICO', index)}
                            title="Generar o descargar documento de diagnóstico y atención médica"
                          >
                            <span>📄</span>
                            <span>{cargandoAtencion ? 'Procesando...' : 'Doc. Atención'}</span>
                          </button>
                          <button
                            type="button"
                            className="btn-doc-pdf btn-doc-receta"
                            disabled={cargandoReceta}
                            onClick={() => handleGenerarPdf(item, 'RECETA_MEDICA', index)}
                            title="Generar o descargar documento de receta médica"
                          >
                            <span>💊</span>
                            <span>{cargandoReceta ? 'Procesando...' : 'Doc. Receta'}</span>
                          </button>
                          {(() => {
                            const cargandoCorreo = enviandoKey === `CORREO-${historiaId}`;
                            return (
                              <button
                                type="button"
                                className="btn-doc-correo"
                                disabled={cargandoCorreo}
                                onClick={() => handleEnviarCorreo(item, index)}
                                title="Enviar documentos al correo del paciente"
                              >
                                <span>✉️</span>
                                <span>{cargandoCorreo ? 'Enviando...' : 'Enviar correo'}</span>
                              </button>
                            );
                          })()}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin documento</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistorialAtenciones;