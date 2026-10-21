// Traduce los errores de conexión de MySQL a una respuesta 503 con la causa probable.
// Devuelve null si el error no es de base de datos (se responde 500 como siempre).
const CAUSAS = {
  ECONNREFUSED: 'MySQL no está corriendo o no escucha en DB_HOST/DB_PORT.',
  ETIMEDOUT: 'MySQL no respondió a tiempo (revisa DB_HOST/DB_PORT).',
  ENOTFOUND: 'No se encontró el servidor indicado en DB_HOST.',
  PROTOCOL_CONNECTION_LOST: 'Se perdió la conexión con MySQL.',
  ER_ACCESS_DENIED_ERROR: 'Usuario o contraseña de MySQL incorrectos (revisa DB_USER/DB_PASSWORD).',
  ER_BAD_DB_ERROR: 'La base de datos indicada en DB_NAME no existe (ejecuta el script SQL).',
  ER_NO_SUCH_TABLE: 'Faltan tablas en la base de datos (ejecuta el script SQL).',
};

function errorBaseDatos(error) {
  const causa = CAUSAS[error && error.code];
  if (!causa) return null;
  const mensaje = 'El servicio está encendido, pero no puede usar la base de datos.';
  // El detalle de configuración solo se muestra fuera de producción
  return process.env.NODE_ENV === 'production' ? mensaje : `${mensaje} ${causa}`;
}

export { errorBaseDatos };
