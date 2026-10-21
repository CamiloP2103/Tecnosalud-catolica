const EMAIL_VALIDO = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

// Edad cumplida en una fecha de referencia
function edadEn(fechaNacimiento, hoy) {
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const cumplio = hoy.getMonth() > fechaNacimiento.getMonth()
    || (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() >= fechaNacimiento.getDate());
  if (!cumplio) edad -= 1;
  return edad;
}

// Regla colombiana: el tipo de documento depende de la edad
function errorDocumentoPorEdad(tipo, edad) {
  if (tipo === 'CC' && edad < 18) return 'La cédula de ciudadanía es para mayores de 18 años';
  if (tipo === 'TI' && (edad < 7 || edad > 17)) return 'La tarjeta de identidad es para personas de 7 a 17 años';
  if (tipo === 'RC' && edad >= 7) return 'El registro civil es para menores de 7 años';
  return null;
}

/**
 * Valida y normaliza el cuerpo que envía el formulario Registro.jsx.
 * `catalogos` trae los códigos válidos de cada tabla de db_registro como Set:
 * { tiposDocumento, generos, municipios, eps, regimenes, tiposAfiliacion, parentescos }.
 * Devuelve { errores, datos }. Si errores está vacío, "datos" está listo para guardar.
 */
function validarRegistro(body = {}, catalogos, hoy = new Date()) {
  const errores = {};

  const nombres = texto(body.nombres);
  const apellidos = texto(body.apellidos);
  const tipoDocumento = texto(body.tipoDocumento).toUpperCase();
  const documento = texto(body.documento).toUpperCase();
  const genero = texto(body.genero);
  const correo = texto(body.correo).toLowerCase();
  const telefono = texto(body.telefono);
  const direccion = texto(body.direccion);
  const municipio = texto(body.municipio);
  const tipoAfiliacion = texto(body.tipoAfiliacion);
  const eps = texto(body.eps);
  const regimen = texto(body.regimen);
  const contactoEmergenciaNombre = texto(body.contactoEmergenciaNombre);
  const contactoEmergenciaTelefono = texto(body.contactoEmergenciaTelefono);
  const contactoEmergenciaParentesco = texto(body.contactoEmergenciaParentesco);

  if (!nombres || nombres.length > 100) errores.nombres = 'Los nombres son obligatorios (máximo 100 caracteres)';
  if (!apellidos || apellidos.length > 100) errores.apellidos = 'Los apellidos son obligatorios (máximo 100 caracteres)';
  if (!catalogos.tiposDocumento.has(tipoDocumento)) errores.tipoDocumento = 'El tipo de documento no es válido';
  // Pasaporte y PPT pueden llevar letras; los demás documentos colombianos son numéricos
  const patronDocumento = ['PA', 'PPT', 'CE'].includes(tipoDocumento) ? /^[A-Z0-9]{5,15}$/ : /^\d{5,15}$/;
  if (!patronDocumento.test(documento)) errores.documento = 'El número de documento no tiene un formato válido';
  if (!catalogos.generos.has(genero)) errores.genero = 'El género no es válido';
  if (!EMAIL_VALIDO.test(correo) || correo.length > 120) errores.correo = 'El correo electrónico no es válido';
  if (!/^3\d{9}$|^60\d{8}$|^\d{7}$/.test(telefono)) {
    errores.telefono = 'El teléfono debe ser un celular colombiano (10 dígitos que empiezan por 3) o un fijo';
  }
  if (!direccion || direccion.length > 200) errores.direccion = 'La dirección es obligatoria';
  if (!catalogos.municipios.has(municipio)) errores.municipio = 'Selecciona un municipio de la lista';
  if (!catalogos.tiposAfiliacion.has(tipoAfiliacion)) errores.tipoAfiliacion = 'El tipo de afiliación no es válido';
  if (!catalogos.eps.has(eps)) errores.eps = 'Selecciona una EPS de la lista';
  if (!catalogos.regimenes.has(regimen)) errores.regimen = 'El régimen de salud no es válido';
  if (!contactoEmergenciaNombre) errores.contactoEmergenciaNombre = 'El nombre del contacto de emergencia es obligatorio';
  if (!/^\d{7,10}$/.test(contactoEmergenciaTelefono)) {
    errores.contactoEmergenciaTelefono = 'El teléfono de emergencia debe tener entre 7 y 10 dígitos';
  }
  if (contactoEmergenciaParentesco && !catalogos.parentescos.has(contactoEmergenciaParentesco)) {
    errores.contactoEmergenciaParentesco = 'El parentesco no es válido';
  }
  if (body.aceptaTratamientoDatos !== true) {
    errores.aceptaTratamientoDatos = 'Debes autorizar el tratamiento de datos personales (Ley 1581 de 2012)';
  }

  // Fecha de nacimiento (el formulario manda día, mes y año por separado)
  const dia = Number(body.nacimientoDia);
  const mes = Number(body.nacimientoMes);
  const anio = Number(body.nacimientoAnio);
  const fecha = new Date(anio, mes - 1, dia);
  const fechaValida =
    Number.isInteger(dia) && Number.isInteger(mes) && Number.isInteger(anio) &&
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  if (!fechaValida) {
    errores.fechaNacimiento = 'La fecha de nacimiento no es válida';
  } else if (fecha > hoy || anio < hoy.getFullYear() - 120) {
    errores.fechaNacimiento = 'La fecha de nacimiento está fuera de rango';
  } else if (!errores.tipoDocumento) {
    const errorEdad = errorDocumentoPorEdad(tipoDocumento, edadEn(fecha, hoy));
    if (errorEdad) errores.tipoDocumento = errorEdad;
  }

  const fechaNacimiento = fechaValida
    ? `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    : null;

  return {
    errores,
    datos: {
      nombres, apellidos, tipoDocumento, documento, fechaNacimiento, genero, correo,
      telefono, direccion, municipio, tipoAfiliacion, eps, regimen,
      contactoEmergenciaNombre, contactoEmergenciaTelefono,
      contactoEmergenciaParentesco: contactoEmergenciaParentesco || null,
    },
  };
}

module.exports = { validarRegistro, edadEn, errorDocumentoPorEdad };
