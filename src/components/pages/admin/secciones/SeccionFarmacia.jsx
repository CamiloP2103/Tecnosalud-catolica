import { useCallback, useEffect, useState } from 'react';
import { pedir } from '../api';
import { Barra, Distribucion, Insignia, Tarjeta, Tabla, fechaHora, numero, pesos } from '../componentes';

const ESTADOS_PEDIDO = { PENDIENTE: 'Pendiente', LISTA: 'Lista', ENTREGADA: 'Entregada', CANCELADA: 'Cancelada', RECHAZADA: 'Rechazada' };

/** Inventario: totales, detalle por farmacia, productos con pocas unidades, más pedidos y reabastecimiento. */
export function SeccionInventario({ resumen }) {
  const datos = resumen?.datos;
  const porFarmacia = datos?.porFarmacia || [];
  const maxUnidades = porFarmacia.length > 0 ? Math.max(...porFarmacia.map((f) => f.unidades || 0), 1) : 1;
  const r = datos?.reabastecimiento;
  const inventario = datos?.inventario || {};
  const catalogo = datos?.catalogo || {};

  return (
    <div className="adm-seccion">
      <div className="adm-rejilla">
        <Tarjeta titulo="Inventario total" error={resumen?.error}>
          {datos ? (
            <dl className="adm-datos">
              <div><dt>Unidades disponibles</dt><dd>{numero(inventario.unidades || 0)}</dd></div>
              <div><dt>Valor estimado</dt><dd>{pesos(inventario.valorEstimado || 0)}</dd></div>
              <div><dt>Productos agotados</dt><dd className={inventario.productosAgotados ? 'adm-texto-alerta' : ''}>{inventario.productosAgotados || 0}</dd></div>
              <div><dt>{`Con menos de ${inventario.umbralBajo || 5} unidades`}</dt><dd>{inventario.productosBajos || 0}</dd></div>
              <div><dt>Medicamentos en catálogo</dt><dd>{catalogo.medicamentos || 0}</dd></div>
              <div><dt>Con fórmula / control especial</dt><dd>{catalogo.conFormula || 0} / {catalogo.controlEspecial || 0}</dd></div>
            </dl>
          ) : (
            <p className="adm-vacio">Cargando inventario total...</p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Reabastecimiento semanal (lunes)" error={resumen?.error}>
          {r ? (
            <dl className="adm-datos">
              <div><dt>Próximo</dt><dd>{r.proximo ? new Date(`${r.proximo}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}</dd></div>
              <div><dt>Esta semana</dt><dd>{r.hechoEstaSemana ? 'Ya se hizo' : 'Pendiente'}</dd></div>
              <div><dt>Objetivo por producto</dt><dd>{r.objetivo || 0} unidades</dd></div>
              <div>
                <dt>Último</dt>
                <dd>{r.ultimo ? `${r.ultimo.semana} · ${numero(r.ultimo.unidadesAgregadas || 0)} unidades (${r.ultimo.origen === 'AUTOMATICO' ? 'automático' : 'manual'})` : 'Todavía no se ha hecho'}</dd>
              </div>
            </dl>
          ) : (
            <p className="adm-vacio">Sin datos de reabastecimiento.</p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta ancho titulo="Existencias por farmacia" error={resumen?.error}>
        {porFarmacia.length > 0 ? (
          <Tabla
            filas={porFarmacia}
            columnas={[
              { clave: 'nombre', titulo: 'Farmacia', render: (f) => <><strong>{f.nombre || '—'}</strong><span className="adm-sub">{f.municipio || ''}{f.abierta24h ? ' · 24 horas' : ''}</span></> },
              { clave: 'unidades', titulo: 'Unidades', render: (f) => <div className="adm-celda-barra"><Barra porcentaje={(((f.unidades || 0) / maxUnidades)) * 100} etiqueta={f.nombre || ''} /><span>{numero(f.unidades || 0)}</span></div> },
              { clave: 'productos', titulo: 'Productos', render: (f) => f.productos || 0 },
              { clave: 'agotados', titulo: 'Agotados', render: (f) => <span className={f.agotados ? 'adm-texto-alerta' : ''}>{f.agotados || 0}</span> },
              { clave: 'bajos', titulo: 'Pocas unidades', render: (f) => f.bajos || 0 },
            ]}
          />
        ) : (
          <p className="adm-vacio">No hay datos de farmacias registrados.</p>
        )}
      </Tarjeta>

      <div className="adm-rejilla">
        <Tarjeta titulo="Productos con menos unidades" error={resumen?.error}>
          {datos?.bajoStock ? (
            <Tabla
              claveFila="clave"
              filas={(datos.bajoStock || []).map((f, i) => ({ ...f, clave: i }))}
              vacio="Ningún producto está bajo el umbral."
              columnas={[
                { clave: 'medicamento', titulo: 'Medicamento', render: (f) => `${f.medicamento || ''} ${f.concentracion || ''}` },
                { clave: 'farmacia', titulo: 'Farmacia', render: (f) => f.farmacia || '—' },
                { clave: 'cantidad', titulo: 'Unidades', render: (f) => <Insignia estado={f.cantidad === 0 ? 'agotado' : 'bajo'} texto={f.cantidad === 0 ? 'Agotado' : String(f.cantidad || 0)} /> },
              ]}
            />
          ) : (
            <p className="adm-vacio">Cargando productos con bajo stock...</p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Medicamentos más pedidos" error={resumen?.error}>
          {datos?.masPedidos ? (
            <Distribucion
              filas={(datos.masPedidos || []).map((m) => ({ nombre: `${m.nombre || ''} ${m.concentracion || ''}`, total: m.unidades || 0 }))}
              vacio="Todavía no hay pedidos."
            />
          ) : (
            <p className="adm-vacio">Cargando medicamentos más pedidos...</p>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}

/** Pedidos de medicamentos: filtro por estado y acciones (lista, entregada, rechazar). */
export function SeccionPedidos({ resumen, recargar }) {
  const [estado, setEstado] = useState('PENDIENTE');
  const [lista, setLista] = useState({ solicitudes: [], error: '', cargando: true });
  const [aviso, setAviso] = useState('');
  const conteo = resumen?.datos?.solicitudes?.porEstado || {};

  const cargar = useCallback(async () => {
    setLista((l) => ({ ...l, cargando: true }));
    try {
      const r = await pedir('farmacias', `/admin/solicitudes${estado ? `?estado=${estado}` : ''}`);
      setLista({ solicitudes: r.solicitudes || [], error: '', cargando: false });
    } catch (error) {
      setLista({ solicitudes: [], error: error.message, cargando: false });
    }
  }, [estado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = async (pedido, nuevo) => {
    if (nuevo === 'RECHAZADA' && !window.confirm(`¿Rechazar el pedido #${pedido.id}? Las unidades vuelven al inventario.`)) return;
    try {
      await pedir('farmacias', `/admin/solicitudes/${pedido.id}/estado`, { method: 'PATCH', cuerpo: { estado: nuevo } });
      setAviso(`Pedido #${pedido.id} actualizado a "${ESTADOS_PEDIDO[nuevo]}". Se avisó por correo a ${pedido.usuarioEmail} si correspondía.`);
      cargar();
      recargar();
    } catch (error) {
      setAviso(error.message);
    }
  };

  return (
    <div className="adm-seccion">
      {aviso && <p className="adm-aviso" role="status">{aviso}</p>}
      <Tarjeta
        ancho
        titulo="Pedidos de medicamentos"
        error={lista.error}
        acciones={(
          <div className="adm-segmentado" role="group" aria-label="Filtrar pedidos por estado">
            {['PENDIENTE', 'LISTA', 'ENTREGADA', 'RECHAZADA', 'CANCELADA', ''].map((e) => (
              <button key={e || 'todos'} type="button" aria-pressed={estado === e} onClick={() => setEstado(e)}>
                {e ? ESTADOS_PEDIDO[e] : 'Todos'}{e && conteo[e]?.total ? ` (${conteo[e].total})` : ''}
              </button>
            ))}
          </div>
        )}
      >
        {lista.cargando ? <p className="adm-vacio">Cargando pedidos...</p> : (
          <Tabla
            filas={lista.solicitudes}
            vacio="No hay pedidos con este estado."
            columnas={[
              { clave: 'id', titulo: 'Pedido', render: (p) => `#${p.id}` },
              { clave: 'creadoEn', titulo: 'Fecha', render: (p) => fechaHora(p.creadoEn) },
              { clave: 'usuarioEmail', titulo: 'Usuario' },
              { clave: 'farmacia', titulo: 'Farmacia', render: (p) => <>{p.farmacia}<span className="adm-sub">{p.municipio}</span></> },
              { clave: 'unidades', titulo: 'Productos', render: (p) => `${p.productos} (${p.unidades} u.)${p.formulaNumero ? ' · con fórmula' : ''}` },
              { clave: 'total', titulo: 'Total', render: (p) => pesos(p.total) },
              { clave: 'estado', titulo: 'Estado', render: (p) => <Insignia estado={p.estado} texto={ESTADOS_PEDIDO[p.estado]} /> },
              {
                clave: 'acciones',
                titulo: 'Acciones',
                render: (p) => (
                  <div className="adm-acciones">
                    {p.estado === 'PENDIENTE' && <button type="button" className="adm-btn adm-btn--azul" onClick={() => cambiar(p, 'LISTA')}>Marcar lista</button>}
                    {p.estado === 'LISTA' && <button type="button" className="adm-btn adm-btn--verde" onClick={() => cambiar(p, 'ENTREGADA')}>Entregada</button>}
                    {['PENDIENTE', 'LISTA'].includes(p.estado) && <button type="button" className="adm-btn adm-btn--rojo" onClick={() => cambiar(p, 'RECHAZADA')}>Rechazar</button>}
                    {!['PENDIENTE', 'LISTA'].includes(p.estado) && '—'}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Tarjeta>
    </div>
  );
}