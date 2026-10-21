import { useCallback, useEffect, useMemo, useState } from 'react';
import './Farmacias.css';
import { llamarServicio, mensajeDeError, SERVICIO_FARMACIAS } from '../../../utils/servicios';

// URL del Microservicio de Farmacias
const API_FARMACIAS = import.meta.env.VITE_API_FARMACIAS_URL || 'http://localhost:3004/api/farmacias';

const MAX_UNIDADES = 10;
const MAX_ITEMS = 10;
const FORMULA_VACIA = { numero: '', medico: '', registroMedico: '', fecha: '' };

const pesos = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);

const fechaLegible = (valor) =>
  valor ? new Date(valor).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '';

const ETIQUETAS_ESTADO = {
  PENDIENTE: 'Completado',
  LISTA: 'Lista para reclamar',
  ENTREGADA: 'Entregada',
  CANCELADA: 'Cancelada',
  RECHAZADA: 'Rechazada',
};

function encabezadosSesion() {
  const token = localStorage.getItem('tecnosalud_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function TipoVenta({ medicamento }) {
  if (medicamento.controlEspecial) {
    return <span className="farm-badge farm-badge--control">Control especial</span>;
  }
  if (medicamento.requiereFormula) {
    return <span className="farm-badge farm-badge--formula">Requiere fórmula</span>;
  }
  return <span className="farm-badge farm-badge--libre">Venta libre</span>;
}

function Farmacias() {
  const [pestana, setPestana] = useState('catalogo');
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });

  // Catálogo
  const [medicamentos, setMedicamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtros, setFiltros] = useState({ buscar: '', categoria: '', requiereFormula: '' });
  const [busqueda, setBusqueda] = useState('');
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState('');

  // Farmacias e inventario
  const [farmacias, setFarmacias] = useState([]);
  const [farmaciaId, setFarmaciaId] = useState('');
  const [inventario, setInventario] = useState([]);
  const [errorFarmacias, setErrorFarmacias] = useState('');

  // Pedido
  const [pedido, setPedido] = useState([]);
  const [formula, setFormula] = useState(FORMULA_VACIA);
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorPedido, setErrorPedido] = useState('');
  const [faltantes, setFaltantes] = useState([]);

  // Disponibilidad por farmacia de cada medicamento ({ [id]: { cargando, error, filas } })
  const [disponibilidad, setDisponibilidad] = useState({});
  const [abiertos, setAbiertos] = useState({});
  const [reabastecimiento, setReabastecimiento] = useState(null);

  // Mis solicitudes
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [errorSolicitudes, setErrorSolicitudes] = useState('');

  const cargarCatalogo = useCallback(async () => {
    setCargandoCatalogo(true);
    setErrorCatalogo('');
    try {
      const parametros = new URLSearchParams();
      if (filtros.buscar) parametros.set('buscar', filtros.buscar);
      if (filtros.categoria) parametros.set('categoria', filtros.categoria);
      if (filtros.requiereFormula) parametros.set('requiereFormula', filtros.requiereFormula);
      const { ok, datos } = await llamarServicio(`${API_FARMACIAS}/medicamentos?${parametros}`, {}, SERVICIO_FARMACIAS);
      if (!ok) throw new Error(datos.error);
      setMedicamentos(datos.medicamentos);
    } catch (error) {
      setErrorCatalogo(mensajeDeError(error, SERVICIO_FARMACIAS));
    } finally {
      setCargandoCatalogo(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  // Categorías y farmacias se cargan una sola vez
  useEffect(() => {
    (async () => {
      try {
        const [respCategorias, respFarmacias, respReabastecimiento] = await Promise.all([
          llamarServicio(`${API_FARMACIAS}/medicamentos/categorias`, {}, SERVICIO_FARMACIAS),
          llamarServicio(`${API_FARMACIAS}/sedes`, {}, SERVICIO_FARMACIAS),
          llamarServicio(`${API_FARMACIAS}/reabastecimiento`, {}, SERVICIO_FARMACIAS).catch(() => ({ ok: false })),
        ]);
        if (respCategorias.ok) setCategorias(respCategorias.datos.categorias);
        if (respFarmacias.ok) setFarmacias(respFarmacias.datos.farmacias);
        if (respReabastecimiento.ok) setReabastecimiento(respReabastecimiento.datos);
      } catch (error) {
        setErrorFarmacias(mensajeDeError(error, SERVICIO_FARMACIAS));
      }
    })();
  }, []);

  // Inventario de la farmacia elegida (para ver disponibilidad y precio del pedido)
  useEffect(() => {
    if (!farmaciaId) {
      setInventario([]);
      return;
    }
    (async () => {
      try {
        const { ok, datos } = await llamarServicio(`${API_FARMACIAS}/sedes/${farmaciaId}/inventario`, {}, SERVICIO_FARMACIAS);
        if (ok) setInventario(datos.inventario);
      } catch (error) {
        setErrorFarmacias(mensajeDeError(error, SERVICIO_FARMACIAS));
      }
    })();
  }, [farmaciaId]);

  const cargarSolicitudes = useCallback(async () => {
    setCargandoSolicitudes(true);
    setErrorSolicitudes('');
    try {
      const { ok, datos } = await llamarServicio(`${API_FARMACIAS}/solicitudes`, { headers: encabezadosSesion() }, SERVICIO_FARMACIAS);
      if (!ok) throw new Error(datos.error);
      setSolicitudes(datos.solicitudes);
    } catch (error) {
      setErrorSolicitudes(error.message || mensajeDeError(error, SERVICIO_FARMACIAS));
    } finally {
      setCargandoSolicitudes(false);
    }
  }, []);

  useEffect(() => {
    if (pestana === 'solicitudes') cargarSolicitudes();
  }, [pestana, cargarSolicitudes]);

  const inventarioPorId = useMemo(
    () => new Map(inventario.map((fila) => [fila.medicamento.id, fila])),
    [inventario]
  );
  const farmaciaElegida = farmacias.find((f) => String(f.id) === String(farmaciaId));
  const pedidoRequiereFormula = pedido.some((item) => item.requiereFormula);
  const unidadesPedido = pedido.reduce((suma, item) => suma + item.cantidad, 0);
  const totalEstimado = pedido.reduce((suma, item) => {
    const precio = inventarioPorId.get(item.id)?.precio ?? item.precioReferencia;
    return suma + precio * item.cantidad;
  }, 0);

  const cambiarPestana = (nueva) => {
    setPestana(nueva);
    setAviso({ tipo: '', texto: '' });
  };

  const agregarAlPedido = (medicamento) => {
    if (medicamento.controlEspecial) return;
    const existente = pedido.find((item) => item.id === medicamento.id);
    if (!existente && pedido.length >= MAX_ITEMS) {
      setAviso({ tipo: 'error', texto: `Puedes pedir máximo ${MAX_ITEMS} medicamentos diferentes por solicitud.` });
      return;
    }
    setPedido((actual) =>
      actual.some((item) => item.id === medicamento.id)
        ? actual.map((item) =>
          item.id === medicamento.id ? { ...item, cantidad: Math.min(item.cantidad + 1, MAX_UNIDADES) } : item
        )
        : [...actual, { ...medicamento, cantidad: 1 }]
    );
    setAviso({ tipo: 'exito', texto: `${medicamento.nombre} ${medicamento.concentracion} se agregó al carrito.` });
  };

  // Muestra u oculta en qué farmacias hay el medicamento (dirección, horario, unidades y precio)
  const alternarDisponibilidad = async (medicamento) => {
    const abierto = !abiertos[medicamento.id];
    setAbiertos((actual) => ({ ...actual, [medicamento.id]: abierto }));
    if (!abierto || disponibilidad[medicamento.id]?.filas) return;

    setDisponibilidad((actual) => ({ ...actual, [medicamento.id]: { cargando: true } }));
    try {
      const { ok, datos } = await llamarServicio(`${API_FARMACIAS}/medicamentos/${medicamento.id}`, {}, SERVICIO_FARMACIAS);
      if (!ok) throw new Error(datos.error || 'No se pudo consultar la disponibilidad.');
      setDisponibilidad((actual) => ({ ...actual, [medicamento.id]: { filas: datos.disponibilidad } }));
    } catch (error) {
      setDisponibilidad((actual) => ({ ...actual, [medicamento.id]: { error: error.message || mensajeDeError(error, SERVICIO_FARMACIAS) } }));
    }
  };

  // Agrega al carrito y deja elegida esa farmacia para el pedido
  const agregarDesdeFarmacia = (medicamento, farmacia) => {
    setFarmaciaId(String(farmacia.id));
    agregarAlPedido(medicamento);
  };

  const cambiarCantidad = (id, delta) => {
    setPedido((actual) =>
      actual
        .map((item) => (item.id === id ? { ...item, cantidad: item.cantidad + delta } : item))
        .filter((item) => item.cantidad > 0)
        .map((item) => ({ ...item, cantidad: Math.min(item.cantidad, MAX_UNIDADES) }))
    );
    setFaltantes([]);
  };

  const elegirFarmacia = (id) => {
    setFarmaciaId(String(id));
    setFaltantes([]);
    setAviso({ tipo: 'exito', texto: 'Farmacia seleccionada para tu pedido.' });
  };

  const enviarPedido = async (event) => {
    event.preventDefault();
    setErrorPedido('');
    setFaltantes([]);

    if (pedido.length === 0) {
      setErrorPedido('Tu carrito está vacío: agrega al menos un medicamento desde el catálogo.');
      return;
    }
    if (!farmaciaId) {
      setErrorPedido('Elige la farmacia donde vas a reclamar.');
      return;
    }
    if (pedidoRequiereFormula && Object.values(formula).some((valor) => !valor.trim())) {
      setErrorPedido('Tu pedido incluye medicamentos con fórmula: completa todos los datos de la fórmula médica.');
      return;
    }

    setEnviando(true);
    try {
      const { ok, status, datos } = await llamarServicio(`${API_FARMACIAS}/solicitudes`, {
        method: 'POST',
        headers: encabezadosSesion(),
        body: JSON.stringify({
          farmaciaId: Number(farmaciaId),
          items: pedido.map((item) => ({ medicamentoId: item.id, cantidad: item.cantidad })),
          ...(pedidoRequiereFormula ? { formula } : {}),
          observaciones: observaciones.trim() || undefined,
        }),
      }, SERVICIO_FARMACIAS);

      if (!ok) {
        if (status === 409 && Array.isArray(datos.detalle)) setFaltantes(datos.detalle);
        const erroresCampos = datos.errores ? Object.values(datos.errores.formula || datos.errores) : [];
        setErrorPedido([datos.error, ...erroresCampos].filter(Boolean).join(' ') || 'No se pudo enviar la solicitud.');
        return;
      }

      setPedido([]);
      setDisponibilidad({});
      cargarCatalogo();
      setFormula(FORMULA_VACIA);
      setObservaciones('');
      setPestana('solicitudes');
      setAviso({
        tipo: 'exito',
        texto: `Pedido #${datos.id} enviado a ${datos.farmacia.nombre} por ${pesos(datos.total)}. Pedido completado: tu pedido llegará en un día. Te enviamos la confirmación a tu correo.`,
      });
    } catch (error) {
      setErrorPedido(mensajeDeError(error, SERVICIO_FARMACIAS));
    } finally {
      setEnviando(false);
    }
  };

  const cancelarSolicitud = async (id) => {
    if (!window.confirm('¿Seguro que quieres cancelar esta solicitud?')) return;
    try {
      const { ok, datos } = await llamarServicio(`${API_FARMACIAS}/solicitudes/${id}/cancelar`, {
        method: 'PATCH',
        headers: encabezadosSesion(),
      }, SERVICIO_FARMACIAS);
      if (!ok) {
        setAviso({ tipo: 'error', texto: datos.error || 'No se pudo cancelar la solicitud.' });
        return;
      }
      setAviso({ tipo: 'exito', texto: `Solicitud #${id} cancelada.` });
      cargarSolicitudes();
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeDeError(error, SERVICIO_FARMACIAS) });
    }
  };

  const pestanas = [
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'farmacias', label: 'Farmacias' },
    { id: 'pedido', label: `Carrito${unidadesPedido ? ` (${unidadesPedido})` : ''}` },
    { id: 'solicitudes', label: 'Mis solicitudes' },
  ];

  return (
    <section className="farm-panel">
      <div className="farm-panel__header">
        <h2>Farmacias Tecnosalud</h2>
        <p>Consulta medicamentos, revisa su disponibilidad y solicítalos en la farmacia que prefieras.</p>
      </div>

      <nav className="farm-tabs" aria-label="Secciones de farmacias">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`farm-tabs__btn ${pestana === p.id ? 'farm-tabs__btn--active' : ''}`}
            aria-pressed={pestana === p.id}
            onClick={() => cambiarPestana(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {aviso.texto && (
        <div className={`farm-alert farm-alert--${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}

      {pestana === 'catalogo' && (
        <div>
          <form
            className="farm-filtros"
            onSubmit={(e) => {
              e.preventDefault();
              setFiltros((f) => ({ ...f, buscar: busqueda.trim() }));
            }}
          >
            <input
              type="search"
              placeholder="Buscar por nombre o uso (ej. amoxicilina, fiebre)"
              aria-label="Buscar medicamento"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              aria-label="Categoría"
              value={filtros.categoria}
              onChange={(e) => setFiltros((f) => ({ ...f, categoria: e.target.value }))}
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.categoria} value={c.categoria}>{c.categoria} ({c.total})</option>
              ))}
            </select>
            <select
              aria-label="Tipo de venta"
              value={filtros.requiereFormula}
              onChange={(e) => setFiltros((f) => ({ ...f, requiereFormula: e.target.value }))}
            >
              <option value="">Venta libre y con fórmula</option>
              <option value="false">Solo venta libre</option>
              <option value="true">Solo con fórmula médica</option>
            </select>
            <button type="submit" className="farm-btn farm-btn--primary">Buscar</button>
          </form>

          {reabastecimiento && (
            <p className="farm-reabastecimiento">
              El inventario se reabastece cada lunes.{' '}
              {reabastecimiento.hoyEsLunes && reabastecimiento.hechoEstaSemana
                ? 'Ya se reabasteció hoy.'
                : `Próximo reabastecimiento: ${new Date(`${reabastecimiento.proximo}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}.`}
            </p>
          )}
          {errorCatalogo && <div className="farm-alert farm-alert--error" role="alert">{errorCatalogo}</div>}
          {cargandoCatalogo && <p className="farm-muted">Cargando medicamentos...</p>}
          {!cargandoCatalogo && !errorCatalogo && (
            <p className="farm-muted">{medicamentos.length} medicamentos encontrados.</p>
          )}

          <div className="farm-grid">
            {medicamentos.map((m) => {
              const sinExistencias = m.unidadesDisponibles === 0;
              return (
                <article key={m.id} className="farm-card">
                  <div className="farm-card__top">
                    <TipoVenta medicamento={m} />
                    <span className="farm-card__categoria">{m.categoria}</span>
                  </div>
                  <h3>{m.nombre} <span>{m.concentracion}</span></h3>
                  <p className="farm-card__presentacion">{m.formaFarmaceutica} · {m.presentacion}</p>
                  {m.descripcion && <p className="farm-card__uso">{m.descripcion}</p>}
                  <p className="farm-card__precio">Desde aprox. {pesos(m.precioReferencia)}</p>
                  <p className={`farm-card__stock ${sinExistencias ? 'farm-card__stock--agotado' : ''}`}>
                    {sinExistencias ? 'Agotado en todas las farmacias' : `Disponible en ${m.farmaciasConExistencias} farmacias`}
                  </p>
                  <button
                    type="button"
                    className="farm-btn farm-btn--secundario"
                    aria-expanded={Boolean(abiertos[m.id])}
                    onClick={() => alternarDisponibilidad(m)}
                  >
                    {abiertos[m.id] ? 'Ocultar farmacias' : '¿En qué farmacias hay?'}
                  </button>
                  {abiertos[m.id] && (
                    <div className="farm-disponibilidad" aria-label={`Farmacias con ${m.nombre} ${m.concentracion}`}>
                      {disponibilidad[m.id]?.cargando && <p className="farm-muted">Consultando farmacias...</p>}
                      {disponibilidad[m.id]?.error && <p className="farm-item__error">{disponibilidad[m.id].error}</p>}
                      {disponibilidad[m.id]?.filas && (
                        <ul>
                          {disponibilidad[m.id].filas.map(({ farmacia, cantidad, precio }) => (
                            <li key={farmacia.id} className={cantidad === 0 ? 'farm-disponibilidad--agotado' : ''}>
                              <strong>{farmacia.nombre}</strong>
                              <span>{farmacia.direccion}{farmacia.localidad ? `, ${farmacia.localidad}` : ''} — {farmacia.municipio}</span>
                              <span>{farmacia.horario}</span>
                              <span>{cantidad > 0 ? `${cantidad} disponibles · ${pesos(precio)}` : 'Agotado en esta sede'}</span>
                              {!m.controlEspecial && cantidad > 0 && (
                                <button
                                  type="button"
                                  className="farm-btn farm-btn--enlace"
                                  onClick={() => agregarDesdeFarmacia(m, farmacia)}
                                  aria-label={`Agregar ${m.nombre} ${m.concentracion} al carrito desde ${farmacia.nombre}`}
                                >
                                  Agregar al carrito desde esta sede
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {m.controlEspecial ? (
                    <p className="farm-card__nota">Se reclama solo en la farmacia con la fórmula oficial en original.</p>
                  ) : (
                    <button
                      type="button"
                      className="farm-btn farm-btn--primary"
                      disabled={sinExistencias}
                      onClick={() => agregarAlPedido(m)}
                      aria-label={`Agregar ${m.nombre} ${m.concentracion} al carrito`}
                    >
                      Agregar al carrito
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {pestana === 'farmacias' && (
        <div>
          {errorFarmacias && <div className="farm-alert farm-alert--error" role="alert">{errorFarmacias}</div>}
          <div className="farm-grid">
            {farmacias.map((f) => {
              const elegida = String(f.id) === String(farmaciaId);
              return (
                <article key={f.id} className={`farm-card ${elegida ? 'farm-card--elegida' : ''}`}>
                  <div className="farm-card__top">
                    <span className="farm-badge farm-badge--cadena">{f.cadena}</span>
                    {f.abierta24h && <span className="farm-badge farm-badge--libre">24 horas</span>}
                  </div>
                  <h3>{f.nombre}</h3>
                  <p className="farm-card__presentacion">{f.direccion}</p>
                  <p className="farm-card__uso">{f.localidad ? `${f.localidad}, ` : ''}{f.municipio}</p>
                  <p className="farm-card__uso">Horario: {f.horario}</p>
                  <p className="farm-card__stock">{f.medicamentosDisponibles} medicamentos disponibles</p>
                  <button
                    type="button"
                    className={`farm-btn ${elegida ? 'farm-btn--secundario' : 'farm-btn--primary'}`}
                    onClick={() => elegirFarmacia(f.id)}
                    aria-label={`Elegir ${f.nombre}`}
                  >
                    {elegida ? 'Farmacia elegida' : 'Elegir esta farmacia'}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {pestana === 'pedido' && (
        <form className="farm-pedido" onSubmit={enviarPedido} noValidate>
          {errorPedido && <div className="farm-alert farm-alert--error" role="alert">{errorPedido}</div>}

          <label className="farm-campo">
            Farmacia donde vas a reclamar
            <select value={farmaciaId} onChange={(e) => setFarmaciaId(e.target.value)}>
              <option value="">Selecciona una farmacia</option>
              {farmacias.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre} — {f.municipio}</option>
              ))}
            </select>
          </label>
          {farmaciaElegida && (
            <p className="farm-muted">{farmaciaElegida.direccion} · {farmaciaElegida.horario}</p>
          )}

          {pedido.length === 0 ? (
            <p className="farm-muted">Tu carrito está vacío. Agrega medicamentos desde el catálogo.</p>
          ) : (
            <ul className="farm-items">
              {pedido.map((item) => {
                const enFarmacia = inventarioPorId.get(item.id);
                const faltante = faltantes.find((f) => f.medicamentoId === item.id);
                return (
                  <li key={item.id} className={`farm-item ${faltante ? 'farm-item--faltante' : ''}`}>
                    <div>
                      <strong>{item.nombre} {item.concentracion}</strong> <TipoVenta medicamento={item} />
                      <div className="farm-muted">{item.presentacion}</div>
                      {farmaciaId && (
                        <div className="farm-item__stock">
                          {enFarmacia && enFarmacia.cantidad > 0
                            ? `Disponibles en esta farmacia: ${enFarmacia.cantidad} · ${pesos(enFarmacia.precio)} c/u`
                            : 'No disponible en esta farmacia'}
                        </div>
                      )}
                      {faltante && (
                        <div className="farm-item__error">Solo hay {faltante.disponible} disponibles.</div>
                      )}
                    </div>
                    <div className="farm-cantidad">
                      <button type="button" aria-label={`Quitar una unidad de ${item.nombre}`} onClick={() => cambiarCantidad(item.id, -1)}>−</button>
                      <span aria-label={`Cantidad de ${item.nombre}`}>{item.cantidad}</span>
                      <button
                        type="button"
                        aria-label={`Agregar una unidad de ${item.nombre}`}
                        disabled={item.cantidad >= MAX_UNIDADES}
                        onClick={() => cambiarCantidad(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pedidoRequiereFormula && (
            <fieldset className="farm-formula">
              <legend>Datos de la fórmula médica</legend>
              <p className="farm-muted">
                Tu pedido incluye medicamentos que requieren fórmula. La fórmula debe tener máximo 30 días y debes
                llevarla en original al reclamar.
              </p>
              <div className="farm-formula__grid">
                <label className="farm-campo">
                  Número de fórmula
                  <input value={formula.numero} onChange={(e) => setFormula({ ...formula, numero: e.target.value })} />
                </label>
                <label className="farm-campo">
                  Médico que formula
                  <input value={formula.medico} onChange={(e) => setFormula({ ...formula, medico: e.target.value })} />
                </label>
                <label className="farm-campo">
                  Registro médico
                  <input value={formula.registroMedico} onChange={(e) => setFormula({ ...formula, registroMedico: e.target.value })} />
                </label>
                <label className="farm-campo">
                  Fecha de la fórmula
                  <input type="date" value={formula.fecha} onChange={(e) => setFormula({ ...formula, fecha: e.target.value })} />
                </label>
              </div>
            </fieldset>
          )}

          <label className="farm-campo">
            Observaciones (opcional)
            <textarea
              maxLength={300}
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Reclama mi hija Ana Pérez"
            />
          </label>

          <div className="farm-pedido__total">
            <span>Total estimado</span>
            <strong>{pesos(totalEstimado)}</strong>
          </div>
          <button type="submit" className="farm-btn farm-btn--primary farm-btn--grande" disabled={enviando}>
            {enviando ? 'Enviando pedido...' : 'Hacer pedido'}
          </button>
        </form>
      )}

      {pestana === 'solicitudes' && (
        <div>
          {errorSolicitudes && <div className="farm-alert farm-alert--error" role="alert">{errorSolicitudes}</div>}
          {cargandoSolicitudes && <p className="farm-muted">Cargando tus solicitudes...</p>}
          {!cargandoSolicitudes && !errorSolicitudes && solicitudes.length === 0 && (
            <p className="farm-muted">Todavía no has hecho solicitudes de medicamentos.</p>
          )}
          {solicitudes.map((s) => (
            <article key={s.id} className="farm-solicitud">
              <div className="farm-solicitud__top">
                <h3>Solicitud #{s.id}</h3>
                <span className={`farm-estado farm-estado--${s.estado.toLowerCase()}`}>{ETIQUETAS_ESTADO[s.estado] || s.estado}</span>
              </div>
              <p className="farm-muted">
                {fechaLegible(s.creadoEn)} · {s.farmacia.nombre}, {s.farmacia.direccion} ({s.farmacia.municipio})
              </p>
              <ul>
                {s.items.map((i) => (
                  <li key={i.medicamentoId}>
                    {i.cantidad} × {i.nombre} {i.concentracion} — {pesos(i.precioUnitario * i.cantidad)}
                  </li>
                ))}
              </ul>
              <div className="farm-solicitud__bottom">
                <strong>Total: {pesos(s.total)}</strong>
                {s.estado === 'PENDIENTE' && (
                  <button type="button" className="farm-btn farm-btn--peligro" onClick={() => cancelarSolicitud(s.id)}>
                    Cancelar solicitud
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Farmacias;