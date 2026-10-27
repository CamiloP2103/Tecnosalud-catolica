import { useCallback, useEffect, useState } from 'react';
import { pedir } from '../api';
import { Barra, Insignia, Tarjeta, Tabla, fechaCorta, numero } from '../componentes';

const ETIQUETAS = { PROGRAMADA: 'Programada', ATENDIDA: 'Atendida', NO_ASISTIO: 'No asistió', CANCELADA: 'Cancelada' };

/** Ocupación, disponibilidad por especialidad y agenda con acciones (atendida, no asistió, cancelar). */
function SeccionCitas({ recargar }) {
  // 1. Estado independiente para el resumen de citas
  const [resumenCitas, setResumenCitas] = useState({ datos: null, error: '', cargando: true });
  
  const [rango, setRango] = useState('hoy');
  const [agenda, setAgenda] = useState({ citas: [], error: '', cargando: true });
  const [aviso, setAviso] = useState('');

  // 2. Traer el resumen real del microservicio de citas al montar el componente
  useEffect(() => {
    pedir('citas', '/admin/resumen')
      .then(data => setResumenCitas({ datos: data, error: '', cargando: false }))
      .catch(error => setResumenCitas({ datos: null, error: error.message, cargando: false }));
  }, []); // Se ejecuta una sola vez al cargar la sección

  const datos = resumenCitas.datos;

  const cargarAgenda = useCallback(async () => {
    if (!datos || !datos.hoy) {
      return; // Esperamos a que llegue el resumen antes de buscar la agenda
    }
    setAgenda((a) => ({ ...a, cargando: true }));
    const dias = rango === 'hoy' ? 0 : 6;
    const hasta = new Date(`${datos.hoy}T12:00:00`);
    hasta.setDate(hasta.getDate() + dias);
    const hastaTexto = hasta.toISOString().slice(0, 10);
    
    try {
      const r = await pedir('citas', `/admin/citas?desde=${datos.hoy}&hasta=${hastaTexto}`);
      setAgenda({ citas: r.citas || [], error: '', cargando: false });
    } catch (error) {
      setAgenda({ citas: [], error: error.message, cargando: false });
    }
  }, [datos, rango]);

  useEffect(() => {
    cargarAgenda();
  }, [cargarAgenda]);

  const cambiarEstado = async (cita, estado) => {
    try {
      await pedir('citas', `/admin/citas/${cita.id}/estado`, { method: 'PATCH', cuerpo: { estado } });
      setAviso(`La cita de ${cita.usuarioEmail} quedó como "${ETIQUETAS[estado]}".`);
      
      // Refrescamos ambos componentes locales
      pedir('citas', '/admin/resumen').then(data => setResumenCitas({ datos: data, error: '', cargando: false }));
      cargarAgenda();
      if (recargar) recargar();
    } catch (error) {
      setAviso(error.message);
    }
  };

  const porcentajeOcupacion = datos?.ocupacion?.porcentaje || 0;

  return (
    <div className="adm-seccion">
      {aviso && <p className="adm-aviso" role="status">{aviso}</p>}
      <div className="adm-rejilla">
        <Tarjeta titulo="Ocupación de la semana" error={resumenCitas.error}>
          {resumenCitas.cargando ? (
            <p className="adm-vacio">Cargando datos de ocupación...</p>
          ) : datos ? (
            <>
              <p className="adm-cifra-grande">{porcentajeOcupacion}%</p>
              <Barra porcentaje={porcentajeOcupacion} etiqueta="Ocupación de la semana" />
              <dl className="adm-datos">
                <div><dt>Reservadas</dt><dd>{numero(datos.ocupacion?.reservadas || 0)}</dd></div>
                <div><dt>Horarios libres</dt><dd>{numero(datos.ocupacion?.libres || 0)}</dd></div>
                <div><dt>Atendidas</dt><dd>{numero(datos.semana?.porEstado?.ATENDIDA || 0)}</dd></div>
                <div><dt>No asistió</dt><dd>{numero(datos.semana?.porEstado?.NO_ASISTIO || 0)}</dd></div>
                <div><dt>Canceladas</dt><dd>{numero(datos.semana?.porEstado?.CANCELADA || 0)}</dd></div>
                <div><dt>Médicos activos</dt><dd>{numero(datos.medicos || 0)}</dd></div>
              </dl>
            </>
          ) : (
            <p className="adm-vacio">No hay datos de ocupación disponibles.</p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Disponibilidad por especialidad" error={resumenCitas.error}>
          {resumenCitas.cargando ? (
            <p className="adm-vacio">Cargando especialidades...</p>
          ) : datos?.porEspecialidad && datos.porEspecialidad.length > 0 ? (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <Tabla
                claveFila="id"
                filas={datos.porEspecialidad}
                columnas={[
                  { clave: 'nombre', titulo: 'Especialidad', render: (f) => f.nombre },
                  { clave: 'medicos', titulo: 'Médicos', render: (f) => f.medicos },
                  { clave: 'franjasLibres', titulo: 'Horarios libres', render: (f) => numero(f.franjasLibres) },
                  {
                    clave: 'proxima',
                    titulo: 'Próxima disponible',
                    render: (f) => (f.proximaDisponible ? `${fechaCorta(f.proximaDisponible.fecha)} ${f.proximaDisponible.hora} · ${f.proximaDisponible.medico}` : 'Sin cupos esta semana'),
                  },
                ]}
              />
            </div>
          ) : (
            <p className="adm-vacio">No hay datos de especialidades disponibles.</p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta
        ancho
        titulo="Agenda"
        error={agenda.error}
        acciones={(
          <div className="adm-segmentado" role="group" aria-label="Rango de la agenda">
            <button type="button" aria-pressed={rango === 'hoy'} onClick={() => setRango('hoy')}>Hoy</button>
            <button type="button" aria-pressed={rango === 'semana'} onClick={() => setRango('semana')}>Próximos 7 días</button>
          </div>
        )}
      >
        {agenda.cargando ? <p className="adm-vacio">Cargando agenda...</p> : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Tabla
              filas={agenda.citas}
              vacio={rango === 'hoy' ? 'No hay citas para hoy.' : 'No hay citas en los próximos 7 días.'}
              columnas={[
                { clave: 'fecha', titulo: 'Fecha', render: (c) => `${fechaCorta(c.fecha)} ${c.hora}` },
                { clave: 'usuarioEmail', titulo: 'Paciente', render: (c) => c.usuarioEmail },
                { clave: 'especialidad', titulo: 'Especialidad', render: (c) => c.especialidad },
                { clave: 'medico', titulo: 'Médico', render: (c) => c.medico },
                { clave: 'sede', titulo: 'Sede', render: (c) => c.sede },
                { clave: 'estado', titulo: 'Estado', render: (c) => <Insignia estado={c.estado} texto={ETIQUETAS[c.estado] || c.estado} /> },
                {
                  clave: 'acciones',
                  titulo: 'Acciones',
                  render: (c) => (c.estado === 'PROGRAMADA' ? (
                    <div className="adm-acciones" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minWidth: '220px' }}>
                      <button type="button" className="adm-btn adm-btn--verde" onClick={() => cambiarEstado(c, 'ATENDIDA')}>Atendida</button>
                      <button type="button" className="adm-btn" onClick={() => cambiarEstado(c, 'NO_ASISTIO')}>No asistió</button>
                      <button type="button" className="adm-btn adm-btn--rojo" onClick={() => cambiarEstado(c, 'CANCELADA')}>Cancelar</button>
                    </div>
                  ) : '—'),
                },
              ]}
            />
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

export default SeccionCitas;