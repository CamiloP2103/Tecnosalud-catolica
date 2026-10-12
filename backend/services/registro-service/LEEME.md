# registro-service (puerto 3003)
Microservicio de Registro: valida el formulario de afiliación, lo guarda en `db_registro.afiliados`
y pide un correo de confirmación al notification-service (puerto 3005).

Endpoints:
- GET  /api/registro/health
- POST /api/registro   (JSON del formulario Registro.jsx)

Arranque: `npm install` y luego `npm run dev`. Necesita un archivo `.env` (copia de `.env.example`).
