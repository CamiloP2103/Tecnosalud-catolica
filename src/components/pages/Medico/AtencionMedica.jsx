import { useState, useEffect } from 'react';
import './Styles/AtencionMedica.css';
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';

const DIAGNOSTICOS_RESPALDO = [
  'J00 - Rinofaringitis aguda [resfriado común]',
  'J02.9 - Faringitis aguda, no especificada',
  'J03.9 - Amigdalitis aguda, no especificada',
  'J20.9 - Bronquitis aguda, no especificada',
  'J45.9 - Asma, no especificada',
  'I10 - Hipertensión esencial (primaria)',
  'E11.9 - Diabetes mellitus no insulinodependiente, sin mención de complicación',
  'E78.5 - Hiperlipidemia no especificada',
  'K29.7 - Gastritis, no especificada',
  'K21.9 - Enfermedad del reflujo gastroesofágico sin esofagitis',
  'K59.0 - Estreñimiento',
  'A09.9 - Diarrea y gastroenteritis de presunto origen infeccioso',
  'M54.5 - Lumbago no especificado',
  'M25.5 - Dolor en articulación',
  'R51 - Cefalea',
  'R10.4 - Otros dolores abdominales y los no especificados',
  'N39.0 - Infección de vías urinarias, sitio no especificado',
  'L30.9 - Dermatitis, no especificada',
  'F41.9 - Trastorno de ansiedad, no especificado',
  'Z00.0 - Examen médico general'
];

const MEDICAMENTOS_RESPALDO = [
  'Acetaminofén (Paracetamol) - Tableta 500 mg',
  'Ibuprofeno - Tableta 400 mg',
  'Naproxeno - Tableta 250 mg',
  'Amoxicilina - Cápsula 500 mg',
  'Azitromicina - Tableta 500 mg',
  'Omeprazol - Cápsula 20 mg',
  'Loratadina - Tableta 10 mg',
  'Cetirizina - Tableta 10 mg',
  'Losartán - Tableta 50 mg',
  'Enalapril - Tableta 20 mg',
  'Metformina - Tableta 850 mg',
  'Atorvastatina - Tableta 20 mg',
  'Salbutamol - Inhalador oral 100 mcg/dosis',
  'Hioscina (Butilbromuro) - Tableta 10 mg',
  'Sales de rehidratación oral - Sobre para diluir'
];

const DOSIS_RESPALDO = [
  '100 mg',
  '200 mg',
  '250 mg',
  '400 mg',
  '500 mg',
  '850 mg',
  '1 g',
  '10 mg',
  '20 mg',
  '50 mg',
  '100 mcg (1 inhalación)',
  '200 mcg (2 inhalaciones)',
  '5 mL',
  '10 mL',
  '1 sobre'
];

