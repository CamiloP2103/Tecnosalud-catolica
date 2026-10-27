const EMAIL_VALIDO = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TIPOS_DOC = ['CC', 'TI', 'CE', 'PA', 'RC', 'PPT'];
const GENEROS = ['M', 'F', 'OTRO', 'Otro'];
const TIPOS_AFILIACION = ['PACIENTE', 'PROFESIONAL', 'EMPRESA', 'paciente', 'profesional', 'empresa'];
const REGIMENES = ['CONTRIBUTIVO', 'SUBSIDIADO', 'ESPECIAL', 'PARTICULAR', 'contributivo', 'subsidiado', 'especial', 'particular'];
const PARENTESCOS = ['conyuge', 'padre', 'madre', 'hijo', 'hermano', 'abuelo', 'tio', 'amigo', 'otro'];

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Valida y normaliza el cuerpo que envía el formulario Registro.jsx de forma estricta.
 */
function validarRegistro(body = {}) {
  const errores = {};

  const nombres = texto(body.nombres);
  const apellidos = texto(body.apellidos);
  const tipoDocumentoCodigo = texto(body.tipoDocumentoCodigo);
  const documento = texto(body.documento);
  const generoCodigo = texto(body.generoCodigo);
  const correo = texto(body.correo).toLowerCase();
  const telefono = texto(body.telefono);
  const direccion = texto(body.direccion);
  const municipioCodigo = texto(body.municipioCodigo);
  const tipoAfiliacionCodigo = texto(body.tipoAfiliacionCodigo);
  const epsCodigo = texto(body.epsCodigo);
  const regimenCodigo = texto(body.regimenCodigo);
  const salario = texto(body.salario);
  const contactoEmergenciaNombre = texto(body.contactoEmergenciaNombre);
  const contactoEmergenciaTelefono = texto(body.contactoEmergenciaTelefono);
  const contactoEmergenciaParentescoCodigo = texto(body.contactoEmergenciaParentescoCodigo);

  if (!nombres) errores.nombres = 'Los nombres son obligatorios';
  if (!apellidos) errores.apellidos = 'Los apellidos son obligatorios';
  if (!TIPOS_DOC.includes(tipoDocumentoCodigo)) errores.tipoDocumento = 'El tipo de documento no es válido';
  if (!/^\d{5,15}$/.test(documento)) errores.documento = 'El documento debe tener entre 5 y 15 dígitos';
  if (!GENEROS.includes(generoCodigo)) errores.genero = 'El género no es válido';
  if (!EMAIL_VALIDO.test(correo)) errores.correo = 'El correo electrónico no es válido';
  if (!/^\d{7,10}$/.test(telefono)) errores.telefono = 'El teléfono debe tener entre 7 y 10 dígitos';
  if (!direccion) errores.direccion = 'La dirección es obligatoria';
  
  // --- VALIDACIÓN ESTRICTA DE CÓDIGOS (Evita nombres largos y nulos) ---
  // Los códigos cortos (como los municipios DANE) suelen ser numéricos de 5 dígitos o strings cortos.
  // Si viene vacío, nulo, o mide más de 15 caracteres (lo que indica que es un nombre largo), rechaza el registro.
  if (!municipioCodigo || municipioCodigo.length > 15) {
    errores.municipioCodigo = 'Debes seleccionar una ciudad o municipio válido.';
  }

  if (!epsCodigo || epsCodigo.length > 30) {
    errores.epsCodigo = 'Debes seleccionar una EPS válida.';
  }

  if (!TIPOS_AFILIACION.includes(tipoAfiliacionCodigo)) {
    errores.tipoAfiliacion = 'El tipo de afiliación no es válido';
  }

  if (!REGIMENES.includes(regimenCodigo)) {
    errores.regimen = 'El régimen de salud no es válido';
  }

  // Validación de salario condicional si el régimen es contributivo
  const esContributivo = regimenCodigo.toUpperCase() === 'CONTRIBUTIVO';
  if (esContributivo && (!salario || isNaN(Number(salario)))) {
    errores.salario = 'El salario base es obligatorio para el régimen contributivo';
  }

  if (!contactoEmergenciaNombre) errores.contactoEmergenciaNombre = 'El nombre del contacto de emergencia es obligatorio';
  if (!/^\d{7,10}$/.test(contactoEmergenciaTelefono)) {
    errores.contactoEmergenciaTelefono = 'El teléfono de emergencia debe tener entre 7 y 10 dígitos';
  }
  if (!PARENTESCOS.includes(contactoEmergenciaParentescoCodigo.toLowerCase())) {
    errores.contactoEmergenciaParentesco = 'El parentesco de emergencia no es válido';
  }

  if (body.aceptaTratamientoDatos !== true) {
    errores.aceptaTratamientoDatos = 'Debes autorizar el tratamiento de datos personales (Ley 1581 de 2012)';
  }

  // Fecha de nacimiento
  let fechaNacimiento = body.fechaNacimiento;
  if (!fechaNacimiento) {
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
    } else {
      fechaNacimiento = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
  }

  return {
    errores,
    datos: {
      nombres, 
      apellidos, 
      tipoDocumentoCodigo, 
      documento, 
      fechaNacimiento, 
      generoCodigo, 
      correo,
      telefono, 
      direccion, 
      municipioCodigo, 
      tipoAfiliacionCodigo, 
      epsCodigo, 
      regimenCodigo, 
      salario: esContributivo ? Number(salario) : null,
      contactoEmergenciaNombre, 
      contactoEmergenciaTelefono,
      contactoEmergenciaParentescoCodigo,
    },
  };
}

module.exports = { validarRegistro };