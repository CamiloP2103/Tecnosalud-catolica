# Documentación del proyecto Tecnosalud Católica

## 1. Descripción general

Tecnosalud Católica es una aplicación web desarrollada con React y Vite para una marca de salud, tecnología e ingeniería. El proyecto se presenta como una SPA (Single Page Application) orientada a mostrar información institucional, facilitar el registro de afiliados y permitir el acceso de usuarios mediante microservicios de backend (autenticación con JWT, registro de afiliados y notificaciones por correo).

La solución visualmente está enfocada en un estilo institucional con branding azul y amarillo, integración de elementos gráficos y contenido orientado a salud, innovación y confianza.

## 2. Objetivo del sistema

El proyecto busca:

- Presentar la identidad institucional de Tecnosalud Católica.
- Dar acceso a información sobre la empresa, valores, misión, visión y servicios.
- Permitir que nuevos usuarios completen un formulario de afiliación.
- Autenticar usuarios y recuperar contraseñas mediante `auth-service`.
- Mostrar una interfaz dinámica con navegación por secciones y menú desplegable.

## 3. Stack tecnológico

### Frontend
- React 18
- Vite 8
- JavaScript / JSX
- CSS por componente
- Vitest 5 + Testing Library (pruebas)
- ESLint 8 (`.eslintrc.cjs`)

### Backend (microservicios)
- Node.js + Express 4
- `auth-service` (puerto 3002): MySQL (`mysql2`), `bcryptjs`, `jsonwebtoken`
- `registro-service` (puerto 3003): MySQL (`mysql2`)
- `notification-service` (puerto 3005): `nodemailer` 10
- Vitest + Supertest para las pruebas de cada servicio

## 4. Estructura del proyecto

```text
Tecnosalud-catolica/
├── index.html
├── package.json
├── vite.config.js
├── .eslintrc.cjs
├── .env.example              # VITE_API_AUTH_URL, VITE_API_REGISTRO_URL
├── src/
│   ├── App.jsx               # navegación por hash y sesión
│   ├── main.jsx
│   ├── __tests__/            # pruebas del frontend
│   ├── test/setup.js
│   ├── styles/global.css
│   └── components/
│       ├── Breadcrumbs/ Footer/ Layout/ Navbar/
│       ├── RutaProtegida/    # protege Servicios Clínicos validando el JWT
│       └── pages/
│           ├── Acceso/       # Acceso.jsx, RestablecerClave.jsx
│           ├── Afiliados/    # MuerteDigna, Medicamentos, Triage (+ CSS)
│           ├── Inicio/ Nosotros/ NotFound/ Registro/ ServiciosSalud/
└── backend/
    ├── package.json          # npm run install:all / npm test para todos los servicios
    ├── Database/             # script SQL de db_auth
    └── services/
        ├── auth-service/         # src/app.js, plantillas.js, limitador.js, index.js, tests/
        ├── notification-service/ # src/app.js, index.js, tests/
        ├── registro-service/     # src/app.js, validators.js, index.js, database/, tests/
        ├── farmacias-service/    # src/app.js, repositorio.js, validators.js, autenticacion.js, database/, tests/
        └── documentos-service/   # src/app.js (cifrado y permisos), index.js, database/, tests/
```

Cada microservicio tiene un `.env.example`. El `.env` real no se versiona.

## 5. Flujo principal de la aplicación

### 5.1 Componente raíz
El punto de entrada de la app se encuentra en `src/App.jsx`.

Este archivo:

- Define la navegación principal.
- Gestiona la página activa con `useState`.
- Carga de forma perezosa cada sección con `lazy()` y `Suspense`.
- Controla la sesión activa con `localStorage`.
- Muestra el navbar y el layout base para todas las vistas.

### 5.2 Navegación
La navegación se maneja con:

- `currentPage` para identificar la vista activa.
- `handleNavigate(pageId)` para cambiar la vista.
- Menú con dropdowns para secciones de tipo “Nosotros” y “Afiliados”.

### 5.3 Estado de sesión
Al iniciar sesión, `auth-service` devuelve un JWT válido por 8 horas y los datos públicos del usuario. El frontend los guarda en `localStorage`:

- `tecnosalud_token`: el JWT.
- `tecnosalud_sesion_activa`: los datos públicos del usuario (sin contraseña).

`RutaProtegida` revisa que el token exista y no haya expirado antes de mostrar "Servicios Clínicos". Si no es válido, limpia la sesión y pide iniciar sesión.

## 6. Módulos y pantallas principales

### Inicio
Archivo: `src/components/pages/Inicio/Inicio.jsx`

Incluye:

- Hero section con texto institucional.
- Botón de acción para conocer más sobre la empresa.
- Hora de carga de la vista basada en `new Date().toLocaleTimeString(...)`.
- Footer con texto promocional de marca.

### Nosotros
Archivo: `src/components/pages/Nosotros/Nosotros.jsx`

Se asume como una sección informativa de la organización con contenido institucional, misión, visión, valores y posible información sobre trabajo en la empresa.

### Registro
Archivo: `src/components/pages/Registro/Registro.jsx`

Funcionalidades actuales:

- Formulario completo de afiliación con datos personales.
- Validación de campos obligatorios.
- Validación de fecha de nacimiento.
- Validación del correo electrónico.
- Validación del teléfono y contacto de emergencia.
- Aceptación de tratamiento de datos.
- Captcha simple local.
- Modal de éxito al finalizar el registro.

### Acceso
Archivo: `src/components/pages/Acceso/Acceso.jsx`

Funciones principales:

