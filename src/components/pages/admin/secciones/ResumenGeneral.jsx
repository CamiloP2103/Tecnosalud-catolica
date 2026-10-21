import {
  IconoAfiliacion, IconoAlerta, IconoCalendario, IconoCorreo, IconoDocumento, IconoMedicamento, IconoPedido, IconoUsuarios,
} from '../iconos';
import { Barra, Indicador, Tarjeta, numero, pesos } from '../componentes';

const NOMBRES_SERVICIO = {
  auth: 'Autenticación (3002)',
  registro: 'Registro (3003)',
  farmacias: 'Farmacias (3004)',
  notificaciones: 'Notificaciones (3005)',
  documentos: 'Documentos (3006)',
  citas: 'Citas (3007)',
};

/** Vista inicial: indicadores clave de todos los servicios (clic para ir al detalle) y estado de cada microservicio. */
function ResumenGeneral({ resumenes, irA }) {
  const auth = resumenes.auth?.datos;
  const registro = resumenes.registro?.datos;
  const farmacias = resumenes.farmacias?.datos;
  const citas = resumenes.citas?.datos;
  const documentos = resumenes.documentos?.datos;
  const correos = resumenes.notificaciones?.datos;
  const pedidosPendientes = farmacias?.solicitudes.porEstado.PENDIENTE?.total || 0;
  const pedidosListos = farmacias?.solicitudes.porEstado.LISTA?.total || 0;

  return (
    <div className="adm-seccion">
      <div className="adm-indicadores">
        <Indicador
          icono={IconoCalendario}
          titulo="Citas de hoy"
          valor={citas ? numero(citas.citasHoy.length) : '—'}
          detalle={citas ? `Ocupación de la semana: ${citas.ocupacion.porcentaje}%` : resumenes.citas?.error && 'Servicio sin respuesta'}
          tono="azul"
          onClick={() => irA('citas')}
        />
        <Indicador
          icono={IconoMedicamento}
          titulo="Unidades en inventario"
          valor={farmacias ? numero(farmacias.inventario.unidades) : '—'}
          detalle={farmacias ? `${farmacias.inventario.productosAgotados} agotados · ${farmacias.inventario.productosBajos} con pocas unidades` : undefined}
          tono={farmacias?.inventario.productosAgotados ? 'alerta' : 'verde'}
          onClick={() => irA('farmacias')}
        />
        <Indicador
          icono={IconoPedido}
          titulo="Pedidos por despachar"
          valor={farmacias ? numero(pedidosPendientes + pedidosListos) : '—'}
          detalle={farmacias ? `${pedidosPendientes} pendientes · ${pedidosListos} listos · ventas ${pesos(farmacias.solicitudes.ventas)}` : undefined}
          tono={pedidosPendientes ? 'alerta' : 'neutro'}
          onClick={() => irA('pedidos')}
        />
        <Indicador
          icono={IconoAfiliacion}
          titulo="Afiliaciones por revisar"
          valor={registro ? numero(registro.pendientes) : '—'}
          detalle={registro ? `${registro.total} en total · ${registro.ultimos7Dias} en los últimos 7 días` : undefined}
          tono={registro?.pendientes ? 'alerta' : 'neutro'}
          onClick={() => irA('afiliaciones')}
        />
        <Indicador
          icono={IconoUsuarios}
          titulo="Usuarios registrados"
          valor={auth ? numero(auth.usuarios.total) : '—'}
          detalle={auth ? `${auth.usuarios.bloqueados} bloqueados · ${auth.accesos24h.fallidos} accesos fallidos en 24 h` : undefined}
          tono={auth?.usuarios.bloqueados ? 'alerta' : 'azul'}
          onClick={() => irA('usuarios')}
        />
        <Indicador
          icono={IconoDocumento}
          titulo="Documentos clínicos"
          valor={documentos ? numero(documentos.documentos.total) : '—'}
          detalle={documentos ? `${documentos.descargas.ultimas24h} descargas en 24 h` : undefined}
          onClick={() => irA('documentos')}
        />
        <Indicador
          icono={IconoCorreo}
          titulo="Correos enviados"
          valor={correos ? numero(correos.enviadas) : '—'}
          detalle={correos ? `${correos.fallidas} fallidos · ${correos.ultimas24h} en 24 h` : undefined}
          tono={correos?.fallidas ? 'alerta' : 'verde'}
          onClick={() => irA('correos')}
        />
      </div>

      <div className="adm-rejilla">
        <Tarjeta titulo="Estado de los microservicios">
          <ul className="adm-servicios">
            {Object.entries(NOMBRES_SERVICIO).map(([clave, nombre]) => {
              const error = resumenes[clave]?.error;
              return (
                <li key={clave} className={error ? 'adm-servicios--caido' : 'adm-servicios--activo'}>
                  <span className="adm-servicios__punto" aria-hidden="true" />
                  <span className="adm-servicios__nombre">{nombre}</span>
                  <span className="adm-servicios__estado">{error ? 'Con problemas' : 'Funcionando'}</span>
                  {error && <span className="adm-servicios__detalle"><IconoAlerta tamano={14} /> {error}</span>}
                </li>
              );
            })}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Ocupación de citas (próximos 7 días)" error={resumenes.citas?.error}>
          {citas && (
            <>
              <p className="adm-cifra-grande">{citas.ocupacion.porcentaje}%</p>
              <Barra porcentaje={citas.ocupacion.porcentaje} etiqueta="Ocupación de citas" />
              <p className="adm-nota">{numero(citas.ocupacion.reservadas)} citas reservadas y {numero(citas.ocupacion.libres)} horarios libres con {citas.medicos} médicos.</p>
            </>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}

export default ResumenGeneral;
