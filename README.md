# Tecnosalud Católica

Portal web de salud: un frontend SPA en React + Vite y tres microservicios en Node.js + Express.

## Arquitectura

| Componente | Puerto | Carpeta | Qué hace |
|---|---|---|---|
| Frontend (React 18 + Vite) | 5173 | `src/` | Portal: inicio, nosotros, registro, afiliados, acceso y servicios clínicos |
| `auth-service` | 3002 | `backend/services/auth-service` | Login con JWT, recuperación y restablecimiento de contraseña (MySQL `db_auth`) |
| `registro-service` | 3003 | `backend/services/registro-service` | Guarda las solicitudes de afiliación (MySQL `db_registro`) |
| `notification-service` | 3005 | `backend/services/notification-service` | Envía correos por SMTP; solo lo llaman los otros servicios, con `x-api-key` |

```
Navegador ──► auth-service ────┐
         └──► registro-service ┴──► notification-service ──► SMTP (Gmail)
                 │                       ▲
                 └──── MySQL ────────────┘ (auth y registro)
```

## Estructura

- `src/App.jsx`: navegación por hash (`#registro`, `#acceso`...), carga perezosa de páginas y sesión.
- `src/components/`: `Navbar`, `Layout`, `Footer`, `Breadcrumbs` y `RutaProtegida` (protege Servicios Clínicos validando el JWT).
- `src/components/pages/`: `Inicio`, `Nosotros`, `Registro`, `Afiliados` (Muerte digna, Medicamentos, Triage), `Acceso` (+ `RestablecerClave`), `ServiciosSalud` y `NotFound`.
- `src/__tests__/`: pruebas del frontend (Vitest + Testing Library).
- `backend/Database/` y `backend/services/registro-service/database/`: scripts SQL para crear las bases de datos.
- `backend/services/*/src/app.js`: rutas del servicio. `src/index.js` solo carga el `.env` y arranca el servidor.
- `backend/services/*/tests/`: pruebas de cada microservicio.

## Requisitos

- Node.js 20.19 o superior.
- MySQL 8, solo para usar el login y el registro de verdad. Las pruebas no lo necesitan.

## Configuración

1. **Bases de datos.** Ejecuta en MySQL:
   - `backend/Database/Script_Creacion_BasededatosAutenticacion.sql` (crea `db_auth`)
   - `backend/services/registro-service/database/Script_Creacion_BasedeDatosRegistro.sql` (crea `db_registro`)
2. **Variables de entorno.** En cada servicio copia `.env.example` como `.env` y completa los valores:
   - `JWT_SECRET` en `auth-service` (obligatorio, el servicio no arranca sin él).
   - `NOTIFICATION_API_KEY`: **el mismo valor** en los tres servicios.
   - `SMTP_USER` y `SMTP_PASS` en `notification-service` (contraseña de aplicación de Gmail).
   - Datos de MySQL en `auth-service` y `registro-service`.

   Los `.env` están en `.gitignore`: **nunca los subas a git**. Para el frontend, el `.env.example` de la raíz muestra `VITE_API_AUTH_URL` y `VITE_API_REGISTRO_URL`, que son opcionales.

## Ejecución

```bash
# Instalar todo
npm install                       # frontend
cd backend && npm run install:all # los tres microservicios

# Levantar (una terminal por servicio)
cd backend/services/notification-service && npm run dev
cd backend/services/auth-service && npm run dev
cd backend/services/registro-service && npm run dev
npm run dev                       # frontend en http://localhost:5173
```

## Pruebas y calidad

```bash
npm test               # frontend (Vitest + Testing Library)
npm run lint           # ESLint del frontend
npm run build          # build de producción en dist/
cd backend && npm test # pruebas de los tres microservicios (sin MySQL ni SMTP)
```

## Pendientes conocidos

