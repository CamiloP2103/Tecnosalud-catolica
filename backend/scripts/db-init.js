// Crea las bases de datos de los microservicios ejecutando sus scripts SQL.
// Usa los datos de conexión de cada .env (sirve para MySQL local o Azure Database for MySQL).
//
//   cd backend
//   npm run db:init              -> db_auth, db_registro, db_farmacias, db_documentos, db_notificaciones y db_citas
//   npm run db:init -- auth      -> solo db_auth (también: registro, farmacias, documentos, notificaciones, citas)

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

const RAIZ = path.join(__dirname, '..');

const BASES = {
  auth: {
    servicio: 'auth-service',
    env: path.join(RAIZ, 'services/auth-service/.env'),
    script: path.join(RAIZ, 'Database/Script_Creacion_BasededatosAutenticacion.sql'),
    base: 'db_auth',
    verificacion: 'SELECT COUNT(*) AS total FROM db_auth.usuarios',
    descripcion: 'usuarios de prueba',
  },
  registro: {
    servicio: 'registro-service',
    env: path.join(RAIZ, 'services/registro-service/.env'),
    script: path.join(RAIZ, 'services/registro-service/database/Script_Creacion_BasedeDatosRegistro.sql'),
    base: 'db_registro',
    verificacion: `SELECT CONCAT((SELECT COUNT(*) FROM db_registro.departamentos), ' departamentos, ',
                          (SELECT COUNT(*) FROM db_registro.municipios), ' municipios, ',
                          (SELECT COUNT(*) FROM db_registro.eps), ' EPS y ',
                          (SELECT COUNT(*) FROM db_registro.afiliados)) AS total`,
    descripcion: 'afiliados registrados',
    // Migración: la primera versión de `afiliados` guardaba ciudad y EPS como texto libre. La nueva usa
    // llaves foráneas a los catálogos. Si existe la tabla vieja y está vacía, se reemplaza; si tiene datos,
    // se detiene para no perder información.
    antes: async (conexion) => {
      const [columnas] = await conexion.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = 'db_registro' AND table_name = 'afiliados' AND column_name = 'ciudad'"
      );
      if (columnas.length === 0) return;
      const [[{ total }]] = await conexion.query('SELECT COUNT(*) AS total FROM db_registro.afiliados');
      if (Number(total) > 0) {
        throw new Error(`db_registro.afiliados tiene ${total} registros con la estructura anterior. Migra esos datos a mano antes de continuar (ver LEEME de registro-service).`);
      }
      console.log('  Migración: se reemplaza la tabla afiliados vacía de la versión anterior por la nueva con catálogos.');
      await conexion.query('DROP TABLE db_registro.afiliados');
    },
  },
  farmacias: {
    servicio: 'farmacias-service',
    env: path.join(RAIZ, 'services/farmacias-service/.env'),
    script: path.join(RAIZ, 'services/farmacias-service/database/Script_Creacion_BasedeDatosFarmacias.sql'),
    base: 'db_farmacias',
    verificacion: `SELECT CONCAT((SELECT COUNT(*) FROM db_farmacias.medicamentos), ' medicamentos, ',
                          (SELECT COUNT(*) FROM db_farmacias.farmacias), ' farmacias y ',
                          (SELECT COUNT(*) FROM db_farmacias.inventario)) AS total`,
    descripcion: 'registros de inventario',
  },
  documentos: {
    servicio: 'documentos-service',
    env: path.join(RAIZ, 'services/documentos-service/.env'),
    script: path.join(RAIZ, 'services/documentos-service/database/Script_Creacion_BasedeDatosDocumentos.sql'),
    base: 'db_documentos',
    verificacion: 'SELECT COUNT(*) AS total FROM db_documentos.documentos',
    descripcion: 'documentos guardados',
  },
  notificaciones: {
    servicio: 'notification-service',
    env: path.join(RAIZ, 'services/notification-service/.env'),
    script: path.join(RAIZ, 'services/notification-service/database/Script_Creacion_BasedeDatosNotificaciones.sql'),
    base: 'db_notificaciones',
    verificacion: 'SELECT COUNT(*) AS total FROM db_notificaciones.notificaciones',
    descripcion: 'correos registrados',
  },
  citas: {
    servicio: 'citas-service',
    env: path.join(RAIZ, 'services/citas-service/.env'),
    script: path.join(RAIZ, 'services/citas-service/database/Script_Creacion_BasedeDatosCitas.sql'),
    base: 'db_citas',
    verificacion: `SELECT CONCAT((SELECT COUNT(*) FROM db_citas.especialidades), ' especialidades, ',
                          (SELECT COUNT(*) FROM db_citas.medicos), ' médicos, ',
                          (SELECT COUNT(*) FROM db_citas.horarios), ' horarios y ',
                          (SELECT COUNT(*) FROM db_citas.citas)) AS total`,
    descripcion: 'citas',
  },
};

