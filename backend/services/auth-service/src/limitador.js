// Limitador de intentos en memoria: bloquea una clave (IP, correo...) tras `maximo` intentos en `ventanaMs`
function crearLimitador({ maximo, ventanaMs }) {
  const intentos = new Map();

  function vigente(clave) {
    const registro = intentos.get(clave);
    if (registro && Date.now() > registro.expira) {
      intentos.delete(clave);
      return null;
    }
    return registro;
  }

  return {
    bloqueado(clave) {
      const registro = vigente(clave);
      return Boolean(registro && registro.cuenta >= maximo);
    },
    registrar(clave) {
      const registro = vigente(clave) || { cuenta: 0, expira: Date.now() + ventanaMs };
      registro.cuenta += 1;
      intentos.set(clave, registro);
    },
    limpiar(clave) {
      intentos.delete(clave);
    },
  };
}

module.exports = { crearLimitador };
