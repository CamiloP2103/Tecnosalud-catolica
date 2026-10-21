// Crea un usuario en db_auth usando la conexión de services/auth-service/.env.
//
//   cd backend
//   npm run usuario:crear -- --email ana@correo.com --nombre "Ana Pérez" --doc 1020304050 --tipo CC --rol PACIENTE
//
// Por seguridad la contraseña NO se pasa como argumento: se genera una aleatoria que nadie conoce y el
// usuario define la suya con "¿Olvidaste tu contraseña?" en la página (le llega un enlace a su correo).
// Si se necesita una clave inicial conocida, se puede pasar en la variable de entorno NUEVA_CLAVE.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

const ROLES = ['PACIENTE', 'MEDICO', 'ADMIN'];
const TIPOS_DOC = ['CC', 'TI', 'CE', 'PA'];
const EMAIL_VALIDO = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const DOCUMENTO_VALIDO = /^[A-Za-z0-9.-]{5,20}$/; // el mismo formato que exige documentos-service

function leerArgumentos(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function validar(args) {
  const errores = [];
  const datos = {
    email: String(args.email || '').trim().toLowerCase(),
    nombre: String(args.nombre || '').trim(),
    documento: String(args.doc || '').trim(),
    tipoDoc: String(args.tipo || 'CC').trim().toUpperCase(),
    rol: String(args.rol || 'PACIENTE').trim().toUpperCase(),
  };
  if (!EMAIL_VALIDO.test(datos.email)) errores.push('--email no es un correo válido');
  if (datos.nombre.length < 3 || datos.nombre.length > 100) errores.push('--nombre debe tener entre 3 y 100 caracteres');
  if (!DOCUMENTO_VALIDO.test(datos.documento)) errores.push('--doc debe tener entre 5 y 20 letras, números, puntos o guiones');
  if (!TIPOS_DOC.includes(datos.tipoDoc)) errores.push(`--tipo debe ser uno de: ${TIPOS_DOC.join(', ')}`);
  if (!ROLES.includes(datos.rol)) errores.push(`--rol debe ser uno de: ${ROLES.join(', ')}`);
  return { errores, datos };
}

async function main() {
  const { errores, datos } = validar(leerArgumentos(process.argv.slice(2)));
  if (errores.length > 0) {
    console.error(`No se creó el usuario:\n  - ${errores.join('\n  - ')}`);
    console.error('\nEjemplo: npm run usuario:crear -- --email ana@correo.com --nombre "Ana Pérez" --doc 1020304050 --tipo CC --rol PACIENTE');
    process.exit(1);
  }

  const rutaEnv = path.join(__dirname, '..', 'services/auth-service/.env');
  if (!fs.existsSync(rutaEnv)) {
    console.error('No existe services/auth-service/.env. Configúralo primero (ver README).');
    process.exit(1);
  }
  const env = dotenv.parse(fs.readFileSync(rutaEnv));

  const claveConocida = Boolean(process.env.NUEVA_CLAVE);
  const clave = process.env.NUEVA_CLAVE || crypto.randomBytes(24).toString('base64url');
  if (claveConocida && clave.length < 8) {
    console.error('NUEVA_CLAVE debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const conexion = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'db_auth',
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    connectTimeout: 20000,
  });

  try {
    const [roles] = await conexion.query('SELECT id FROM roles WHERE nombre = ?', [datos.rol]);
    if (roles.length === 0) throw new Error(`El rol ${datos.rol} no existe en db_auth (¿ejecutaste npm run db:init?).`);

    const [existentes] = await conexion.query(
      'SELECT email, tipo_doc, documento FROM usuarios WHERE email = ? OR (tipo_doc = ? AND documento = ?)',
      [datos.email, datos.tipoDoc, datos.documento]
    );
    if (existentes.length > 0) {
      const motivo = existentes[0].email === datos.email ? `el correo ${datos.email}` : `el documento ${datos.tipoDoc} ${datos.documento}`;
      throw new Error(`Ya existe un usuario con ${motivo}. No se modificó nada.`);
    }

    const hash = await bcrypt.hash(clave, 10);
    const [resultado] = await conexion.query(
      `INSERT INTO usuarios (tipo_doc, documento, email, contrasena_hash, nombre, rol_id, activo)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [datos.tipoDoc, datos.documento, datos.email, hash, datos.nombre, roles[0].id]
    );

    console.log(`Usuario creado (id ${resultado.insertId}): ${datos.nombre} <${datos.email}>, ${datos.tipoDoc} ${datos.documento}, rol ${datos.rol}.`);
    if (claveConocida) {
      console.log('Contraseña inicial: la que pasaste en NUEVA_CLAVE.');
    } else {
      console.log('Contraseña: aleatoria y desconocida. Para definirla, en la página ve a Acceso → "¿Olvidaste tu contraseña?"');
      console.log(`e ingresa ${datos.email}; llegará un enlace válido por 15 minutos.`);
    }
  } finally {
    await conexion.end();
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
