// Llamadas del panel de administración a los microservicios en Azure.
import {
  llamarServicio, mensajeDeError,
  SERVICIO_AUTH, SERVICIO_REGISTRO, SERVICIO_FARMACIAS, SERVICIO_DOCUMENTOS, SERVICIO_CITAS,
} from '../../../utils/servicios';

const env = import.meta.env;

// Raíces limpias para consultar el estado /health de los App Services
export const URLS_RAIZ = {
  auth: env.VITE_API_AUTH_URL || 'https://tecnosalud-auth-2026-grgzcsa5ajhje5f8.brazilsouth-01.azurewebsites.net',
  registro: env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net',
  farmacias: env.VITE_API_FARMACIAS_URL || 'https://tecnosalud-farmacias-2026.azurewebsites.net',
  notificaciones: env.VITE_API_NOTIFICACIONES_URL || 'https://tecnosalud-notification-2026-hvbrbmd2afarabak.brazilsouth-01.azurewebsites.net',
  documentos: env.VITE_API_DOCUMENTOS_URL || 'https://tecnosalud-documentos-2026.azurewebsites.net',
  citas: env.VITE_API_CITAS_URL || 'https://tecnosalud-citas-2026.azurewebsites.net',
};

// URLs con prefijo para el funcionamiento normal de los módulos de administración y botones
export const URLS = {
  auth: (env.VITE_API_AUTH_URL || 'https://tecnosalud-auth-2026-grgzcsa5ajhje5f8.brazilsouth-01.azurewebsites.net') + '/api/auth',
  registro: (env.VITE_API_REGISTRO_URL || 'https://tecnosalud-registro-2026.azurewebsites.net') + '/api/registro',
  farmacias: (env.VITE_API_FARMACIAS_URL || 'https://tecnosalud-farmacias-2026.azurewebsites.net') + '/api/farmacias',
  notificaciones: (env.VITE_API_NOTIFICACIONES_URL || 'https://tecnosalud-notification-2026-hvbrbmd2afarabak.brazilsouth-01.azurewebsites.net') + '/api/notifications',
  documentos: (env.VITE_API_DOCUMENTOS_URL || 'https://tecnosalud-documentos-2026.azurewebsites.net') + '/api/documentos',
  citas: (env.VITE_API_CITAS_URL || 'https://tecnosalud-citas-2026.azurewebsites.net') + '/api/citas',
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

/** GET/PATCH/POST con la sesión del administrador. */
export async function pedir(servicio, ruta, { method = 'GET', cuerpo } = {}) {
  try {
    // Si la llamada es para verificar salud, usamos la raíz limpia. De lo contrario, usamos el servicio con prefijo.
    const baseUrl = ruta === '/health' ? URLS_RAIZ[servicio] : URLS[servicio];

    const { ok, datos } = await llamarServicio(`${baseUrl}${ruta}`, {
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

// Resúmenes de los seis servicios consultando el endpoint /health en la raíz
export async function cargarResumenes() {
  const fuentes = {
    auth: '/health',
    registro: '/health',
    farmacias: '/health',
    notificaciones: '/health',
    documentos: '/health',
    citas: '/health',
  };
  
  const nombres = Object.keys(fuentes);
  const resultados = await Promise.allSettled(nombres.map((n) => pedir(n, fuentes[n])));
  
  return Object.fromEntries(nombres.map((n, i) => {
    if (resultados[i].status === 'fulfilled') {
      const baseDatos = resultados[i].value || {};
      const datosSeguros = {
        ...baseDatos,
        porcentaje: baseDatos.porcentaje || 0,
        citasHoy: baseDatos.citasHoy || [],
        inventario: baseDatos.inventario || { productosAgotados: 0 },
        solicitudes: baseDatos.solicitudes || { porEstado: { PENDIENTE: { total: 0 } } },
        pendientes: baseDatos.pendientes || 0,
        usuarios: baseDatos.usuarios || { bloqueados: 0, total: 0 },
        fallidas: baseDatos.fallidas || 0,
      };
      return [n, { datos: datosSeguros, error: null }];
    } else {
      return [n, { datos: null, error: resultados[i].reason.message }];
    }
  }));
}