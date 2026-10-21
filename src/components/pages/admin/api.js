// Llamadas del panel de administración a los endpoints /admin de cada microservicio.
import {
  llamarServicio, mensajeDeError,
  SERVICIO_AUTH, SERVICIO_REGISTRO, SERVICIO_FARMACIAS, SERVICIO_DOCUMENTOS, SERVICIO_CITAS,
} from '../../../utils/servicios';

const env = import.meta.env;
export const URLS = {
  auth: env.VITE_API_AUTH_URL || 'http://localhost:3002/api/auth',
  registro: env.VITE_API_REGISTRO_URL || 'http://localhost:3003/api/registro',
  farmacias: env.VITE_API_FARMACIAS_URL || 'http://localhost:3004/api/farmacias',
  notificaciones: env.VITE_API_NOTIFICACIONES_URL || 'http://localhost:3005/api/notifications',
  documentos: env.VITE_API_DOCUMENTOS_URL || 'http://localhost:3006/api/documentos',
  citas: env.VITE_API_CITAS_URL || 'http://localhost:3007/api/citas',
};

export const SERVICIO_NOTIFICACIONES = { nombre: 'el servicio de notificaciones', carpeta: 'notification-service' };

export const SERVICIOS = {
  auth: SERVICIO_AUTH,
  registro: SERVICIO_REGISTRO,
  farmacias: SERVICIO_FARMACIAS,
  notificaciones: SERVICIO_NOTIFICACIONES,
  documentos: SERVICIO_DOCUMENTOS,
  citas: SERVICIO_CITAS,
};

function encabezados() {
  const token = localStorage.getItem('tecnosalud_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** GET/PATCH/POST con la sesión del administrador. Lanza Error con un mensaje listo para mostrar. */
export async function pedir(servicio, ruta, { method = 'GET', cuerpo } = {}) {
  try {
    const { ok, datos } = await llamarServicio(`${URLS[servicio]}${ruta}`, {
      method,
      headers: encabezados(),
      ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
    }, SERVICIOS[servicio]);
    if (!ok) throw new Error(datos.error || 'La solicitud no se pudo completar.');
    return datos;
  } catch (error) {
    throw new Error(error.message || mensajeDeError(error, SERVICIOS[servicio]));
  }
}

// Resúmenes de los seis servicios. allSettled: si uno falla, los demás se muestran igual.
export async function cargarResumenes() {
  const fuentes = {
    auth: '/admin/resumen',
    registro: '/admin/resumen',
    farmacias: '/admin/resumen',
    notificaciones: '/admin/resumen',
    documentos: '/admin/resumen',
    citas: '/admin/resumen',
  };
  const nombres = Object.keys(fuentes);
  const resultados = await Promise.allSettled(nombres.map((n) => pedir(n, fuentes[n])));
  return Object.fromEntries(nombres.map((n, i) => [
    n,
    resultados[i].status === 'fulfilled' ? { datos: resultados[i].value, error: null } : { datos: null, error: resultados[i].reason.message },
  ]));
}
