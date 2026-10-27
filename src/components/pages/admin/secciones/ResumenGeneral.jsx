import {
  IconoAfiliacion, IconoAlerta, IconoCalendario, IconoCorreo, IconoDocumento, IconoMedicamento, IconoPedido, IconoUsuarios,
} from '../iconos';
import { Barra, Indicador, Tarjeta, numero, pesos } from '../componentes';

const NOMBRES_SERVICIO = {
  auth: 'Autenticación',
  registro: 'Registro',
  farmacias: 'Farmacias',
  notificaciones: 'Notificaciones',
  documentos: 'Documentos',
  citas: 'Citas',
};

function ResumenGeneral({ resumenes, irA }) {
  const auth = resumenes.auth?.datos;
  const registro = resumenes.registro?.datos;
  const farmacias = resumenes.farmacias?.datos;
  const citas = resumenes.citas?.datos;
  const documentos = resumenes.documentos?.datos;
  const correos = resumenes.notificaciones?.datos;
  
  const inventario = farmacias?.inventario || {};

  return (
    <div className="adm-seccion">
      <div className="adm-indicadores">
        <Indicador
          icono={IconoCalendario}
          titulo="Citas de hoy"
          valor={citas?.citasHoy ? numero(citas.citasHoy.length) : '0'}
          detalle={citas?.ocupacion ? `Ocupación de la semana: ${citas.ocupacion?.porcentaje || 0}%` : '—'}
          tono="azul"
          onClick={() => irA('citas')}
        />
        <Indicador
          icono={IconoMedicamento}
          titulo="Unidades en inventario"
          valor={numero(inventario.unidadesDisponibles || 0)}
          detalle={`${inventario.productosAgotados || 0} agotados · ${inventario.menosDe5 || 0} con pocas unidades`}
          tono={inventario.productosAgotados ? 'alerta' : 'verde'}
          onClick={() => irA('farmacias')}
        />
        <Indicador
          icono={IconoPedido}
          titulo="Pedidos por despachar"
          valor={numero(farmacias?.solicitudesPendientes || 0)}
          detalle="Solicitudes en red"
          tono="neutro"
          onClick={() => irA('pedidos')}
        />
        <Indicador
          icono={IconoAfiliacion}
          titulo="Afiliaciones por revisar"
          valor={registro ? numero(registro?.pendientes || 0) : '0'}
          detalle={registro ? `${registro?.total || 0} en total · ${registro?.ultimos7Dias || 0} en los últimos 7 días` : undefined}
          tono={registro?.pendientes ? 'alerta' : 'neutro'}
          onClick={() => irA('afiliaciones')}
        />
        <Indicador
          icono={IconoUsuarios}
          titulo="Usuarios registrados"
          valor={auth?.usuarios ? numero(auth.usuarios?.total || 0) : '0'}
          detalle={auth?.usuarios ? `${auth.usuarios?.bloqueados || 0} bloqueados · ${auth.accesos24h?.fallidos || 0} accesos fallidos en 24 h` : undefined}
          tono={auth?.usuarios?.bloqueados ? 'alerta' : 'azul'}
          onClick={() => irA('usuarios')}
        />
        <Indicador
          icono={IconoDocumento}
          titulo="Documentos clínicos"
          valor={documentos?.documentos ? numero(documentos.documentos?.total || 0) : '—'}
          detalle="Portal clínico"
          onClick={() => irA('documentos')}
        />
        <Indicador
          icono={IconoCorreo}
          titulo="Correos enviados"
          valor={correos?.enviadas ? numero(correos.enviadas) : '—'}
          detalle="Notificaciones del sistema"
          tono="verde"
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
          {citas?.ocupacion && (
            <>
              <p className="adm-cifra-grande">{citas.ocupacion?.porcentaje || 0}%</p>
              <Barra porcentaje={citas.ocupacion?.porcentaje || 0} etiqueta="Ocupación de citas" />
              <p className="adm-nota">{numero(citas.ocupacion?.reservadas || 0)} citas reservadas y {numero(citas.ocupacion?.libres || 0)} horarios libres con {citas?.medicos || 0} médicos.</p>
            </>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}

export default ResumenGeneral;