const { CIUDADES_VALIDAS, EPS_VALIDAS } = require('./data/catalogos');

const EMAIL_VALIDO = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TIPOS_DOC = ['CC', 'TI', 'CE', 'PA'];
const GENEROS = ['M', 'F', 'Otro'];
const TIPOS_AFILIACION = ['paciente', 'profesional', 'empresa'];
const REGIMENES = ['contributivo', 'subsidiado', 'especial', 'particular'];

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Valida y normaliza el cuerpo que envía el formulario Registro.jsx.
 * Devuelve { errores, datos }. Si errores está vacío, "datos" está listo para guardar.
 */
function validarRegistro(body = {}) {
  const errores = {};

  const nombres = texto(body.nombres);
  const apellidos = texto(body.apellidos);
  const tipoDocumento = texto(body.tipoDocumento);
  const documento = texto(body.documento);
  const genero = texto(body.genero);
  const correo = texto(body.correo).toLowerCase();
  const telefono = texto(body.telefono);
  const direccion = texto(body.direccion);
  const ciudad = texto(body.ciudad);
  const tipoAfiliacion = texto(body.tipoAfiliacion);
  const eps = texto(body.eps);
  const regimen = texto(body.regimen);
  const contactoEmergenciaNombre = texto(body.contactoEmergenciaNombre);
  const contactoEmergenciaTelefono = texto(body.contactoEmergenciaTelefono);

  if (!nombres) errores.nombres = 'Los nombres son obligatorios';
  if (!apellidos) errores.apellidos = 'Los apellidos son obligatorios';
  if (!TIPOS_DOC.includes(tipoDocumento)) errores.tipoDocumento = 'El tipo de documento no es válido';
  if (!/^\d{5,15}$/.test(documento)) errores.documento = 'El documento debe tener entre 5 y 15 dígitos';
  if (!GENEROS.includes(genero)) errores.genero = 'El género no es válido';
  if (!EMAIL_VALIDO.test(correo)) errores.correo = 'El correo electrónico no es válido';
  if (!/^\d{7,10}$/.test(telefono)) errores.telefono = 'El teléfono debe tener entre 7 y 10 dígitos';
  if (!direccion) errores.direccion = 'La dirección es obligatoria';
  if (!CIUDADES_VALIDAS.has(ciudad)) errores.ciudad = 'La ciudad seleccionada no es válida';
  if (!TIPOS_AFILIACION.includes(tipoAfiliacion)) errores.tipoAfiliacion = 'El tipo de afiliación no es válido';
  if (!EPS_VALIDAS.has(eps)) errores.eps = 'La EPS seleccionada no es válida';
  if (!REGIMENES.includes(regimen)) errores.regimen = 'El régimen de salud no es válido';
  if (!contactoEmergenciaNombre) errores.contactoEmergenciaNombre = 'El nombre del contacto de emergencia es obligatorio';
  if (!/^\d{7,10}$/.test(contactoEmergenciaTelefono)) {
    errores.contactoEmergenciaTelefono = 'El teléfono de emergencia debe tener entre 7 y 10 dígitos';
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
  const hoy = new Date();
  if (!fechaValida) {
    errores.fechaNacimiento = 'La fecha de nacimiento no es válida';
  } else if (fecha > hoy || anio < hoy.getFullYear() - 120) {
    errores.fechaNacimiento = 'La fecha de nacimiento está fuera de rango';
  }

  const fechaNacimiento = fechaValida
    ? `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    : null;

  return {
    errores,
    datos: {
      nombres, apellidos, tipoDocumento, documento, fechaNacimiento, genero, correo,
      telefono, direccion, ciudad, tipoAfiliacion, eps, regimen,
      contactoEmergenciaNombre, contactoEmergenciaTelefono,
    },
  };
}

module.exports = { validarRegistro };
