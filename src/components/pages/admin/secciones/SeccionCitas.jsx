import { useCallback, useEffect, useState } from 'react';
import { pedir } from '../api';
import { Barra, Insignia, Tarjeta, Tabla, fechaCorta, numero } from '../componentes';

const ETIQUETAS = { PROGRAMADA: 'Programada', ATENDIDA: 'Atendida', NO_ASISTIO: 'No asistió', CANCELADA: 'Cancelada' };

/** Ocupación, disponibilidad por especialidad y agenda con acciones (atendida, no asistió, cancelar). */
function SeccionCitas({ resumen, recargar }) {
  const datos = resumen?.datos;
  const [rango, setRango] = useState('hoy');
  const [agenda, setAgenda] = useState({ citas: [], error: '', cargando: true });
  const [aviso, setAviso] = useState('');

  const cargarAgenda = useCallback(async () => {
    if (!datos) return;
    setAgenda((a) => ({ ...a, cargando: true }));
    const dias = rango === 'hoy' ? 0 : 6;
    const hasta = new Date(`${datos.hoy}T12:00:00`);
    hasta.setDate(hasta.getDate() + dias);
    const hastaTexto = hasta.toISOString().slice(0, 10);
    try {
      const r = await pedir('citas', `/admin/citas?desde=${datos.hoy}&hasta=${hastaTexto}`);
      setAgenda({ citas: r.citas, error: '', cargando: false });
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
      cargarAgenda();
      recargar();
    } catch (error) {
      setAviso(error.message);
    }
  };

  return (
    <div className="adm-seccion">
      {aviso && <p className="adm-aviso" role="status">{aviso}</p>}
      <div className="adm-rejilla">
        <Tarjeta titulo="Ocupación de la semana" error={resumen?.error}>
          {datos && (
            <>
              <p className="adm-cifra-grande">{datos.ocupacion.porcentaje}%</p>
              <Barra porcentaje={datos.ocupacion.porcentaje} etiqueta="Ocupación de la semana" />
              <dl className="adm-datos">
                <div><dt>Reservadas</dt><dd>{numero(datos.ocupacion.reservadas)}</dd></div>
                <div><dt>Horarios libres</dt><dd>{numero(datos.ocupacion.libres)}</dd></div>
                <div><dt>Atendidas</dt><dd>{numero(datos.semana.porEstado.ATENDIDA)}</dd></div>
                <div><dt>No asistió</dt><dd>{numero(datos.semana.porEstado.NO_ASISTIO)}</dd></div>
                <div><dt>Canceladas</dt><dd>{numero(datos.semana.porEstado.CANCELADA)}</dd></div>
                <div><dt>Médicos activos</dt><dd>{datos.medicos}</dd></div>
              </dl>
            </>
          )}
        </Tarjeta>

        <Tarjeta titulo="Disponibilidad por especialidad" error={resumen?.error}>
          {datos && (
            <Tabla
              claveFila="id"
              filas={datos.porEspecialidad}
              columnas={[
                { clave: 'nombre', titulo: 'Especialidad' },
                { clave: 'medicos', titulo: 'Médicos' },
                { clave: 'franjasLibres', titulo: 'Horarios libres', render: (f) => numero(f.franjasLibres) },
                {
                  clave: 'proxima',
                  titulo: 'Próxima disponible',
                  render: (f) => (f.proximaDisponible ? `${fechaCorta(f.proximaDisponible.fecha)} ${f.proximaDisponible.hora} · ${f.proximaDisponible.medico}` : 'Sin cupos esta semana'),
                },
              ]}
            />
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
          <Tabla
            filas={agenda.citas}
            vacio={rango === 'hoy' ? 'No hay citas para hoy.' : 'No hay citas en los próximos 7 días.'}
            columnas={[
              { clave: 'fecha', titulo: 'Fecha', render: (c) => `${fechaCorta(c.fecha)} ${c.hora}` },
              { clave: 'usuarioEmail', titulo: 'Paciente' },
              { clave: 'especialidad', titulo: 'Especialidad' },
              { clave: 'medico', titulo: 'Médico' },
              { clave: 'sede', titulo: 'Sede' },
              { clave: 'estado', titulo: 'Estado', render: (c) => <Insignia estado={c.estado} texto={ETIQUETAS[c.estado]} /> },
              {
                clave: 'acciones',
                titulo: 'Acciones',
                render: (c) => (c.estado === 'PROGRAMADA' ? (
                  <div className="adm-acciones">
                    <button type="button" className="adm-btn adm-btn--verde" onClick={() => cambiarEstado(c, 'ATENDIDA')}>Atendida</button>
                    <button type="button" className="adm-btn" onClick={() => cambiarEstado(c, 'NO_ASISTIO')}>No asistió</button>
                    <button type="button" className="adm-btn adm-btn--rojo" onClick={() => cambiarEstado(c, 'CANCELADA')}>Cancelar</button>
                  </div>
                ) : '—'),
              },
            ]}
          />
        )}
      </Tarjeta>
    </div>
  );
}

export default SeccionCitas;