function AtencionMedica({ cita, onAtencionFinalizada }) {
  // Inicializamos de forma segura por si llega vacía
  const [citaActual, setCitaActual] = useState(cita || {
    id: '',
    afiliado_id: '',
    medico_id: '',
    afiliado_nombre: '',
    afiliado_documento: '',
    fecha_hora: ''
  });

  // 🔑 Sincronizamos si la prop 'cita' cambia o se actualiza al venir desde la agenda
  useEffect(() => {
    if (cita) {
      setCitaActual(cita);
    }
  }, [cita]);

  const [form, setForm] = useState({
    motivo_consulta: '',
    enfermedad_actual: '',
    antecedentes: '',
    examen_fisico: '',
    diagnostico_principal: '',
    diagnostico_secundario: '',
    plan_manejo: '',
    observaciones: '',
  });

  // Catálogos clínicos (CIE-10 EPS Colombia, Medicamentos POS/PBS y Dosis)
  const [diagnosticosLista, setDiagnosticosLista] = useState(DIAGNOSTICOS_RESPALDO);
  const [medicamentosLista, setMedicamentosLista] = useState(MEDICAMENTOS_RESPALDO);
  const [dosisLista, setDosisLista] = useState(DOSIS_RESPALDO);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const token = localStorage.getItem('tecnosalud_token') || '';
        const resp = await llamarServicio(`${API_CITAS}/historias/catalogos/atencion`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (resp && resp.ok && resp.datos) {
          if (Array.isArray(resp.datos.diagnosticos) && resp.datos.diagnosticos.length > 0) {
            setDiagnosticosLista(
              resp.datos.diagnosticos.map((d) =>
                typeof d === 'string' ? d : `${d.codigoCie10 || d.codigo_cie10} - ${d.descripcion}`
              )
            );
          }
          if (Array.isArray(resp.datos.medicamentos) && resp.datos.medicamentos.length > 0) {
            setMedicamentosLista(
              resp.datos.medicamentos.map((m) =>
                typeof m === 'string'
                  ? m
                  : `${m.principioActivo || m.principio_activo}${m.presentacion ? ` - ${m.presentacion}` : ''}`
              )
            );
          }
          if (Array.isArray(resp.datos.dosis) && resp.datos.dosis.length > 0) {
            setDosisLista(
              resp.datos.dosis.map((ds) =>
                typeof ds === 'string' ? ds : (ds.valorDosis || ds.valor_dosis)
              )
            );
          }
        }
      } catch (err) {
        console.warn('Usando catálogos clínicos de respaldo:', err);
      }
    };

    cargarCatalogos();
  }, []);

  // Estados opcionales para documentos clínicos
  const [incluirReceta, incluirRecetaSet] = useState(false);
  const [detallesReceta, setDetallesReceta] = useState([]);
  const [medicamentoActual, setMedicamentoActual] = useState({
    medicamento: '',
    dosis: '',
    via_administracion: 'Oral',
    frecuencia: '',
    duracion_tratamiento: '',
    cantidad: 1
  });

  const [incluirIncapacidad, incluirIncapacidadSet] = useState(false);
  const [incapacidad, setIncapacidad] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    dias: 1,
    causa_externa: 'Enfermedad general'
  });

  const [incluirOrden, incluirOrdenSet] = useState(false);
  const [orden, setOrden] = useState({
    tipo_procedimiento: '',
    descripcion_clinica: '',
    recomendaciones: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const agregarMedicamento = () => {
    if (!medicamentoActual.medicamento || !medicamentoActual.dosis) {
      alert('Selecciona o ingresa al menos el medicamento y la dosis.');
      return;
    }
    setDetallesReceta([...detallesReceta, medicamentoActual]);
    setMedicamentoActual({
      medicamento: '',
      dosis: '',
      via_administracion: 'Oral',
      frecuencia: '',
      duracion_tratamiento: '',
      cantidad: 1
    });
  };

  // 🧮 Cálculo automático de días de incapacidad
  const calcularDiasIncapacidad = (inicio, fin) => {
    if (!inicio || !fin) return 1;
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    const diferenciaMs = fechaFin - fechaInicio;
    const dias = Math.round(diferenciaMs / (1000 * 60 * 60 * 24)) + 1;
    return dias > 0 ? dias : 1;
  };

  const handleIncapacidadChange = (campo, valor) => {
    setIncapacidad((prev) => {
      const nuevoEstado = { ...prev, [campo]: valor };
      if (campo === 'fecha_inicio' || campo === 'fecha_fin') {
        const inicio = campo === 'fecha_inicio' ? valor : prev.fecha_inicio;
        const fin = campo === 'fecha_fin' ? valor : prev.fecha_fin;
        nuevoEstado.dias = calcularDiasIncapacidad(inicio, fin);
      }
      return nuevoEstado;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setExitoMsg('');

    if (!form.motivo_consulta || !form.diagnostico_principal || !form.plan_manejo) {
      setErrorMsg('Por favor completa los campos obligatorios de la historia clínica (Motivo, Diagnóstico Principal y Plan de Manejo).');
      return;
    }

    const recetaPayload = incluirReceta && detallesReceta.length > 0
      ? { indicaciones_generales: 'Consumir según indicación médica', detalles: detallesReceta }
      : null;

    const payload = {
      cita_id: citaActual.id,
      afiliado_id: citaActual.afiliado_id || citaActual.usuarioId || citaActual.usuario_id,
      medico_id: citaActual.medico_id || citaActual.medicoId,
      ...form,
      receta: recetaPayload,
      incapacidad: incluirIncapacidad ? incapacidad : null,
      orden_proc: incluirOrden ? orden : null,
      emitir_documentos: true,
      documento_resumen: {
        tipo: 'CONSULTA_DIAGNOSTICO_RECETA',
        motivo_consulta: form.motivo_consulta,
        diagnostico_principal: form.diagnostico_principal,
        diagnostico_secundario: form.diagnostico_secundario || null,
        plan_manejo: form.plan_manejo,
        receta: recetaPayload
      }
    };

    try {
      // 🔑 Recuperamos el token almacenado
      const token = localStorage.getItem('tecnosalud_token') || '';

      const { ok, datos } = await llamarServicio(`${API_CITAS}/historias/atencion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!ok) {
        setErrorMsg(datos.error || 'No se pudo guardar la historia clínica.');
        return;
      }

      setExitoMsg('¡Atención médica registrada y documentos emitidos exitosamente!');
      if (onAtencionFinalizada) onAtencionFinalizada();
    } catch {
      setErrorMsg('Error de conexión con el servidor de citas.');
    }
  };

  return (
    <div className="atencion-container">
      <h2>Atención Médica e Historia Clínica</h2>
      <p>Gestiona la evolución clínica, diagnósticos y emisión de documentos del paciente.</p>

      <div className="paciente-info-card">
        <p><strong>Paciente:</strong> {citaActual.afiliado_nombre || citaActual.usuario_email || citaActual.usuarioEmail || 'Paciente General'}</p>
        <p><strong>Documento:</strong> {citaActual.afiliado_documento || citaActual.usuario_doc || citaActual.usuarioDoc || 'N/A'}</p>
        <p><strong>Fecha y Hora:</strong> {citaActual.fecha ? `${citaActual.fecha} ${citaActual.hora || ''}` : (citaActual.fecha_hora || 'N/A')}</p>
      </div>

      {errorMsg && <div className="alert-error" role="alert">{errorMsg}</div>}
      {exitoMsg && <div className="alert-success" role="status">{exitoMsg}</div>}

      <form onSubmit={handleSubmit}>
        {/* SECCIÓN 1: EVOLUCIÓN */}
        <fieldset className="form-section">
          <legend>Anamnesis y Examen Físico</legend>
          <label>Motivo de Consulta *<textarea name="motivo_consulta" value={form.motivo_consulta} onChange={handleChange} required rows={2} /></label>
          <label>Enfermedad Actual <textarea name="enfermedad_actual" value={form.enfermedad_actual} onChange={handleChange} rows={2} /></label>
          <label>Antecedentes <textarea name="antecedentes" value={form.antecedentes} onChange={handleChange} rows={2} /></label>
          <label>Examen Físico <textarea name="examen_fisico" value={form.examen_fisico} onChange={handleChange} rows={2} /></label>
        </fieldset>

        {/* SECCIÓN 2: DIAGNÓSTICO */}
        <fieldset className="form-section">
          <legend>Diagnóstico y Plan</legend>
          <div className="form-grid">
            <label>
              Diagnóstico Principal (CIE-10 / EPS Colombia) *
              <select
                name="diagnostico_principal"
                value={form.diagnostico_principal}
                onChange={handleChange}
                required
              >
                <option value="">-- Selecciona un diagnóstico CIE-10 --</option>
                {diagnosticosLista.map((dx, i) => (
                  <option key={i} value={dx}>{dx}</option>
                ))}
              </select>
            </label>
            <label>
              Diagnóstico Secundario
              <select
                name="diagnostico_secundario"
                value={form.diagnostico_secundario}
                onChange={handleChange}
              >
                <option value="">-- Ninguno / Selecciona diagnóstico secundario --</option>
                {diagnosticosLista.map((dx, i) => (
                  <option key={i} value={dx}>{dx}</option>
                ))}
              </select>
            </label>
          </div>
          <label>Plan de Manejo y Tratamiento *<textarea name="plan_manejo" value={form.plan_manejo} onChange={handleChange} required rows={3} /></label>
          <label>Observaciones <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2} /></label>
        </fieldset>

        {/* SECCIÓN 3: RECETA MÉDICA OPCIONAL */}
        <fieldset className="form-section">
          <legend>
            <input type="checkbox" checked={incluirReceta} onChange={(e) => incluirRecetaSet(e.target.checked)} /> Emitir Receta Médica
          </legend>
          {incluirReceta && (
            <div className="sub-form">
              <div className="form-grid">
                <select
                  aria-label="Medicamento POS Colombia"
                  value={medicamentoActual.medicamento}
                  onChange={(e) => setMedicamentoActual({ ...medicamentoActual, medicamento: e.target.value })}
                >
                  <option value="">-- Selecciona medicamento POS/PBS --</option>
                  {medicamentosLista.map((med, i) => (
                    <option key={i} value={med}>{med}</option>
                  ))}
                </select>
                <select
                  aria-label="Dosis"
                  value={medicamentoActual.dosis}
                  onChange={(e) => setMedicamentoActual({ ...medicamentoActual, dosis: e.target.value })}
                >
                  <option value="">-- Selecciona dosis --</option>
                  {dosisLista.map((dosisItem, i) => (
                    <option key={i} value={dosisItem}>{dosisItem}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Frecuencia (Ej. Cada 8h)"
                  value={medicamentoActual.frecuencia}
                  onChange={(e) => setMedicamentoActual({ ...medicamentoActual, frecuencia: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Duración (Ej. 7 días)"
                  value={medicamentoActual.duracion_tratamiento}
                  onChange={(e) => setMedicamentoActual({ ...medicamentoActual, duracion_tratamiento: e.target.value })}
                />
              </div>
              <button type="button" onClick={agregarMedicamento} className="btn-secondary">Añadir Fármaco</button>
              <ul>
                {detallesReceta.map((med, idx) => (
                  <li key={idx}>{med.medicamento} — {med.dosis} ({med.frecuencia})</li>
                ))}
              </ul>
            </div>
          )}
        </fieldset>

        {/* SECCIÓN 4: INCAPACIDAD OPCIONAL */}
        <fieldset className="form-section">
          <legend>
            <input type="checkbox" checked={incluirIncapacidad} onChange={(e) => incluirIncapacidadSet(e.target.checked)} /> Emitir Incapacidad Médica
          </legend>
          {incluirIncapacidad && (
            <div className="form-grid sub-form">
              <label>
                Fecha Inicio
                <input
                  type="date"
                  value={incapacidad.fecha_inicio}
                  onChange={(e) => handleIncapacidadChange('fecha_inicio', e.target.value)}
                />
              </label>
              <label>
                Fecha Fin
                <input
                  type="date"
                  value={incapacidad.fecha_fin}
                  onChange={(e) => handleIncapacidadChange('fecha_fin', e.target.value)}
                />
              </label>
              <label>
                Días Totales (Automático)
                <input
                  type="number"
                  value={incapacidad.dias}
                  readOnly
                  style={{ backgroundColor: '#f0f2f5', cursor: 'not-allowed' }}
                />
              </label>
            </div>
          )}
        </fieldset>

        <button type="submit" className="btn-primary">Finalizar Consulta y Guardar Historia</button>
      </form>
    </div>
  );
}

export default AtencionMedica;