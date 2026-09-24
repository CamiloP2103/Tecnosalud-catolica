import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = 3001;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let siguienteId = 6;

let usuarios = [
  { id: 1, tipoDoc: 'CC', documento: '72000607', email: 'caenjiro@gmail.com', contrasena: '123456', nombre: 'Carlos Jiménez' },
  { id: 2, tipoDoc: 'CC', documento: '1020304050', email: 'carlos.jimenez@tecnosalud.com.co', contrasena: 'admin2026', nombre: 'Carlos Admin' },
  { id: 3, tipoDoc: 'CE', documento: '52148963', email: 'maria.gomez@clinicaejemplo.com', contrasena: 'maria2026', nombre: 'María Gómez' },
  { id: 4, tipoDoc: 'TI', documento: '80123456', email: 'soporte.tecnosalud@gmail.com', contrasena: 'soporte123', nombre: 'Soporte Técnico' },
  { id: 5, tipoDoc: 'PA', documento: '19456789', email: 'afiliados.bogota@redsalud.com', contrasena: 'afiliados2026', nombre: 'Afiliaciones Bogotá' },
];

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ estado: 'ok' }));

app.post('/api/usuarios/registro', (req, res) => {
  const datos = req.body || {};
  const errores = {};
  const nombres = typeof datos.nombres === 'string' ? datos.nombres.trim() : '';
  const apellidos = typeof datos.apellidos === 'string' ? datos.apellidos.trim() : '';
  const email = typeof datos.correo === 'string' ? datos.correo.trim().toLowerCase() : '';
  const documento = typeof datos.documento === 'string' ? datos.documento.trim() : '';

  if (!nombres) errores.nombres = 'Los nombres son obligatorios';
  if (!apellidos) errores.apellidos = 'Los apellidos son obligatorios';
  if (!datos.tipoDocumento) errores.tipoDocumento = 'El tipo de documento es obligatorio';
  if (!documento) errores.documento = 'El documento es obligatorio';
  if (!EMAIL_VALIDO.test(email)) errores.correo = 'El correo electrónico no es válido';
  if (!/^\d{7,10}$/.test(String(datos.telefono || ''))) errores.telefono = 'El teléfono debe tener entre 7 y 10 dígitos';
  if (!datos.aceptaTratamientoDatos) errores.aceptaTratamientoDatos = 'Debes aceptar el tratamiento de datos';

  if (Object.keys(errores).length > 0) return res.status(400).json({ errores });
  if (usuarios.some((usuario) => usuario.email === email || usuario.documento === documento)) {
    return res.status(409).json({ error: 'El correo o documento ya está registrado' });
  }

  const nuevoUsuario = {
    id: siguienteId++,
    tipoDoc: datos.tipoDocumento,
    documento,
    email,
    nombre: `${nombres} ${apellidos}`,
    datos: { ...datos, correo: email },
  };
  usuarios.push({ ...nuevoUsuario, contrasena: 'pendiente' });
  return res.status(201).json({ id: nuevoUsuario.id, email: nuevoUsuario.email, nombre: nuevoUsuario.nombre });
});

app.post('/api/usuarios/acceso', (req, res) => {
  const email = typeof req.body?.usuario === 'string' ? req.body.usuario.trim().toLowerCase() : '';
  const contrasena = typeof req.body?.contrasena === 'string' ? req.body.contrasena.trim() : '';
  const usuario = usuarios.find((item) => item.email.toLowerCase() === email);

  if (!usuario) return res.status(401).json({ error: 'El correo electrónico no se encuentra registrado en el sistema.' });
  if (usuario.contrasena !== contrasena) return res.status(401).json({ error: 'La contraseña ingresada es incorrecta.' });

  const { contrasena: _, datos: __, ...usuarioSeguro } = usuario;
  return res.json(usuarioSeguro);
});

export function resetUsuarios() {
  usuarios = usuarios.filter((usuario) => usuario.id <= 5);
  siguienteId = 6;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => console.log(`Backend Tecnosalud corriendo en http://localhost:${PORT}`));
}

export default app;