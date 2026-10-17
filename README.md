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

### Iniciar toda la aplicación (recomendado)

Desde la raíz del proyecto, instala las dependencias de todos los servicios la primera vez:

```bash
npm install
npm install --prefix backend
npm install --prefix backend/services/auth-service
npm install --prefix backend/services/registro-service
npm install --prefix backend/services/citas-service
npm install --prefix backend/services/notification-service
```

Antes de iniciar, asegúrate de que MySQL esté activo y configura `backend/services/auth-service/.env` con sus credenciales. Luego, desde la raíz del proyecto, inicia el frontend y los servicios con:

```bash
npm run dev:all
```

El comando inicia todos los procesos de desarrollo:

- frontend: `http://localhost:5173`
- backend de registro: puerto `3001`
- autenticación: puerto `3002`
- registro (catálogos y afiliación): puerto `3004`
- citas médicas: puerto `3003`
- notificaciones: puerto `3005`

Detén con `Ctrl+C` los servidores iniciados en otras terminales antes de ejecutar el comando para evitar conflictos de puertos. Mantén abierta la terminal de `npm run dev:all` mientras uses la aplicación; `Ctrl+C` detiene todos los servicios. El envío de correos requiere configurar las credenciales SMTP en `backend/services/notification-service/.env`.

Las citas y los registros del backend de registro se guardan en memoria y se pierden al reiniciar sus servicios. El servicio de autenticación usa MySQL. La cuenta de demostración `doctor@tecnosalud.com.co` tiene rol `MEDICO` y está vinculada al médico `doctor-1`; solo puede consultar las citas de esa agenda. Los pacientes pueden consultar y gestionar sus propias citas.

### Tests

Desde la raíz, instala las dependencias de los paquetes que tienen pruebas y ejecútalas:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix backend/services/citas-service
npm test
```

`npm test` ejecuta las pruebas del frontend, del backend de registro y del microservicio de citas. Para ejecutar una suite específica:

```bash
npm run test:frontend
npm run test:backend
npm --prefix backend/services/citas-service test
```
