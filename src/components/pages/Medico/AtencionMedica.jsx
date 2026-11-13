import { useState } from 'react';
import './AtencionMedica.css';
import { llamarServicio } from '../../../utils/servicios';

const API_CITAS = import.meta.env.VITE_API_CITAS_URL || 'http://localhost:3002/api/citas';

function AtencionMedica({ cita, onAtencionFinalizada }) {
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

  // Estados opcionales para documentos clínicos
  const [incluirReceta, incluirRecetaSet] = useState(false);
  const [detallesReceta, setDetallesReceta] = useState([]);
  const [medicamentoActual, setMedicamentoActual] = useState({ medicamento: '', dosis: '', via_administracion: 'Oral', frecuencia: '', duracion_tratamiento: '', cantidad: 1 });

  const [incluirIncapacidad, incluirIncapacidadSet] = useState(false);
  const [incapacidad, setIncapacidad] = useState({ fecha_inicio: '', fecha_fin: '', dias: 1, causa_externa: 'Enfermedad general' });

  const [incluirOrden, incluirOrdenSet] = useState(false);
  const [orden, setOrden] = useState({ tipo_procedimiento: '', descripcion_clinica: '', recomendaciones: '' });

  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const agregarMedicamento = () => {
    if (!medicamentoActual.medicamento || !medicamentoActual.dosis) {
      alert('Ingresa al menos el nombre del medicamento y la dosis.');
      return;
    }
    setDetallesReceta([...detallesReceta, medicamentoActual]);
    setMedicamentoActual({ medicamento: '', dosis: '', via_administracion: 'Oral', frecuencia: '', duracion_tratamiento: '', cantidad: 1 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setExitoMsg('');

    if (!form.motivo_consulta || !form.diagnostico_principal || !form.plan_manejo) {
      setErrorMsg('Por favor completa los campos obligatorios de la historia clínica (Motivo, Diagnóstico Principal y Plan de Manejo).');
      return;
    }

    const payload = {
      cita_id: cita.id,
      afiliado_id: cita.afiliado_id,
      medico_id: cita.medico_id,
      ...form,
      receta: incluirReceta && detallesReceta.length > 0 ? { indicaciones_generales: 'Consumir según indicación médica', detalles: detallesReceta } : null,
      incapacidad: incluirIncapacidad ? incapacidad : null,
      orden_proc: incluirOrden ? orden : null,
    };

    try {
      const { ok, datos } = await llamarServicio(`${API_CITAS}/historias/atencion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!ok) {
        setErrorMsg(datos.error || 'No se pudo guardar la historia clínica.');
        return;
      }

      setExitoMsg('¡Atención médica registrada y documentos generados exitosamente!');
      if (onAtencionFinalizada) onAtencionFinalizada();
    } catch {
      setErrorMsg('Error de conexión con el servidor de citas.');
    }
  };

  return (
    <div className="atencion-container">
      <h2>Atención Médica e Historia Clínica</h2>
      <div className="paciente-info-card">
        <p><strong>Paciente:</strong> {cita.afiliado_nombre}</p>
        <p><strong>Documento:</strong> {cita.afiliado_documento}</p>
        <p><strong>Fecha Cita:</strong> {cita.fecha_hora}</p>
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
            <label>Diagnóstico Principal (CIE-10 / Descripción) *<input type="text" name="diagnostico_principal" value={form.diagnostico_principal} onChange={handleChange} required /></label>
            <label>Diagnóstico Secundario <input type="text" name="diagnostico_secundario" value={form.diagnostico_secundario} onChange={handleChange} /></label>
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
                <input type="text" placeholder="Medicamento" value={medicamentoActual.medicamento} onChange={(e) => setMedicamentoActual({...medicamentoActual, medicamento: e.target.value})} />
                <input type="text" placeholder="Dosis (Ej. 500mg)" value={medicamentoActual.dosis} onChange={(e) => setMedicamentoActual({...medicamentoActual, dosis: e.target.value})} />
                <input type="text" placeholder="Frecuencia (Ej. Cada 8h)" value={medicamentoActual.frecuencia} onChange={(e) => setMedicamentoActual({...medicamentoActual, frecuencia: e.target.value})} />
                <input type="text" placeholder="Duración (Ej. 7 días)" value={medicamentoActual.duracion_tratamiento} onChange={(e) => setMedicamentoActual({...medicamentoActual, duracion_tratamiento: e.target.value})} />
              </div>
              <button type="button" onClick={agregarMedicamento} className="btn-secondary">Añadir Fármaco</button>
              <ul>
                {detallesReceta.map((med, idx) => (
                  <li key={idx}>{med.medicamento} - {med.dosis} ({med.frecuencia})</li>
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
              <label>Fecha Inicio <input type="date" value={incapacidad.fecha_inicio} onChange={(e) => setIncapacidad({...incapacidad, fecha_inicio: e.target.value})} /></label>
              <label>Fecha Fin <input type="date" value={incapacidad.fecha_fin} onChange={(e) => setIncapacidad({...incapacidad, fecha_fin: e.target.value})} /></label>
              <label>Días <input type="number" value={incapacidad.dias} onChange={(e) => setIncapacidad({...incapacidad, dias: e.target.value})} /></label>
            </div>
          )}
        </fieldset>

        <button type="submit" className="btn-primary">Finalizar Consulta y Guardar Historia</button>
      </form>
    </div>
  );
}

export default AtencionMedica;