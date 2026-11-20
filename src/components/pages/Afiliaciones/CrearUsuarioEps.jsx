import { useState } from 'react';

const API_AUTH = import.meta.env.VITE_API_AUTH_URL || 'https://tecnosalud-auth-2026-grgzcsa5ajhje5f8.brazilsouth-01.azurewebsites.net/api/auth';

function CrearUsuarioEps() {
  const [formUsuario, setFormUsuario] = useState({
    tipo_doc: 'CC',
    documento: '',
    email: '',
    nombre: '',
    rol_id: '2',
  });
  const [cargandoCrear, setCargandoCrear] = useState(false);
  const [mensajeCrear, setMensajeCrear] = useState({ tipo: '', texto: '' });

  const token = localStorage.getItem('tecnosalud_token');

  const handleCrearUsuarioChange = (e) => {
    const { name, value } = e.target;
    setFormUsuario((prev) => ({ ...prev, [name]: value }));
  };

  const handleCrearUsuarioSubmit = async (e) => {
    e.preventDefault();
    setCargandoCrear(true);
    setMensajeCrear({ tipo: '', texto: '' });
    try {
      const res = await fetch(`${API_AUTH}/registro-interno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formUsuario),
      });
      const data = await res.json();
      if (res.ok) {
        setMensajeCrear({ tipo: 'exito', texto: 'Usuario EPS creado correctamente. Se le envió un correo para activar su cuenta.' });
        setFormUsuario({ tipo_doc: 'CC', documento: '', email: '', nombre: '', rol_id: '2' });
      } else {
        setMensajeCrear({ tipo: 'error', texto: data.error || 'Error al crear el usuario.' });
      }
    } catch {
      setMensajeCrear({ tipo: 'error', texto: 'Error de conexión con el servicio de autenticación.' });
    } finally {
      setCargandoCrear(false);
    }
  };

  return (
    <section className="adm-seccion">
      <div className="adm-tarjeta">
        <div className="adm-tarjeta__encabezado">
          <h3>Crear Nuevo Usuario EPS (Tecnosalud Fija)</h3>
        </div>
        <p className="adm-nota">Formulario conectado al servicio de autenticación para dar de alta registros internos con EPS fija en Tecnosalud.</p>

        {mensajeCrear.texto && (
          <div className="adm-aviso" style={{ marginBottom: '1rem', background: mensajeCrear.tipo === 'exito' ? '#ccfbf1' : '#fee2e2', color: mensajeCrear.tipo === 'exito' ? '#115e59' : '#b91c1c' }}>
            {mensajeCrear.texto}
          </div>
        )}

        <form onSubmit={handleCrearUsuarioSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
              Tipo de Documento
              <select name="tipo_doc" value={formUsuario.tipo_doc} onChange={handleCrearUsuarioChange} className="adm-btn" style={{ width: '100%', background: '#fff' }}>
                <option value="CC">Cédula de Ciudadanía (CC)</option>
                <option value="TI">Tarjeta de Identidad (TI)</option>
                <option value="CE">Cédula de Extranjería (CE)</option>
                <option value="PA">Pasaporte (PA)</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
              Número de Documento
              <input type="text" name="documento" value={formUsuario.documento} onChange={handleCrearUsuarioChange} placeholder="Ej: 10203040" required className="adm-buscador" style={{ width: '100%' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
              Nombre Completo
              <input type="text" name="nombre" value={formUsuario.nombre} onChange={handleCrearUsuarioChange} placeholder="Nombres y Apellidos" required className="adm-buscador" style={{ width: '100%' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', fontWeight: '600' }}>
              Correo Electrónico
              <input type="email" name="email" value={formUsuario.email} onChange={handleCrearUsuarioChange} placeholder="correo@ucatolica.edu.co" required className="adm-buscador" style={{ width: '100%' }} />
            </label>
          </div>

          <button type="submit" className="adm-btn adm-btn--azul" style={{ justifySelf: 'start', marginTop: '0.5rem' }} disabled={cargandoCrear}>
            {cargandoCrear ? 'Registrando usuario...' : 'Crear Usuario y Enviar Activación'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default CrearUsuarioEps;