- Inicio de sesión contra `auth-service` (`POST /api/auth/login`).
- Validación de usuario y contraseña; tras 5 intentos fallidos el servicio bloquea 15 minutos.
- Captcha local para protección del login.
- Recordar usuario en localStorage.
- Recuperación de usuario por documento y correo (pendiente: los endpoints `recuperar-usuario` aún no existen en `auth-service`).
- Recuperación de contraseña: envía por correo un enlace de 15 minutos que abre `RestablecerClave` (mínimo 8 caracteres).
- Modal de bienvenida y cierre de sesión.

### Afiliados
Archivos vinculados:

- `src/components/pages/Afiliados/MuerteDigna.jsx`
- `src/components/pages/Afiliados/Medicamentos.jsx`
- `src/components/pages/Afiliados/Triage.jsx`

Estos modulos están pensados para representar contenido relacionado con atención, trámites y servicios de afiliación, aunque en el estado actual se mantienen como vistas específicas dentro del sistema.

### Servicios de salud
Archivo: `src/components/pages/ServiciosSalud/ServiciosSalud.jsx`

Es una vista adicional que aparece en la navegación cuando el usuario ha iniciado sesión correctamente.

## 7. Microservicios y seguridad

- **auth-service**: `POST /api/auth/login`, `POST /api/auth/recuperar-clave/solicitar` y `POST /api/auth/recuperar-clave/restablecer`. Las contraseñas se guardan con bcrypt. Los errores de login son genéricos ("Credenciales inválidas.") y la recuperación responde igual exista o no el correo. Tiene límite de intentos en memoria y CORS restringido a `FRONTEND_URL`.
- **registro-service**: `POST /api/registro` valida el formulario (`validators.js`) y lo guarda en `db_registro.afiliados`; `GET /api/registro/health`.
- **farmacias-service** (puerto 3004, `db_farmacias`): catálogo de 100 medicamentos (venta libre, con fórmula o de control especial), 8 farmacias de Bogotá, Chía, Cajicá y Soacha con su inventario, y solicitudes de medicamentos con sesión (valida el JWT de `auth-service`). Exige fórmula vigente (30 días) cuando el medicamento la requiere, no permite pedir en línea los de control especial y descuenta las existencias en una transacción. Detalle en `backend/services/farmacias-service/LEEME.md`.
- **documentos-service** (puerto 3006, `db_documentos`): carga (PDF, PNG o JPG hasta 10 MB), generación (solo `MEDICO`/`ADMIN`) y descarga de documentos clínicos. Los archivos se cifran con AES-256-GCM; un paciente solo accede a los suyos y cada descarga se registra en `bitacora_descargas`. Detalle en `backend/services/documentos-service/LEEME.md`.
- **notification-service**: `POST /api/notifications/email` exige la cabecera `x-api-key` igual a `NOTIFICATION_API_KEY`, compartida con los otros dos servicios. No acepta peticiones del navegador. `GET /health`.

Las pruebas de cada servicio simulan MySQL y SMTP, así que se pueden correr sin infraestructura.

## 8. Almacenamiento local

El frontend usa `localStorage` para:

- `tecnosalud_token` y `tecnosalud_sesion_activa`: sesión autenticada (ver 5.3).
- `tecnosalud_usuario_recordado`: correo recordado si se activa "recordar usuario".

## 9. Estilos y UI

Los estilos están definidos por componentes en archivos CSS separados, por ejemplo:

- `src/components/Navbar/Navbar.css`
- `src/components/Layout/Layout.css`
- `src/components/pages/Inicio/Inicio.css`
- `src/components/pages/Acceso/Acceso.css`
- `src/components/pages/Registro/Registro.css`
- `src/styles/global.css`

La interfaz usa una identidad visual con:

- fondo claro
- azul institucional
- amarillo de acento
- diseño moderno y tipo corporativo
- botones, cards y formularios con diseño adaptable

## 10. Cómo ejecutar el proyecto

Los pasos completos (bases de datos, `.env` y orden de arranque) están en el `README.md`. En resumen:

```bash
npm install && npm run dev                 # frontend
cd backend && npm run install:all          # microservicios
cd backend/services/<servicio> && npm run dev
```

### Scripts disponibles (frontend)

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src --ext .js,.jsx",
  "test": "vitest run"
}
```

## 11. Estado actual del proyecto

- Navegación SPA completa con rutas por hash y página 404.
- Autenticación real con JWT y bcrypt contra MySQL (`auth-service`).
- Registro de afiliados persistido en MySQL (`registro-service`).
- Correos de confirmación, alertas de acceso y recuperación (`notification-service`).
- Pruebas automatizadas en el frontend y en los tres microservicios; ESLint configurado.

## 12. Limitaciones actuales

- "Recuperar usuario" depende de endpoints que todavía no existen en `auth-service`.
- El límite de intentos de login vive en memoria (se pierde al reiniciar y no se comparte entre instancias).
- El JWT se guarda en `localStorage`; una cookie `HttpOnly` sería más segura frente a XSS.
- No hay despliegue productivo configurado.

## 13. Posibles mejoras futuras

1. Implementar `recuperar-usuario/consultar` y `recuperar-usuario/verificar` en `auth-service`.
2. Guardar el límite de intentos en Redis o en MySQL.
3. Mover el JWT a una cookie `HttpOnly` y validar el token en el backend para Servicios Clínicos.
4. Agregar un API gateway o proxy de Vite para no exponer varios puertos.
5. Configurar CI que ejecute lint, pruebas y build en cada push.

## 14. Resumen ejecutivo

Tecnosalud Católica es un portal de salud con frontend en React y tres microservicios en Node.js (autenticación, registro y notificaciones) sobre MySQL. Cuenta con autenticación JWT, registro persistente, correos transaccionales y pruebas automatizadas.

## 15. Observación final

Este documento se ha elaborado a partir del estado real del código fuente del proyecto hasta el momento y sirve como referencia técnica y operativa para continuar el desarrollo.
