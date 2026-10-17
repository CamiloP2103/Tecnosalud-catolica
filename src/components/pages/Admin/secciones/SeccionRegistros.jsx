import { Distribucion, Indicador, Insignia, Tarjeta, Tabla, fechaHora, numero, tamanoArchivo } from '../componentes';

const TIPOS = { 'application/pdf': 'PDF', 'image/png': 'Imagen PNG', 'image/jpeg': 'Imagen JPG', 'text/plain': 'Texto generado' };
const SERVICIOS = {
  'auth-service': 'Autenticación', 'registro-service': 'Registro', 'farmacias-service': 'Farmacias', 'citas-service': 'Citas', desconocido: 'Sin identificar',
};

/** Documentos clínicos: totales, tipos de archivo, últimos cargados y bitácora de descargas. */
export function SeccionDocumentos({ resumen }) {
  const datos = resumen?.datos;
  return (
    <div className="adm-seccion">
      {datos && (
        <div className="adm-indicadores adm-indicadores--compactos">
          <Indicador titulo="Documentos" valor={numero(datos.documentos.total)} tono="azul" />
          <Indicador titulo="Pacientes con documentos" valor={numero(datos.documentos.pacientes)} />
          <Indicador titulo="Espacio usado (cifrado)" valor={tamanoArchivo(datos.documentos.bytes)} />
          <Indicador titulo="Descargas" valor={numero(datos.descargas.total)} detalle={`${datos.descargas.ultimas24h} en 24 h`} />
        </div>
      )}
      <div className="adm-rejilla">
        <Tarjeta titulo="Tipos de archivo" error={resumen?.error}>
          {datos && <Distribucion filas={datos.porTipo.map((t) => ({ nombre: TIPOS[t.tipo] || t.tipo, total: t.total }))} vacio="Todavía no hay documentos." />}
        </Tarjeta>
        <Tarjeta titulo="Últimos documentos" error={resumen?.error}>
          {datos && (
            <Tabla
              filas={datos.recientes}
              vacio="Todavía no hay documentos."
              columnas={[
                { clave: 'titulo', titulo: 'Documento', render: (d) => <>{d.titulo}<span className="adm-sub">{TIPOS[d.tipo] || d.tipo} · {tamanoArchivo(d.tamano)}</span></> },
                { clave: 'pacienteDoc', titulo: 'Paciente' },
                { clave: 'creadoEn', titulo: 'Fecha', render: (d) => fechaHora(d.creadoEn) },
              ]}
            />
          )}
        </Tarjeta>
      </div>
      <Tarjeta ancho titulo="Bitácora de descargas" error={resumen?.error}>
        {datos && (
          <Tabla
            claveFila="clave"
            filas={datos.descargasRecientes.map((d, i) => ({ ...d, clave: i }))}
            vacio="No hay descargas registradas."
            columnas={[
              { clave: 'titulo', titulo: 'Documento' },
              { clave: 'usuarioDoc', titulo: 'Descargado por', render: (d) => <>{d.usuarioDoc} <Insignia estado={d.rol} /></> },
              { clave: 'ip', titulo: 'IP' },
              { clave: 'fecha', titulo: 'Fecha', render: (d) => fechaHora(d.fecha) },
            ]}
          />
        )}
      </Tarjeta>
    </div>
  );
}

/** Correos: enviados y fallidos, por servicio de origen y los más recientes. */
export function SeccionCorreos({ resumen }) {
  const datos = resumen?.datos;
  return (
    <div className="adm-seccion">
      {datos && (
        <div className="adm-indicadores adm-indicadores--compactos">
          <Indicador titulo="Correos registrados" valor={numero(datos.total)} tono="azul" />
          <Indicador titulo="Enviados" valor={numero(datos.enviadas)} tono="verde" />
          <Indicador titulo="Fallidos" valor={numero(datos.fallidas)} tono={datos.fallidas ? 'alerta' : 'neutro'} />
          <Indicador titulo="Últimas 24 horas" valor={numero(datos.ultimas24h)} />
        </div>
      )}
      <div className="adm-rejilla">
        <Tarjeta titulo="Por servicio de origen" error={resumen?.error}>
          {datos && <Distribucion filas={datos.porServicio.map((s) => ({ nombre: SERVICIOS[s.servicio] || s.servicio, total: s.total }))} vacio="Todavía no se han enviado correos." />}
        </Tarjeta>
        <Tarjeta titulo="Correos recientes" error={resumen?.error}>
          {datos && (
            <Tabla
              filas={datos.recientes}
              vacio="Todavía no se han enviado correos."
              columnas={[
                { clave: 'destinatario', titulo: 'Destinatario', render: (c) => <>{c.destinatario}<span className="adm-sub">{c.asunto}</span></> },
                { clave: 'servicioOrigen', titulo: 'Origen', render: (c) => SERVICIOS[c.servicioOrigen] || c.servicioOrigen },
                { clave: 'estado', titulo: 'Estado', render: (c) => <Insignia estado={c.estado === 'ENVIADA' ? 'activo' : 'rechazado'} texto={c.estado === 'ENVIADA' ? 'Enviado' : 'Fallido'} /> },
                { clave: 'creadoEn', titulo: 'Fecha', render: (c) => fechaHora(c.creadoEn) },
              ]}
            />
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
