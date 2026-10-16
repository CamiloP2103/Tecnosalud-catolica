import { useEffect, useState } from 'react';
import './CitasMedicas.css';

const CITAS_API = (import.meta.env.VITE_CITAS_API_URL || 'http://localhost:3003').replace(/\/+$/, '');

function fechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function siguienteDiaHabil() {
  const fecha = new Date();
  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(fecha.getDate() + 1);
  while (fecha.getDay() === 0 || fecha.getDay() === 6) {
    fecha.setDate(fecha.getDate() + 1);
  }
  return fechaLocal(fecha);
}

function obtenerSesion() {
  try {
    return JSON.parse(localStorage.getItem('tecnosalud_sesion_activa') || '{}');
  } catch {
    return {};
  }
}

async function solicitarCitas(ruta, opciones = {}) {
  const token = localStorage.getItem('tecnosalud_token');
  const respuesta = await fetch(`${CITAS_API}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers || {}),
    },
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.error || 'No fue posible completar la operación.');
  return datos;
}

function CitasMedicas() {
  const [sesion] = useState(obtenerSesion);
  const esMedico = sesion.rol === 'MEDICO';
  const nombrePaciente = sesion.nombre || 'Paciente de prueba';
  const [doctores, setDoctores] = useState([]);
  const [citas, setCitas] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [horariosEdicion, setHorariosEdicion] = useState([]);
  const [formCita, setFormCita] = useState({ doctorId: '', fecha: siguienteDiaHabil(), hora: '' });
  const [edicion, setEdicion] = useState(null);
  const [citaPorCancelar, setCitaPorCancelar] = useState(null);
  const [cargandoDoctores, setCargandoDoctores] = useState(true);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState({ tipo: '', texto: '' });
  const [actualizacion, setActualizacion] = useState(0);

  useEffect(() => {
    if (esMedico) {
      setCargandoDoctores(false);
      return undefined;
    }

    let vigente = true;
    solicitarCitas('/api/doctores')
      .then((lista) => {
        if (!vigente) return;
        setDoctores(lista);
        setFormCita((actual) => ({ ...actual, doctorId: actual.doctorId || lista[0]?.id || '' }));
      })
      .catch((error) => {
        if (vigente) setMensajeAlerta({ tipo: 'error', texto: error.message });
      })
      .finally(() => {
        if (vigente) setCargandoDoctores(false);
      });
    return () => { vigente = false; };
  }, [esMedico]);

  useEffect(() => {
    let vigente = true;
    solicitarCitas('/api/citas')
      .then((lista) => {
        if (vigente) setCitas(lista);
      })
      .catch((error) => {
        if (vigente) setMensajeAlerta({ tipo: 'error', texto: error.message });
      });
    return () => { vigente = false; };
  }, [nombrePaciente, actualizacion]);

  useEffect(() => {
    if (esMedico) return undefined;
    if (!formCita.doctorId || !formCita.fecha) return undefined;
    let vigente = true;
    setCargandoHorarios(true);
    setHorarios([]);
    const doctor = encodeURIComponent(formCita.doctorId);
    const fecha = encodeURIComponent(formCita.fecha);
    solicitarCitas(`/api/disponibilidad?fecha=${fecha}&doctorId=${doctor}`)
      .then((datos) => {
        if (vigente) setHorarios(datos.horarios);
      })
      .catch((error) => {
        if (vigente) {
          setHorarios([]);
          setMensajeAlerta({ tipo: 'error', texto: error.message });
        }
      })
      .finally(() => {
        if (vigente) setCargandoHorarios(false);
      });
    return () => { vigente = false; };
  }, [esMedico, formCita.doctorId, formCita.fecha, actualizacion]);

  useEffect(() => {
    if (esMedico) return undefined;
    if (!edicion) return undefined;
    let vigente = true;
    const doctor = encodeURIComponent(edicion.doctorId);
    const fecha = encodeURIComponent(edicion.fecha);
    solicitarCitas(`/api/disponibilidad?fecha=${fecha}&doctorId=${doctor}`)
      .then((datos) => {
        if (vigente) setHorariosEdicion(datos.horarios);
      })
      .catch((error) => {
        if (vigente) {
          setHorariosEdicion([]);
          setMensajeAlerta({ tipo: 'error', texto: error.message });
        }
      });
    return () => { vigente = false; };
  }, [esMedico, edicion?.doctorId, edicion?.fecha]);

  const seleccionarHorario = (hora) => {
    setFormCita((actual) => ({ ...actual, hora }));
  };

  const handleAgendarCita = async (event) => {
    event.preventDefault();
    if (!formCita.hora) {
      setMensajeAlerta({ tipo: 'error', texto: 'Selecciona un horario disponible.' });
      return;
    }

    setGuardando(true);
    try {
      await solicitarCitas('/api/citas', {
        method: 'POST',
        body: JSON.stringify({ nombrePaciente, ...formCita }),
      });
      setFormCita((actual) => ({ ...actual, hora: '' }));
      setMensajeAlerta({ tipo: 'exito', texto: 'La cita quedó asignada correctamente.' });
      setActualizacion((actual) => actual + 1);
    } catch (error) {
      setMensajeAlerta({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelarCita = async (citaId) => {
    setGuardando(true);
    try {
      await solicitarCitas(`/api/citas/${citaId}/cancelar`, { method: 'PATCH' });
      setCitaPorCancelar(null);
      setMensajeAlerta({ tipo: 'exito', texto: 'La cita fue cancelada.' });
      setActualizacion((actual) => actual + 1);
    } catch (error) {
      setMensajeAlerta({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const handleReprogramarCita = async (event) => {
    event.preventDefault();
    if (!edicion?.hora) {
      setMensajeAlerta({ tipo: 'error', texto: 'Selecciona un nuevo horario disponible.' });
      return;
    }

    setGuardando(true);
    try {
      await solicitarCitas(`/api/citas/${edicion.id}/reprogramar`, {
        method: 'PATCH',
        body: JSON.stringify({ doctorId: edicion.doctorId, fecha: edicion.fecha, hora: edicion.hora }),
      });
      setEdicion(null);
      setMensajeAlerta({ tipo: 'exito', texto: 'La cita fue reprogramada correctamente.' });
      setActualizacion((actual) => actual + 1);
    } catch (error) {
      setMensajeAlerta({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="citas-medicas">
      <header className="citas-medicas__header">
        <div>
          <span className="citas-medicas__eyebrow">Agenda de atención</span>
          <h3>{esMedico ? 'Citas asignadas' : 'Citas médicas'}</h3>
          <p>{esMedico ? 'Consulta las citas asignadas a tu agenda.' : 'Consulta horarios disponibles y administra tus citas.'}</p>
        </div>
        <span className="citas-medicas__patient">
          {esMedico ? 'Médico' : 'Paciente'}: {nombrePaciente}
        </span>
      </header>

      {mensajeAlerta.texto && (
        <div className={`salud-alert salud-alert--${mensajeAlerta.tipo}`} role="alert">
          {mensajeAlerta.texto}
        </div>
      )}

      {!esMedico && <section className="citas-medicas__booking" aria-labelledby="citas-booking-title">
        <div className="citas-medicas__section-heading">
          <h3 id="citas-booking-title">Agendar una cita</h3>
          <p>Los turnos duran 30 minutos y están disponibles de lunes a viernes.</p>
        </div>

        <form className="salud-form" onSubmit={handleAgendarCita}>
          <div className="salud-grid">
            <label>
              Paciente
              <input value={nombrePaciente} readOnly />
            </label>
            <label>
              Médico
              <select
                value={formCita.doctorId}
                onChange={(event) => setFormCita((actual) => ({ ...actual, doctorId: event.target.value, hora: '' }))}
                required
                disabled={cargandoDoctores || doctores.length === 0}
              >
                <option value="">Selecciona un médico</option>
                {doctores.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.nombre}</option>)}
              </select>
            </label>
            <label>
              Fecha
              <input
                type="date"
                value={formCita.fecha}
                min={siguienteDiaHabil()}
                onChange={(event) => setFormCita((actual) => ({ ...actual, fecha: event.target.value, hora: '' }))}
                required
              />
            </label>
          </div>

          <fieldset className="citas-medicas__availability">
            <legend>Horarios disponibles</legend>
            {cargandoHorarios ? (
              <p role="status">Consultando disponibilidad...</p>
            ) : horarios.length > 0 ? (
              <div className="citas-medicas__slots" role="group" aria-label="Horarios para agendar">
                {horarios.map((slot) => (
                  <button
                    key={slot.hora}
                    type="button"
                    className={`citas-medicas__slot ${formCita.hora === slot.hora ? 'citas-medicas__slot--selected' : ''}`}
                    aria-pressed={formCita.hora === slot.hora}
                    disabled={!slot.disponible}
                    onClick={() => seleccionarHorario(slot.hora)}
                  >
                    {slot.hora}
                  </button>
                ))}
              </div>
            ) : (
              <p>Selecciona un médico y una fecha hábil para ver los turnos.</p>
            )}
          </fieldset>

          <button type="submit" className="salud-btn-primary" disabled={guardando || !formCita.hora}>
            {guardando ? 'Procesando...' : 'Confirmar cita'}
          </button>
        </form>
      </section>}

      <section className="citas-medicas__appointments" aria-labelledby="citas-list-title">
        <div className="citas-medicas__section-heading">
          <h3 id="citas-list-title">{esMedico ? 'Citas asignadas' : 'Tus citas'}</h3>
          <p>
            {citas.length} {esMedico
              ? (citas.length === 1 ? 'cita asignada' : 'citas asignadas')
              : (citas.length === 1 ? 'cita registrada' : 'citas registradas')}
          </p>
        </div>

        {citas.length === 0 ? (
          <p className="citas-medicas__empty">
            {esMedico ? 'No tienes citas asignadas.' : 'Todavía no tienes citas registradas.'}
          </p>
        ) : (
          <div className="citas-medicas__list">
            {citas.map((cita) => (
              <article className="citas-medicas__appointment" key={cita.id}>
                <div className="citas-medicas__appointment-info">
                  <h4>{esMedico ? cita.nombrePaciente : cita.nombreDoctor}</h4>
                  <p>{cita.fecha} · {cita.hora}</p>
                  <span className={`citas-medicas__status citas-medicas__status--${cita.estado}`}>
                    {cita.estado === 'programada' ? 'Programada' : 'Cancelada'}
                  </span>
                </div>

                {!esMedico && cita.estado === 'programada' && (
                  <div className="citas-medicas__actions">
                    <button
                      type="button"
                      className="salud-btn-outline"
                      onClick={() => {
                        setCitaPorCancelar(null);
                        setEdicion({
                          id: cita.id,
                          doctorId: cita.doctorId,
                          fecha: cita.fecha,
                          hora: cita.hora,
                          fechaOriginal: cita.fecha,
                          horaOriginal: cita.hora,
                        });
                      }}
                    >
                      Reprogramar
                    </button>
                    {citaPorCancelar === cita.id ? (
                      <div className="citas-medicas__confirm-cancel">
                        <span>¿Cancelar esta cita?</span>
                        <button type="button" className="salud-btn-danger" disabled={guardando} onClick={() => handleCancelarCita(cita.id)}>
                          Confirmar
                        </button>
                        <button type="button" className="salud-btn-link" onClick={() => setCitaPorCancelar(null)}>
                          Volver
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="salud-btn-danger" onClick={() => setCitaPorCancelar(cita.id)}>
                        Cancelar
                      </button>
                    )}
                  </div>
                )}

                {!esMedico && edicion?.id === cita.id && (
                  <form className="citas-medicas__reschedule" onSubmit={handleReprogramarCita}>
                    <label>
                      Médico
                      <select
                        value={edicion.doctorId}
                        onChange={(event) => setEdicion((actual) => ({ ...actual, doctorId: event.target.value, hora: '' }))}
                      >
                        {doctores.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.nombre}</option>)}
                      </select>
                    </label>
                    <label>
                      Nueva fecha
                      <input
                        type="date"
                        value={edicion.fecha}
                        min={siguienteDiaHabil()}
                        onChange={(event) => setEdicion((actual) => ({ ...actual, fecha: event.target.value, hora: '' }))}
                        required
                      />
                    </label>
                    <div className="citas-medicas__slots" role="group" aria-label={`Horarios para reprogramar cita ${cita.id}`}>
                      {horariosEdicion.map((slot) => {
                        const esHorarioActual = edicion.fecha === edicion.fechaOriginal
                          && edicion.doctorId === cita.doctorId
                          && slot.hora === edicion.horaOriginal;
                        return (
                          <button
                            key={slot.hora}
                            type="button"
                            className={`citas-medicas__slot ${edicion.hora === slot.hora ? 'citas-medicas__slot--selected' : ''}`}
                            aria-pressed={edicion.hora === slot.hora}
                            disabled={!slot.disponible && !esHorarioActual}
                            onClick={() => setEdicion((actual) => ({ ...actual, hora: slot.hora }))}
                          >
                            {slot.hora}
                          </button>
                        );
                      })}
                    </div>
                    <div className="citas-medicas__reschedule-actions">
                      <button type="submit" className="salud-btn-primary" disabled={guardando || !edicion.hora}>
                        Guardar nuevo horario
                      </button>
                      <button type="button" className="salud-btn-link" onClick={() => setEdicion(null)}>
                        Cerrar
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CitasMedicas;