import { useCallback, useEffect, useState } from 'react';
import { pedir } from '../api';
import { Barra, Distribucion, Insignia, Tarjeta, Tabla, fechaHora, numero, pesos } from '../componentes';

const ESTADOS_PEDIDO = { PENDIENTE: 'Pendiente', LISTA: 'Lista', ENTREGADA: 'Entregada', CANCELADA: 'Cancelada', RECHAZADA: 'Rechazada' };

/** Inventario: totales, detalle por farmacia, productos con pocas unidades, más pedidos y reabastecimiento. */
export function SeccionInventario({ resumen }) {
  const datos = resumen?.datos;
  const maxUnidades = datos ? Math.max(...datos.porFarmacia.map((f) => f.unidades), 1) : 1;
  const r = datos?.reabastecimiento;

  return (
    <div className="adm-seccion">
      <div className="adm-rejilla">
        <Tarjeta titulo="Inventario total" error={resumen?.error}>
          {datos && (
            <dl className="adm-datos">
              <div><dt>Unidades disponibles</dt><dd>{numero(datos.inventario.unidades)}</dd></div>
              <div><dt>Valor estimado</dt><dd>{pesos(datos.inventario.valorEstimado)}</dd></div>
              <div><dt>Productos agotados</dt><dd className={datos.inventario.productosAgotados ? 'adm-texto-alerta' : ''}>{datos.inventario.productosAgotados}</dd></div>
              <div><dt>{`Con menos de ${datos.inventario.umbralBajo} unidades`}</dt><dd>{datos.inventario.productosBajos}</dd></div>
              <div><dt>Medicamentos en catálogo</dt><dd>{datos.catalogo.medicamentos}</dd></div>
              <div><dt>Con fórmula / control especial</dt><dd>{datos.catalogo.conFormula} / {datos.catalogo.controlEspecial}</dd></div>
            </dl>
          )}
        </Tarjeta>

        <Tarjeta titulo="Reabastecimiento semanal (lunes)" error={resumen?.error}>
          {r && (
            <dl className="adm-datos">
              <div><dt>Próximo</dt><dd>{new Date(`${r.proximo}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</dd></div>
              <div><dt>Esta semana</dt><dd>{r.hechoEstaSemana ? 'Ya se hizo' : 'Pendiente'}</dd></div>
              <div><dt>Objetivo por producto</dt><dd>{r.objetivo} unidades</dd></div>
              <div>
                <dt>Último</dt>
                <dd>{r.ultimo ? `${r.ultimo.semana} · ${numero(r.ultimo.unidadesAgregadas)} unidades (${r.ultimo.origen === 'AUTOMATICO' ? 'automático' : 'manual'})` : 'Todavía no se ha hecho'}</dd>
              </div>
            </dl>
          )}
        </Tarjeta>
      </div>

      <Tarjeta ancho titulo="Existencias por farmacia" error={resumen?.error}>
        {datos && (
          <Tabla
            filas={datos.porFarmacia}
            columnas={[
              { clave: 'nombre', titulo: 'Farmacia', render: (f) => <><strong>{f.nombre}</strong><span className="adm-sub">{f.municipio}{f.abierta24h ? ' · 24 horas' : ''}</span></> },
              { clave: 'unidades', titulo: 'Unidades', render: (f) => <div className="adm-celda-barra"><Barra porcentaje={(f.unidades / maxUnidades) * 100} etiqueta={f.nombre} /><span>{numero(f.unidades)}</span></div> },
              { clave: 'productos', titulo: 'Productos' },
              { clave: 'agotados', titulo: 'Agotados', render: (f) => <span className={f.agotados ? 'adm-texto-alerta' : ''}>{f.agotados}</span> },
              { clave: 'bajos', titulo: 'Pocas unidades' },
            ]}
          />
        )}
      </Tarjeta>

      <div className="adm-rejilla">
        <Tarjeta titulo="Productos con menos unidades" error={resumen?.error}>
          {datos && (
            <Tabla
              claveFila="clave"
              filas={datos.bajoStock.map((f, i) => ({ ...f, clave: i }))}
              vacio="Ningún producto está bajo el umbral."
              columnas={[
                { clave: 'medicamento', titulo: 'Medicamento', render: (f) => `${f.medicamento} ${f.concentracion}` },
                { clave: 'farmacia', titulo: 'Farmacia' },
                { clave: 'cantidad', titulo: 'Unidades', render: (f) => <Insignia estado={f.cantidad === 0 ? 'agotado' : 'bajo'} texto={f.cantidad === 0 ? 'Agotado' : String(f.cantidad)} /> },
              ]}
            />
          )}
        </Tarjeta>

        <Tarjeta titulo="Medicamentos más pedidos" error={resumen?.error}>
          {datos && (
            <Distribucion
              filas={datos.masPedidos.map((m) => ({ nombre: `${m.nombre} ${m.concentracion}`, total: m.unidades }))}
              vacio="Todavía no hay pedidos."
            />
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
  const conteo = resumen?.datos?.solicitudes.porEstado || {};

  const cargar = useCallback(async () => {
    setLista((l) => ({ ...l, cargando: true }));
    try {
      const r = await pedir('farmacias', `/admin/solicitudes${estado ? `?estado=${estado}` : ''}`);
      setLista({ solicitudes: r.solicitudes, error: '', cargando: false });
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
                {e ? ESTADOS_PEDIDO[e] : 'Todos'}{e && conteo[e] ? ` (${conteo[e].total})` : ''}
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
