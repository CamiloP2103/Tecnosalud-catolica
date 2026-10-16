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
3. **`auth-service` endurecido.** Se separó en `src/app.js` (rutas), `src/plantillas.js` (correos) y `src/limitador.js`, con `src/index.js` solo para arrancar. Cambios de seguridad:
   - Login: después de 5 intentos fallidos por IP y correo responde `429` durante 15 minutos (antes se podían probar contraseñas sin límite y cada fallo enviaba un correo). Ya no avisa que una cuenta está inactiva si la contraseña es incorrecta.
   - Recuperar contraseña: responde lo mismo exista o no el correo, así que ya no permite averiguar qué cuentas están registradas. También está limitado a 5 solicitudes por IP cada 15 minutos.
   - Nueva contraseña: mínimo 8 caracteres en el backend y en `RestablecerClave.jsx` (antes 6 y solo en el frontend).
   - El nombre del usuario y la IP se escapan antes de meterlos en el HTML del correo; se usa `req.ip` en lugar de la cabecera `x-forwarded-for`, que el cliente puede falsificar.
   - CORS restringido a `FRONTEND_URL` (antes `*`).
4. **Pruebas para los tres microservicios** (antes no tenían ninguna). Cada servicio tiene ahora `tests/`, `vitest.config.mjs` y el script `npm test`, con Vitest y Supertest. La base de datos y el envío de correo se simulan, así que **no hace falta MySQL ni SMTP** para correrlas. Se cubren: login (credenciales correctas e incorrectas, cuenta inactiva, límite de intentos, JWT), recuperación y restablecimiento de contraseña, la clave del `notification-service`, la validación del formulario de afiliación, los duplicados y el escapado de HTML. En total: auth 15, notification 6 y registro 7. Para poder probarlo, `registro-service` también se separó en `src/app.js` y `src/index.js`.
5. **Se eliminó `backend/server.js`**, el servidor viejo de pruebas en memoria (puerto 3001), junto con su prueba `backend/tests/server.test.js`. El frontend ya no lo usaba, tenía contraseñas en texto plano y no tenía relación con los microservicios. Solo se borró en esta rama; en `main` sigue existiendo. `backend/package.json` quedó como atajo: `npm run install:all` instala los tres servicios y `npm test` corre sus pruebas. También se quitó `supertest` del `package.json` de la raíz, porque solo lo usaba esa prueba.
6. **ESLint funciona.** Se agregó `.eslintrc.cjs` con `eslint:recommended` y las reglas de React; antes `npm run lint` fallaba por falta de configuración. Se corrigieron los 4 errores (comillas sin escapar en `Medicamentos.jsx` y `ServiciosSalud.jsx`) y las 4 advertencias: en `Acceso.jsx` se quitaron constantes y un estado que no se usaban, y en `RutaProtegida.jsx` un `import React` innecesario. `npm run lint` ya termina sin errores ni advertencias.
7. **Dependencias sin vulnerabilidades.** `npm audit` marca 0 en los cuatro paquetes. Antes había 7 en el frontend (2 críticas) y 3 o 4 altas en cada microservicio.
   - Frontend: `vite` 5 → 8, `@vitejs/plugin-react` 4 → 6, `vitest` 1 → 5, `jsdom` 22 → 30 y `@testing-library/react` 14 → 16. En `src/test/setup.js` se cambió la asignación directa de `localStorage` por `vi.stubGlobal`, porque el `jsdom` nuevo no permite sobrescribirlo.
   - Microservicios: se quitó `nodemon` (traía `braces` vulnerable) y `npm run dev` usa ahora `node --watch`, que viene con Node. `nodemailer` pasó de 6 a 10 en `notification-service`.
8. **URLs del frontend configurables y código sin uso eliminado.** `Registro.jsx` lee ahora `VITE_API_REGISTRO_URL`, igual que `Acceso` usa `VITE_API_AUTH_URL` (antes la URL estaba escrita a mano). Se agregó un `.env.example` en la raíz con ambas variables. Se eliminó `src/Utils/ApiClient.js`, que nadie importaba, y se ordenó el `.gitignore`, que tenía entradas repetidas.