const CAUSAS = {
  ECONNREFUSED: 'No hay un MySQL escuchando en DB_HOST/DB_PORT.',
  ETIMEDOUT: 'El servidor no respondió. En Azure, revisa que tu IP esté agregada en Redes (firewall).',
  ENOTFOUND: 'No existe el servidor indicado en DB_HOST. Revisa el nombre (…mysql.database.azure.com).',
  ER_ACCESS_DENIED_ERROR: 'Usuario o contraseña incorrectos (DB_USER / DB_PASSWORD).',
  HANDSHAKE_SSL_ERROR: 'Falló la conexión segura. En Azure usa DB_SSL=true.',
  ER_SECURE_TRANSPORT_REQUIRED: 'El servidor exige conexión segura: pon DB_SSL=true en el .env.',
};

function explicar(error) {
  return CAUSAS[error.code] || error.message;
}

function leerEnv(config) {
  if (!fs.existsSync(config.env)) {
    throw new Error(`No existe ${path.relative(RAIZ, config.env)}. Cópialo desde .env.example y completa los datos.`);
  }
  const env = dotenv.parse(fs.readFileSync(config.env));
  const faltantes = ['DB_HOST', 'DB_USER'].filter((clave) => !env[clave]);
  if (faltantes.length > 0) {
    throw new Error(`Faltan ${faltantes.join(', ')} en ${path.relative(RAIZ, config.env)}.`);
  }
  return env;
}

async function inicializar(nombre) {
  const config = BASES[nombre];
  console.log(`\n=== ${config.base} (${config.servicio}) ===`);

  const env = leerEnv(config);
  if (env.DB_NAME && env.DB_NAME !== config.base) {
    console.warn(`  Aviso: DB_NAME=${env.DB_NAME} en el .env, pero el script crea "${config.base}". Ajusta DB_NAME.`);
  }

  console.log(`  Conectando a ${env.DB_HOST}:${env.DB_PORT || 3306} como ${env.DB_USER} (SSL ${env.DB_SSL === 'true' ? 'sí' : 'no'})...`);
  let conexion;
  try {
    conexion = await mysql.createConnection({
      host: env.DB_HOST,
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER,
      password: env.DB_PASSWORD || '',
      ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
      multipleStatements: true,
      connectTimeout: 20000,
    });
  } catch (error) {
    throw new Error(`No se pudo conectar: ${explicar(error)}`);
  }

  try {
    if (config.antes) await config.antes(conexion);
    console.log(`  Ejecutando ${path.relative(RAIZ, config.script)}...`);
    await conexion.query(fs.readFileSync(config.script, 'utf8'));
    const [[{ total }]] = await conexion.query(config.verificacion);
    console.log(`  Listo: ${config.base} creada (${total} ${config.descripcion}).`);
  } catch (error) {
    throw new Error(`Error ejecutando el script: ${explicar(error)}`);
  } finally {
    await conexion.end();
  }
}

async function main() {
  const pedidas = process.argv.slice(2);
  const nombres = pedidas.length > 0 ? pedidas : Object.keys(BASES);
  const desconocidas = nombres.filter((n) => !BASES[n]);
  if (desconocidas.length > 0) {
    console.error(`Opciones válidas: ${Object.keys(BASES).join(', ')}. Recibido: ${desconocidas.join(', ')}`);
    process.exit(1);
  }

  let fallos = 0;
  for (const nombre of nombres) {
    try {
      await inicializar(nombre);
    } catch (error) {
      fallos += 1;
      console.error(`  ERROR: ${error.message}`);
    }
  }

  if (fallos > 0) {
    console.error(`\n${fallos} base(s) no se pudieron crear. Corrige el error y vuelve a ejecutar: el script es seguro de repetir.`);
    process.exit(1);
  }
  console.log('\nBases de datos listas. Reinicia los microservicios para que usen las bases.');
}

main();
