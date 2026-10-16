require('dotenv').config();
const path = require('node:path');
const pool = require('./config/db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3006;
const jwtSecret = process.env.JWT_SECRET;
const encryptionKeyHex = process.env.DOCUMENTOS_ENCRYPTION_KEY || '';
if (!jwtSecret) {
  throw new Error('JWT_SECRET debe configurarse con el mismo valor que usa auth-service.');
}
if (!/^[a-f0-9]{64}$/i.test(encryptionKeyHex)) {
  throw new Error('DOCUMENTOS_ENCRYPTION_KEY debe ser una clave aleatoria de 32 bytes codificada en hexadecimal.');
}

// La carpeta de almacenamiento se resuelve desde la carpeta del servicio, sin importar desde dónde se ejecute
const storageDir = path.resolve(path.join(__dirname, '..'), process.env.DOCUMENTOS_STORAGE_DIR || 'storage');
const app = createApp({
  pool,
  jwtSecret,
  encryptionKey: Buffer.from(encryptionKeyHex, 'hex'),
  storageDir,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
});

app.listen(PORT, () => {
  console.log(`Microservicio de Documentos activo en el puerto ${PORT} (/api/documentos)`);
});