- `Acceso.jsx` llama a `/api/auth/recuperar-usuario/consultar` y `/verificar`, pero esos endpoints **no existen** en `auth-service`, así que "Recuperar usuario" no funciona todavía.
- El límite de intentos de login se guarda en memoria: se reinicia al reiniciar `auth-service` y no se comparte entre varias instancias.
- Las credenciales que estuvieron en git (SMTP, MySQL, `JWT_SECRET`) deben rotarse, porque siguen en el historial de `main`.

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
9. **Precarga de la imagen de inicio corregida.** `index.html` pedía `Fondo_inicio.webp`, pero el archivo se llama `Fondo_Inicio.webp`. En Windows funcionaba porque no distingue mayúsculas, pero en un servidor Linux (Vercel, Netlify, etc.) la precarga fallaba.
10. **Se liberan las vistas previas de imágenes.** En `ServiciosSalud.jsx`, cada archivo elegido creaba una URL temporal (`URL.createObjectURL`) que nunca se liberaba. Ahora se libera la anterior cuando el usuario cambia de archivo sin guardar, y todas al salir de la página.
11. **Imágenes optimizadas.** `Fondo_Inicio.webp` se recomprimió (WebP con calidad 82, misma resolución de 1532×1083) y pasó de 842 KB a 63 KB sin diferencia visible, lo que ayuda a que la página de inicio cargue más rápido en celulares. Se eliminaron cinco imágenes que el código no usaba (unos 3 MB): `Logo.png` y `Logo-inicio.jpg` en la raíz, y `Fondo_Inicio.png`, `Logo.png` y `Logo-inicio.jpg` en `src/components/pages/Inicio/Images/`.
12. **Documentación actualizada.** Este README se reescribió con la arquitectura real (frontend y tres microservicios), los puertos, cómo configurar los `.env`, cómo crear las bases de datos y cómo correr las pruebas. `DOCUMENTACION.md` dejó de describir el login como "simulado" con `DUMMY_USERS`.
13. **Mensajes de error que dicen qué falló.** Antes, cualquier problema mostraba "No se pudo conectar con el microservicio de autenticación", tanto si el servicio estaba apagado como si fallaba la base de datos. Ahora `src/utils/servicios.js` (`llamarServicio`) distingue cuatro casos, que usan `Acceso`, `RestablecerClave` y `Registro`:
   - **Servicio apagado**: "No hay conexión con el servicio de autenticación (http://localhost:3002)…". En desarrollo agrega cómo encenderlo.
   - **Base de datos caída (503)**: `auth-service` y `registro-service` (`src/errores.js`) explican la causa: MySQL apagado, usuario o clave incorrectos, la base no existe o faltan tablas. En producción (`NODE_ENV=production`) no se muestra ese detalle de configuración.
   - **Error interno (500)** y **respuesta inesperada** (por ejemplo, una URL mal configurada).
   - Se agregaron 7 pruebas en el frontend y 5 en los microservicios.
14. **Script SQL de `db_auth` corregido.** Los hashes bcrypt de los 5 usuarios de prueba eran inventados y no correspondían a ninguna clave, así que nadie podía iniciar sesión. Ahora son hashes reales de las claves documentadas en el script (`caenjiro@gmail.com` / `123456`, etc.). Al volver a ejecutar el script se restablecen esas claves, y se quitaron los `select` de inspección que tenía mezclados. La prueba `auth-service/tests/script-sql.test.js` verifica que cada hash coincida con su clave.
15. **Comando `npm run db:init`** (en `backend/`). Ejecuta los scripts SQL de `db_auth` y `db_registro` con los datos de conexión de `auth-service/.env` y `registro-service/.env`. Sirve igual para MySQL local que para Azure Database for MySQL, sin instalar un cliente de MySQL. También acepta `npm run db:init -- auth` o `-- registro` para crear solo una base. Si falla, explica la causa (IP sin autorizar en el firewall de Azure, credenciales, SSL, servidor inexistente) y se puede volver a ejecutar sin problema. `npm run install:all` instala ahora también las dependencias de `backend/` (`mysql2` y `dotenv`).
