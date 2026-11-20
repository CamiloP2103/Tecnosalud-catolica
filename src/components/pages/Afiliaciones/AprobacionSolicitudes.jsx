import { useState, useEffect } from 'react';

const API_REGISTRO = import.meta.env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net/api/registro';

function AprobacionSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [mensajeSolicitudes, setMensajeSolicitudes] = useState('');

  const token = localStorage.getItem('tecnosalud_token');

  const cargarSolicitudesPendientes = async () => {
    setCargandoSolicitudes(true);
    setMensajeSolicitudes('');
    try {
      const res = await fetch(`${API_REGISTRO}/admin/afiliados?estado=PENDIENTE`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setSolicitudes(data.afiliados || []);
      else setMensajeSolicitudes(data.error || 'No se pudieron cargar las solicitudes.');
    } catch {
      setMensajeSolicitudes('Error de conexión al cargar solicitudes.');
    } finally {
      setCargandoSolicitudes(false);
    }
  };

  useEffect(() => {
    cargarSolicitudesPendientes();
  }, []);

  const aprobarSolicitud = async (id) => {
    try {
      const res = await fetch(`${API_REGISTRO}/admin/afiliados/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: 'ACTIVO', observacion: 'Aprobado desde el panel de afiliaciones' }),
      });
      if (res.ok) {
        setSolicitudes((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'No se pudo aprobar la solicitud.');
      }
    } catch {
      alert('Error de red al aprobar la solicitud.');
    }
  };

  return (
    <section className="adm-seccion">
      <div className="adm-tarjeta">
        <div className="adm-tarjeta__encabezado">
          <h3>Bandeja de Solicitudes Pendientes (Base de Datos)</h3>
          <button type="button" className="adm-btn" onClick={cargarSolicitudesPendientes} disabled={cargandoSolicitudes}>
            {cargandoSolicitudes ? 'Actualizando...' : 'Actualizar Lista'}
          </button>
        </div>

        {mensajeSolicitudes && <p className="adm-error">{mensajeSolicitudes}</p>}

        <div className="adm-tabla-contenedor">
          <table className="adm-tabla">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombres y Apellidos</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((sol) => (
                <tr key={sol.id}>
                  <td>{sol.tipo_doc || sol.tipoDocumento} {sol.documento}</td>
                  <td><strong>{sol.nombres} {sol.apellidos}</strong></td>
                  <td>{sol.correo}</td>
                  <td>
                    <span className="adm-insignia adm-insignia--pendiente">
                      {sol.estado}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="adm-btn adm-btn--verde"
                      onClick={() => aprobarSolicitud(sol.id)}
                    >
                      Aprobar
                    </button>
                  </td>
                </tr>
              ))}
              {!cargandoSolicitudes && solicitudes.length === 0 && (
                <tr>
                  <td colSpan="5" className="adm-vacio" style={{ textAlign: 'center', padding: '1.5rem' }}>
                    No hay solicitudes pendientes en la base de datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AprobacionSolicitudes;