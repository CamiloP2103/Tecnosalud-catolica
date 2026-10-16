# Tecnosalud Católica

Aplicación SPA construida con React y Vite.

## Estructura

- `src/App.jsx`: estado global y selección de página.
- `src/components/Navbar`: navegación principal.
- `src/components/Layout`: estructura general.
- `src/components/pages/Inicio`: bienvenida y hora de carga.
- `src/components/pages/Nosotros`: información institucional y contador.
- `src/components/pages/Afiliados`: formulario de afiliación.
- `src/components/pages/Acceso`: formulario de acceso.

## Ejecución

### Frontend

```bash
npm install
npm run dev
```

El frontend se inicia normalmente en `http://localhost:5173`.

### Backend

En otra terminal:

```bash
cd backend
npm install
npm start
```

El backend queda disponible en `http://localhost:3001`.

### Tests

Desde la raíz del proyecto:

```bash
npm test
```

Para ejecutar únicamente los tests del backend:

```bash
cd backend
npm test
```

El backend trabaja actualmente en memoria. Los registros nuevos se pierden al reiniciar el servidor porque todavía no hay una base de datos conectada.

## Registro de cambios (rama `juan/limpieza-env`)

1. **Secretos fuera de git.** Se dejaron de versionar los `.env` de `auth-service`, `notification-service` y `registro-service`; cada servicio tiene ahora un `.env.example` con las variables necesarias y su propio `.gitignore`. `auth-service` ya no usa un `JWT_SECRET` por defecto escrito en el código: si falta en el `.env`, no arranca. Como los valores anteriores quedaron en el historial de GitHub, deben rotarse (contraseña de aplicación de Gmail, clave de MySQL y `JWT_SECRET`).
2. **`notification-service` protegido.** Antes cualquiera podía enviar correos desde la cuenta SMTP. Ahora el endpoint `/api/notifications/email` exige la cabecera `x-api-key` con el valor de `NOTIFICATION_API_KEY`, que comparten `auth-service`, `registro-service` y `notification-service` en sus `.env`. Se quitó CORS porque el navegador no debe llamarlo, y el servicio se separó en `src/app.js` (lógica) y `src/index.js` (arranque) para poder probarlo. Las respuestas de error ya no devuelven el detalle interno del fallo SMTP.
