import { useCallback, useEffect, useState } from 'react';
import { pedir } from '../api';
import { IconoBuscar } from '../iconos';
import { Distribucion, Indicador, Insignia, Tarjeta, Tabla, fechaHora, numero } from '../componentes';

const ESTADOS_AFILIADO = { PENDIENTE: 'Pendiente', ACTIVO: 'Activo', RECHAZADO: 'Rechazado' };
const MOTIVOS = {
  CLAVE_INCORRECTA: 'Contraseña incorrecta',
  USUARIO_NO_EXISTE: 'Correo no registrado',
  CUENTA_BLOQUEADA: 'Cuenta bloqueada',
  USUARIO_INACTIVO: 'Usuario inactivo',
  LIMITE_IP: 'Límite de intentos por IP',
};

function Buscador({ valor, onCambio, placeholder }) {
  return (
    <label className="adm-buscador">
      <IconoBuscar tamano={16} />
      <input type="search" value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

// Retrasa la búsqueda mientras el administrador escribe
function useValorDiferido(valor, ms = 350) {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return diferido;
}

/** Afiliaciones: totales, distribución por EPS/régimen/departamento y aprobación o rechazo con historial. */
export function SeccionAfiliaciones({ recargar }) {
  const [estado, setEstado] = useState('PENDIENTE');
  const [buscar, setBuscar] = useState('');
  const buscarDiferido = useValorDiferido(buscar);
  
  const [lista, setLista] = useState({ afiliados: [], error: '', cargando: true });
  const [metricas, setMetricas] = useState(null);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setLista((l) => ({ ...l, cargando: true }));
    const parametros = new URLSearchParams();
    if (estado) parametros.set('estado', estado);
    if (buscarDiferido.trim()) parametros.set('buscar', buscarDiferido.trim());
    
    try {
      const [resultadoTabla, resultadoMetricas] = await Promise.all([
        pedir('registro', `/admin/afiliados?${parametros}`),
        pedir('registro', '/admin/resumen').catch(() => null)
      ]);
      
      setLista({ afiliados: resultadoTabla.afiliados, error: '', cargando: false });
      if (resultadoMetricas && !resultadoMetricas.error) {
        setMetricas(resultadoMetricas);
      }
    } catch (error) {
      setLista({ afiliados: [], error: error.message, cargando: false });
    }
  }, [estado, buscarDiferido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = async (afiliado, nuevo) => {
    const observacion = window.prompt(`Observación para ${nuevo === 'ACTIVO' ? 'aprobar' : 'rechazar'} a ${afiliado.nombres} ${afiliado.apellidos} (opcional):`, '');
    if (observacion === null) return;
    try {
      await pedir('registro', `/admin/afiliados/${afiliado.id}/estado`, { method: 'PATCH', cuerpo: { estado: nuevo, observacion } });
      setAviso(`${afiliado.nombres} ${afiliado.apellidos} quedó "${ESTADOS_AFILIADO[nuevo]}". El cambio quedó en el historial.`);
      cargar();
      recargar();
    } catch (error) {
      setAviso(error.message);
    }
  };

  const datos = metricas;

  return (
    <div className="adm-seccion">
      {aviso && <p className="adm-aviso" role="status">{aviso}</p>}
      {datos && (
        <div className="adm-indicadores adm-indicadores--compactos">
          <Indicador titulo="Total" valor={numero(datos.total)} />
          <Indicador titulo="Pendientes" valor={numero(datos.pendientes)} tono={datos.pendientes ? 'alerta' : 'neutro'} />
          <Indicador titulo="Activos" valor={numero(datos.activos)} tono="verde" />
          <Indicador titulo="Rechazados" valor={numero(datos.rechazados)} />
          <Indicador titulo="Últimos 7 días" valor={numero(datos.ultimos7Dias)} tono="azul" />
        </div>
      )}

      <div className="adm-rejilla adm-rejilla--tres">
        <Tarjeta titulo="Por EPS">{datos && <Distribucion filas={datos.porEps} />}</Tarjeta>
        <Tarjeta titulo="Por régimen">{datos && <Distribucion filas={datos.porRegimen} />}</Tarjeta>
        <Tarjeta titulo="Por departamento">{datos && <Distribucion filas={datos.porDepartamento} />}</Tarjeta>
      </div>

      <Tarjeta
        ancho
        titulo="Solicitudes de afiliación"
        error={lista.error}
        acciones={(
          <div className="adm-filtros">
            <div className="adm-segmentado" role="group" aria-label="Filtrar afiliaciones por estado">
              {['PENDIENTE', 'ACTIVO', 'RECHAZADO', ''].map((e) => (
                <button key={e || 'todos'} type="button" aria-pressed={estado === e} onClick={() => setEstado(e)}>{e ? ESTADOS_AFILIADO[e] : 'Todos'}</button>
              ))}
            </div>
            <Buscador valor={buscar} onCambio={setBuscar} placeholder="Buscar por nombre, documento o correo" />
          </div>
        )}
      >
        {lista.cargando ? <p className="adm-vacio">Cargando afiliaciones...</p> : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Tabla
              filas={lista.afiliados}
              vacio="No hay afiliaciones con este filtro."
              columnas={[
                { clave: 'nombre', titulo: 'Afiliado', render: (a) => <><strong>{a.nombres} {a.apellidos}</strong><span className="adm-sub">{a.tipoDocumento} {a.documento} · {a.correo}</span></> },
                { clave: 'municipio', titulo: 'Ubicación', render: (a) => `${a.municipio}, ${a.departamento}` },
                { clave: 'eps', titulo: 'EPS / Régimen', render: (a) => <>{a.eps}<span className="adm-sub">{a.regimen} · {a.tipoAfiliacion}</span></> },
                { clave: 'creadoEn', titulo: 'Fecha', render: (a) => fechaHora(a.creadoEn) },
                { clave: 'estado', titulo: 'Estado', render: (a) => <Insignia estado={a.estado} texto={ESTADOS_AFILIADO[a.estado]} /> },
                {
                  clave: 'acciones',
                  titulo: 'Acciones',
                  render: (a) => (
                    <div className="adm-acciones">
                      {a.estado !== 'ACTIVO' && <button type="button" className="adm-btn adm-btn--verde" onClick={() => cambiar(a, 'ACTIVO')}>Aprobar</button>}
                      {a.estado !== 'RECHAZADO' && <button type="button" className="adm-btn adm-btn--rojo" onClick={() => cambiar(a, 'RECHAZADO')}>Rechazar</button>}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

/** Usuarios y accesos: roles, bloqueos, bitácora y gestión de cuentas. */
export function SeccionUsuarios({ resumen, recargar }) {
  const datos = resumen?.datos;
  const [buscar, setBuscar] = useState('');
  const buscarDiferido = useValorDiferido(buscar);
  const [lista, setLista] = useState({ usuarios: [], error: '', cargando: true });
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setLista((l) => ({ ...l, cargando: true }));
    try {
      const r = await pedir('auth', `/admin/usuarios${buscarDiferido.trim() ? `?buscar=${encodeURIComponent(buscarDiferido.trim())}` : ''}`);
      setLista({ usuarios: r.usuarios, error: '', cargando: false });
    } catch (error) {
      setLista({ usuarios: [], error: error.message, cargando: false });
    }
  }, [buscarDiferido]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const [enviandoTodas, setEnviandoTodas] = useState(false);

  const enviarATodos = async () => {
    if (!window.confirm('¿Enviar la constancia de registro en PDF al correo de todos los usuarios activos?')) return;
    setEnviandoTodas(true);
    try {
      const r = await pedir('auth', '/admin/constancias', { method: 'POST' });
      setAviso(`Constancias enviadas: ${r.enviadas} de ${r.total}${r.fallidas ? ` (${r.fallidas} fallaron; revisa la sección Correos)` : ''}.`);
      cargar();
    } catch (error) {
      setAviso(error.message);
    } finally {
      setEnviandoTodas(false);
    }
  };

  const ejecutar = async (accion, mensaje) => {
    try {
      await accion();
      setAviso(mensaje);
      cargar();
      recargar();
    } catch (error) {
      setAviso(error.message);
    }
  };

  return (
    <div className="adm-seccion">
      {aviso && <p className="adm-aviso" role="status">{aviso}</p>}
      {datos && (
        <div className="adm-indicadores adm-indicadores--compactos">
          {datos.usuarios?.porRol?.map((r) => <Indicador key={r.rol} titulo={r.rol} valor={numero(r.total)} tono={r.rol === 'ADMIN' ? 'azul' : 'neutro'} />)}
          <Indicador titulo="Bloqueados" valor={numero(datos.usuarios?.bloqueados)} tono={datos.usuarios.bloqueados ? 'alerta' : 'neutro'} />
          <Indicador 
            titulo="Accesos 24 h" 
            valor={`${datos.accesos24h?.exitosos || 0} / ${datos.accesos24h?.fallidos || 0}`} 
            detalle="exitosos / fallidos" 
          />
        </div>
      )}

      <Tarjeta
        ancho
        titulo="Usuarios"
        error={lista.error}
        acciones={(
          <div className="adm-filtros">
            <Buscador valor={buscar} onCambio={setBuscar} placeholder="Buscar por nombre, correo o documento" />
            <button type="button" className="adm-btn adm-btn--azul" onClick={enviarATodos} disabled={enviandoTodas}>
              {enviandoTodas ? 'Enviando...' : 'Enviar constancias a todos'}
            </button>
          </div>
        )}
      >
        {lista.cargando ? <p className="adm-vacio">Cargando usuarios...</p> : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <Tabla
              filas={lista.usuarios}
              columnas={[
                { clave: 'nombre', titulo: 'Usuario', render: (u) => <><strong>{u.nombre}</strong><span className="adm-sub">{u.email} · {u.tipoDoc} {u.documento}</span></> },
                { clave: 'rol', titulo: 'Rol', render: (u) => <Insignia estado={u.rol} /> },
                { clave: 'ultimoAcceso', titulo: 'Último acceso', render: (u) => fechaHora(u.ultimoAcceso) },
                { clave: 'ultimaConstancia', titulo: 'Constancia enviada', render: (u) => (u.ultimaConstancia ? fechaHora(u.ultimaConstancia) : 'Nunca') },
                {
                  clave: 'estado',
                  titulo: 'Estado',
                  render: (u) => (u.bloqueado ? <Insignia estado="bloqueado" texto="Bloqueado" /> : <Insignia estado={u.activo ? 'activo' : 'inactivo'} texto={u.activo ? 'Activo' : 'Inactivo'} />),
                },
                {
                  clave: 'acciones',
                  titulo: 'Acciones',
                  render: (u) => (
                    <div className="adm-acciones" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minWidth: '160px' }}>
                      <button
                        type="button"
                        className="adm-btn"
                        title="Envía al correo del usuario un PDF con sus datos"
                        onClick={() => ejecutar(() => pedir('auth', `/admin/usuarios/${u.id}/constancia`, { method: 'POST' }), `Constancia enviada a ${u.email}.`)}
                      >
                        Constancia
                      </button>
                      {u.bloqueado && (
                        <button type="button" className="adm-btn adm-btn--azul" onClick={() => ejecutar(() => pedir('auth', `/admin/usuarios/${u.id}/desbloquear`, { method: 'POST' }), `${u.nombre} fue desbloqueado.`)}>
                          Desbloquear
                        </button>
                      )}
                      <button
                        type="button"
                        className={`adm-btn ${u.activo ? 'adm-btn--rojo' : 'adm-btn--verde'}`}
                        onClick={() => ejecutar(() => pedir('auth', `/admin/usuarios/${u.id}/activo`, { method: 'PATCH', cuerpo: { activo: !u.activo } }), `${u.nombre} quedó ${u.activo ? 'inactivo' : 'activo'}.`)}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Tarjeta>

      <div className="adm-rejilla">
        <Tarjeta titulo="Accesos recientes" error={resumen?.error}>
          {datos && (
            <Tabla
              claveFila="clave"
              filas={datos.accesosRecientes?.map((a, i) => ({ ...a, clave: i }))}
              columnas={[
                { clave: 'email', titulo: 'Correo', render: (a) => <>{a.email}{a.nombre && <span className="adm-sub">{a.nombre}</span>}</> },
                { clave: 'resultado', titulo: 'Resultado', render: (a) => <Insignia estado={a.exitoso ? 'activo' : 'rechazado'} texto={a.exitoso ? 'Exitoso' : MOTIVOS[a.motivo] || a.motivo} /> },
                { clave: 'fecha', titulo: 'Fecha', render: (a) => fechaHora(a.fecha) },
              ]}
            />
          )}
        </Tarjeta>
        <Tarjeta titulo="Accesos fallidos por motivo (7 días)" error={resumen?.error}>
          {datos && <Distribucion filas={datos.fallosPorMotivo7Dias?.map((f) => ({ nombre: MOTIVOS[f.motivo] || f.motivo, total: f.total }))} vacio="No hubo accesos fallidos." />}
        </Tarjeta>
      </div>
    </div>
  );
}