# registro-service (puerto 3004)
Microservicio de Registro: valida el formulario de afiliación, lo guarda en `db_registro.afiliados`
y pide un correo de confirmación al notification-service (puerto 3005).

Endpoints:
- GET  /api/registro/health
- POST /api/registro   (JSON del formulario Registro.jsx)

Arranque: `npm install` y luego `npm run dev`. Necesita un archivo `.env` (copia de `.env.example`).

Catálogos del formulario (datos en `src/data/catalogos.js`):
- GET  /api/registro/departamentos   -> [{ id, nombre, ciudades: [{ id, nombre }] }]
- GET  /api/registro/eps             -> [{ id, nombre }]
El POST valida que `ciudad` y `eps` existan en esos catálogos.
