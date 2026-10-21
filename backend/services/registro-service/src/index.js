require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const { validarRegistro } = require('./validators');
const { DEPARTAMENTOS, EPS } = require('./data/catalogos');


const app = express();
const PORT = process.env.PORT || 3004;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Agregamos la URL del auth-service para la comunicación interna
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3002'; 

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '100kb' }));

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ servicio: 'registro-service', estado: 'activo', puerto: PORT });
});

// Catálogos del formulario (antes estaban escritos en el front)

// GET /api/registro/departamentos -> [{ id, nombre, ciudades: [{ id, nombre }] }]
router.get('/departamentos', (req, res) => {
  res.json(DEPARTAMENTOS);
});

// GET /api/registro/eps -> [{ id, nombre }]
router.get('/eps', (req, res) => {
  res.json(EPS);
});

router.post('/', async (req, res) => {
  const { errores, datos } = validarRegistro(req.body);
  if (Object.keys(errores).length > 0) {
    return res.status(400).json({ errores });
  }

  const mapaRoles = { paciente: 1, profesional: 2, empresa: 3 };
  const rolId = mapaRoles[datos.tipoAfiliacion] || 1;

  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    // PASO 1: Guardar en la base de datos de registro (db_registro)
    const [resultadoAfiliado] = await conexion.execute(
      `INSERT INTO afiliados
        (nombres, apellidos, tipo_doc, documento, fecha_nacimiento, genero, correo, telefono,
         direccion, ciudad, tipo_afiliacion, eps, regimen,
         contacto_emergencia_nombre, contacto_emergencia_telefono, acepta_tratamiento_datos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        datos.nombres, datos.apellidos, datos.tipoDocumento, datos.documento, datos.fechaNacimiento,
        datos.genero, datos.correo, datos.telefono, datos.direccion, datos.ciudad,
        datos.tipoAfiliacion, datos.eps, datos.regimen,
        datos.contactoEmergenciaNombre, datos.contactoEmergenciaTelefono,
      ]
    );

    // PASO 2: Llamar al microservicio de autenticación para que guarde en db_auth
    const respuestaAuth = await fetch(`${AUTH_SERVICE_URL}/api/auth/registro-interno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_doc: datos.tipoDocumento,
        documento: datos.documento,
        email: datos.correo,
        nombre: `${datos.nombres} ${datos.apellidos}`,
        rol_id: rolId
      })
    });

    if (!respuestaAuth.ok) {
      throw new Error('Fallo al comunicarse con el auth-service para crear el usuario.');
    }

    // PASO 3: Si ambas cosas salieron bien, confirmamos la transacción local
    await conexion.commit();

    return res.status(201).json({
      id: resultadoAfiliado.insertId,
      email: datos.correo,
      nombre: `${datos.nombres} ${datos.apellidos}`,
      mensaje: 'Registro exitoso. Revisa tu correo para activar la cuenta.',
    });

  } catch (error) {
    // Si la BD falla o el fetch al auth-service falla, cancelamos el insert en afiliados
    await conexion.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El correo o el documento ya está registrado en el sistema.' });
    }
    console.error('[registro-service] Error en POST /api/registro:', error);
    return res.status(500).json({ error: 'Error interno en el servidor.' });
  } finally {
    conexion.release();
  }
});

app.use('/api/registro', router);

app.listen(PORT, () => {
  console.log(`Microservicio de Registro activo en el puerto ${PORT} (/api/registro)`);
});