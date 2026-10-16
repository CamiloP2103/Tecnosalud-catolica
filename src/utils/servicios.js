// Llamadas a los microservicios con mensajes de error que dicen qué falló exactamente

export const SERVICIO_AUTH = { nombre: 'el servicio de autenticación', carpeta: 'auth-service' };
export const SERVICIO_REGISTRO = { nombre: 'el servicio de registro', carpeta: 'registro-service' };
export const SERVICIO_FARMACIAS = { nombre: 'el servicio de farmacias', carpeta: 'farmacias-service' };
export const SERVICIO_DOCUMENTOS = { nombre: 'el servicio de documentos', carpeta: 'documentos-service' };

export class ErrorServicio extends Error {
  constructor(mensaje, tipo) {
    super(mensaje);
    this.name = 'ErrorServicio';
    this.tipo = tipo; // 'sin-conexion' | 'base-datos' | 'error-interno' | 'respuesta-invalida'
  }
}

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function origen(url) {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return url;
  }
}

// En desarrollo agrega la pista de cómo encender el servicio; en producción no se muestra
function pistaDesarrollo(servicio) {
  return import.meta.env.DEV
    ? ` Enciéndelo con "npm run dev" en backend/services/${servicio.carpeta}.`
    : ' Intenta de nuevo en unos minutos.';
}

// Mensaje cuando el servicio no responde (apagado o sin red)
export function mensajeSinConexion(url, servicio) {
  return `No hay conexión con ${servicio.nombre} (${origen(url)}): parece estar apagado o sin red.${pistaDesarrollo(servicio)}`;
}

/**
 * Hace la petición y devuelve { ok, status, datos }.
 * Lanza ErrorServicio cuando el problema no es del usuario (servicio apagado, base de datos caída, etc.),
 * así cada pantalla solo maneja las respuestas de negocio (401, 400, 409...).
 */
export async function llamarServicio(url, opciones, servicio) {
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    throw new ErrorServicio(mensajeSinConexion(url, servicio), 'sin-conexion');
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (respuesta.status === 503) {
    throw new ErrorServicio(
      (datos && datos.error) ||
        `${capitalizar(servicio.nombre)} está encendido, pero no puede conectarse a la base de datos.`,
      'base-datos'
    );
  }

  if (respuesta.status >= 500) {
    throw new ErrorServicio(
      `${capitalizar(servicio.nombre)} tuvo un error interno (código ${respuesta.status}).` +
        (import.meta.env.DEV ? ' Revisa la terminal donde está corriendo.' : ' Intenta de nuevo más tarde.'),
      'error-interno'
    );
  }

  if (datos === null) {
    throw new ErrorServicio(
      `${capitalizar(servicio.nombre)} respondió algo inesperado (código ${respuesta.status}). ` +
        '¿La URL configurada apunta al servicio correcto?',
      'respuesta-invalida'
    );
  }

  return { ok: respuesta.ok, status: respuesta.status, datos };
}

// Mensaje para mostrar en pantalla a partir de cualquier error capturado
export function mensajeDeError(error, servicio) {
  if (error instanceof ErrorServicio) return error.message;
  return `Ocurrió un error inesperado al comunicarse con ${servicio.nombre}.`;
}
