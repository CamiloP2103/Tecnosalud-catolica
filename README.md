# Tecnosalud Católica

Portal web de salud: un frontend SPA en React + Vite y cinco microservicios en Node.js + Express.

## Arquitectura

| Componente | Puerto | Carpeta | Qué hace |
|---|---|---|---|
| Frontend (React 18 + Vite) | 5173 | `src/` | Portal: inicio, nosotros, registro, afiliados, acceso y, con sesión, servicios clínicos, farmacias y documentos clínicos |
| `auth-service` | 3002 | `backend/services/auth-service` | Login con JWT, recuperación y restablecimiento de contraseña (MySQL `db_auth`) |
| `registro-service` | 3003 | `backend/services/registro-service` | Guarda las solicitudes de afiliación (MySQL `db_registro`) |
| `farmacias-service` | 3004 | `backend/services/farmacias-service` | Catálogo de 100 medicamentos, 8 farmacias con inventario y solicitudes de medicamentos (MySQL `db_farmacias`) |
| `documentos-service` | 3006 | `backend/services/documentos-service` | Documentos clínicos cifrados: carga, generación y descarga con bitácora (MySQL `db_documentos`) |
| `notification-service` | 3005 | `backend/services/notification-service` | Envía correos por SMTP y guarda su historial; solo lo llaman los otros servicios, con `x-api-key` (MySQL `db_notificaciones`) |

```
Navegador ──► auth-service ──────┐
         ├──► registro-service ──┼──► notification-service ──► SMTP (Gmail)
         ├──► farmacias-service ─┘
         └──► documentos-service ──► archivos cifrados (storage/)
                     │
                     └──► MySQL (db_auth, db_registro, db_farmacias, db_documentos, db_notificaciones)
```

`farmacias-service` y `documentos-service` validan el JWT que emite `auth-service`, por eso los tres comparten `JWT_SECRET`.

Las cinco bases de datos, sus tablas y cómo se relacionan entre servicios están explicadas, con diagramas, en **[docs/ARQUITECTURA_DATOS.md](docs/ARQUITECTURA_DATOS.md)**.

## Estructura

- `src/App.jsx`: navegación por hash (`#registro`, `#acceso`...), carga perezosa de páginas y sesión.
- `src/components/`: `Navbar`, `Layout`, `Footer`, `Breadcrumbs` y `RutaProtegida` (protege Servicios Clínicos, Farmacias y Documentos validando el JWT).
- `src/components/pages/`: `Inicio`, `Nosotros`, `Registro`, `Afiliados` (Muerte digna, Medicamentos, Triage), `Acceso` (+ `RestablecerClave`), `ServiciosSalud`, `Farmacias`, `Documentos` y `NotFound`.
- `src/__tests__/`: pruebas del frontend (Vitest + Testing Library).
- `backend/Database/`, `backend/services/registro-service/database/` y `backend/services/farmacias-service/database/`: scripts SQL para crear las bases de datos.
- `backend/scripts/db-init.js`: crea todas las bases con `npm run db:init`.
- `backend/services/*/src/app.js`: rutas del servicio. `src/index.js` solo carga el `.env` y arranca el servidor.
- `backend/services/*/tests/`: pruebas de cada microservicio.

## Requisitos

- Node.js 20.19 o superior.
- Una base MySQL 8 para usar el login y el registro de verdad: **Azure Database for MySQL** (recomendado, compartida por el equipo) o un MySQL local. Las pruebas no la necesitan.

## Configuración

1. **Variables de entorno.** En cada servicio copia `.env.example` como `.env` y completa los valores:
   - `JWT_SECRET` en `auth-service`, `farmacias-service` y `documentos-service`: obligatorio y **el mismo valor** en los tres.
   - `DOCUMENTOS_ENCRYPTION_KEY` en `documentos-service`: clave aleatoria de 64 caracteres hexadecimales. **Guárdala bien**: sin ella no se pueden descifrar los documentos guardados.
   - `NOTIFICATION_API_KEY`: **el mismo valor** en `auth-service`, `registro-service`, `farmacias-service` y `notification-service`.
   - `SMTP_USER` y `SMTP_PASS` en `notification-service` (contraseña de aplicación de Gmail).
   - Datos de MySQL en los cinco servicios (cada uno con su `DB_NAME`).

   Los `.env` están en `.gitignore`: **nunca los subas a git**. Para el frontend, el `.env.example` de la raíz muestra `VITE_API_AUTH_URL`, `VITE_API_REGISTRO_URL`, `VITE_API_FARMACIAS_URL` y `VITE_API_DOCUMENTOS_URL`, que son opcionales.
2. **Bases de datos.** Con los `.env` listos, crea las cinco bases (`db_auth`, `db_registro`, `db_farmacias`, `db_documentos` y `db_notificaciones`) con un comando:
   ```bash
   cd backend
   npm run install:all   # solo la primera vez
   npm run db:init
   ```
   El comando crea las tablas, los usuarios de prueba, el catálogo de medicamentos, las farmacias y su inventario. Si también tienes un cliente de MySQL, puedes ejecutar los scripts `.sql` a mano.

### Usuarios de prueba

| Correo | Clave | Rol |
|---|---|---|
| `caenjiro@gmail.com` | `123456` | Paciente |
| `maria.gomez@clinicaejemplo.com` | `maria2026` | Médico |
| `carlos.jimenez@tecnosalud.com.co` | `admin2026` | Admin |
| `soporte.tecnosalud@gmail.com` | `soporte123` | Admin |
| `afiliados.bogota@redsalud.com` | `afiliados2026` | Paciente |

Son claves de demostración: cámbialas o elimina estos usuarios en un entorno real.

### Crear usuarios propios

Para que cada integrante entre con su correo y reciba las alertas y confirmaciones:

```bash
cd backend
npm run usuario:crear -- --email ana@correo.com --nombre "Ana Pérez" --doc 1020304050 --tipo CC --rol PACIENTE
```

- `--rol`: `PACIENTE`, `MEDICO` o `ADMIN`. `--tipo`: `CC`, `TI`, `CE` o `PA`.
- La contraseña se genera aleatoria y nadie la conoce. El usuario define la suya en la página con **Acceso → "¿Olvidaste tu contraseña?"**: le llega un enlace a su correo, válido por 15 minutos.
- Si se necesita una clave inicial conocida, se pasa en la variable de entorno `NUEVA_CLAVE` (no como argumento, para que no quede en el historial de la terminal).
- No sobrescribe usuarios: si el correo o el documento ya existen, no cambia nada.

## Conectar a Azure Database for MySQL

**1. Crear el servidor** (portal.azure.com → *Azure Database for MySQL – Servidor flexible* → *Crear*; no uses "Single Server", que Microsoft retiró):
- Nombre: por ejemplo `tecnosalud-mysql`. Tu host será `tecnosalud-mysql.mysql.database.azure.com`.
- Versión MySQL 8.0. Carga de trabajo *Desarrollo*, tamaño **Burstable B1ms** (el más económico; con Azure for Students o una cuenta gratuita suele estar incluido, pero confirma el precio antes de crear).
- Usuario administrador, por ejemplo `tecnoadmin` (Azure no permite `root`), con una contraseña fuerte y nueva.
- **Redes**: *Acceso público* y *Agregar la dirección IP del cliente actual*. Cada integrante del equipo debe agregar su IP. No abras el rango `0.0.0.0 – 255.255.255.255`.

**2. Configurar los `.env`** de `auth-service`, `registro-service`, `farmacias-service` y `documentos-service`:

```env
DB_HOST=tecnosalud-mysql.mysql.database.azure.com
DB_PORT=3306
DB_USER=tecnoadmin
DB_PASSWORD=tu-contraseña
DB_NAME=db_auth          # registro: db_registro · farmacias: db_farmacias · documentos: db_documentos · notification: db_notificaciones
DB_SSL=true              # Azure exige conexión cifrada
```

No hace falta descargar certificados: Node ya confía en las autoridades que usa Azure.

**3. Crear las bases:** `cd backend && npm run db:init`.

**4. Reiniciar** `auth-service`, `registro-service`, `farmacias-service` y `documentos-service`, y entrar con un usuario de prueba.

**Si algo falla**, `db:init` y la pantalla de acceso muestran la causa:

| Mensaje | Solución |
|---|---|
| "El servidor no respondió…" / "no respondió a tiempo" | Agrega tu IP en *Redes* del servidor en Azure |
| "Usuario o contraseña incorrectos" | Revisa `DB_USER` y `DB_PASSWORD` |
| "No existe el servidor indicado en DB_HOST" | Revisa el nombre del host |
| "El servidor exige conexión segura" | Pon `DB_SSL=true` |
| "Faltan tablas" / "la base de datos no existe" | Ejecuta `npm run db:init` |

## Ejecución

```bash
# Instalar todo
npm install                       # frontend
cd backend && npm run install:all # los cinco microservicios

# Levantar (una terminal por servicio)
cd backend/services/notification-service && npm run dev
cd backend/services/auth-service && npm run dev
cd backend/services/registro-service && npm run dev
cd backend/services/farmacias-service && npm run dev
cd backend/services/documentos-service && npm run dev
npm run dev                       # frontend en http://localhost:5173
```

## Pruebas y calidad

```bash
npm test               # frontend (Vitest + Testing Library)
npm run lint           # ESLint del frontend
npm run build          # build de producción en dist/
cd backend && npm test # pruebas de los cinco microservicios (sin MySQL ni SMTP)
```

## Pendientes conocidos

- `Acceso.jsx` llama a `/api/auth/recuperar-usuario/consultar` y `/verificar`, pero esos endpoints **no existen** en `auth-service`, así que "Recuperar usuario" no funciona todavía.
- El límite por IP de `auth-service` vive en memoria (el bloqueo por cuenta ya se guarda en `db_auth`).
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
16. **Guía para Azure Database for MySQL en este README.** Explica cómo crear el servidor flexible, configurar el firewall y los `.env` (con `DB_SSL=true`), crear las bases con `npm run db:init` y resolver los errores comunes. Incluye la tabla de usuarios de prueba.
17. **Nuevo microservicio `farmacias-service` (puerto 3004)** con base de datos propia `db_farmacias`. Permite consultar el catálogo de **100 medicamentos comunes**, que indica si son de venta libre, si requieren fórmula médica o si son de control especial. También permite ver las **8 farmacias** (Farmatodo y Droguerías Colsubsidio en Bogotá, Chía, Cajicá y Soacha) con su inventario y precios, y **solicitar medicamentos** con sesión iniciada:
   - Valida la fórmula médica (vence a los 30 días) y no permite pedir en línea los medicamentos de control especial.
   - Descuenta las existencias en una transacción con bloqueo de filas y deja cancelar las solicitudes pendientes.
   - Envía un correo de confirmación por medio del `notification-service`.
   - Tablas: `medicamentos`, `farmacias`, `inventario`, `solicitudes` y `solicitud_items`.
   - Las direcciones de las farmacias se tomaron de los directorios públicos de cada cadena (octubre de 2026). Los precios son referencias aproximadas y el inventario es ficticio.
   - 40 pruebas. Detalle de endpoints y reglas en `backend/services/farmacias-service/LEEME.md`.
18. **`farmacias-service` integrado al proyecto.** `npm run db:init` crea también `db_farmacias` (o solo esa base con `npm run db:init -- farmacias`). `backend/package.json` instala y prueba los cuatro servicios, y este README documenta su puerto, sus variables (`JWT_SECRET` compartido con `auth-service`) y cómo arrancarlo.
19. **Nueva opción "Farmacias" en el menú**, visible solo con sesión iniciada y protegida con `RutaProtegida`, igual que Servicios Clínicos. La página `src/components/pages/Farmacias/` usa `farmacias-service` y tiene cuatro pestañas:
   - **Catálogo**: buscador y filtros por categoría y tipo de venta. Cada medicamento muestra la etiqueta *Venta libre*, *Requiere fórmula* o *Control especial*, un precio de referencia y en cuántas farmacias está disponible. Los de control especial no se pueden agregar.
   - **Farmacias**: las 8 sedes con dirección, horario e indicador de 24 horas; permite elegir dónde reclamar.
   - **Mi pedido**: cantidades, disponibilidad y precio en la farmacia elegida, total estimado y, si hace falta, el formulario de la fórmula médica. Si falta alguna existencia, marca qué medicamento.
   - **Mis solicitudes**: historial con estado y opción de cancelar las pendientes.
   - Se agregaron `VITE_API_FARMACIAS_URL` al `.env.example` y 7 pruebas en `src/__tests__/farmacias.test.jsx`.
20. **Nuevo microservicio `documentos-service` (puerto 3006)**, aportado por un compañero del equipo y adaptado a este proyecto. Permite cargar, generar y descargar documentos clínicos; los archivos se guardan **cifrados con AES-256-GCM** y la base de datos propia `db_documentos` guarda los metadatos y la bitácora de descargas.
   - Un paciente solo accede a sus propios documentos; `MEDICO` y `ADMIN` pueden gestionar los de otros pacientes.
   - Se verifica la firma real de los PDF, PNG y JPG, y cada descarga exige confirmar la identificación y queda registrada.
   - Cambios respecto a la versión original: puerto 3006 en lugar de 3004 (que ya usa `farmacias-service`), respuestas 503 con la causa cuando falla MySQL, carpeta `storage/` resuelta siempre dentro del servicio, `node --watch` en lugar de `nodemon`, pruebas pasadas de `node --test` a Vitest (10 pruebas, incluida una nueva para el 503) y `.env.example` documentado.
   - Detalle en `backend/services/documentos-service/LEEME.md`.
21. **`documentos-service` integrado.** `npm run db:init` crea también `db_documentos` (o solo esa con `npm run db:init -- documentos`). `backend/package.json` instala y prueba los cinco servicios, y este README documenta su puerto, `JWT_SECRET` compartido y `DOCUMENTOS_ENCRYPTION_KEY`.
22. **Nueva opción "Documentos clínicos" en el menú**, visible solo con sesión y protegida con `RutaProtegida`. Usa la página `src/components/pages/Documentos/` que hizo el compañero, adaptada así:
   - Apunta al puerto 3006 (`VITE_API_DOCUMENTOS_URL`).
   - Usa `llamarServicio` para mostrar la causa real de los errores (servicio apagado, base de datos caída).
   - Ya no borra la sesión ni recarga la página ante cualquier error 401.
   - El paciente ve y carga sus propios documentos y descarga confirmando su identificación; `MEDICO` y `ADMIN` también pueden buscar otros pacientes y generar documentos.
   - 5 pruebas en `src/__tests__/documentos.test.jsx`.
23. **Comando `npm run usuario:crear`** (en `backend/`) para crear usuarios reales en `db_auth` con correo, nombre, documento y rol. Asigna una contraseña aleatoria que el usuario reemplaza con "¿Olvidaste tu contraseña?", valida los datos y no sobrescribe usuarios existentes.
24. **`notification-service` con base de datos propia `db_notificaciones`.** Cada correo queda registrado con destinatario, asunto, servicio que lo pidió (cabecera `x-servicio-origen`, que ahora envían auth, registro y farmacias), estado `ENVIADA`/`FALLIDA`, `message_id` y motivo del error. El cuerpo no se guarda, para no almacenar enlaces de recuperación ni datos clínicos. Si la base falla, el correo se envía igual. Se agregó `GET /api/notifications/historial` (con `x-api-key`), 4 pruebas, `db:init -- notificaciones` y el `LEEME.md` del servicio. La base ya está creada en Azure.
25. **`auth-service` usa por completo `db_auth`.**
   - **Bitácora:** cada intento de login queda en `bitacora_acceso`, con usuario, correo, IP, resultado y motivo (`USUARIO_NO_EXISTE`, `CLAVE_INCORRECTA`, `CUENTA_BLOQUEADA`, `USUARIO_INACTIVO` o `LIMITE_IP`). Si no se puede escribir en la bitácora, el login no se cae.
   - **Bloqueo por cuenta:** se guarda en `intentos_fallidos` y `bloqueado_hasta`. Tras 5 contraseñas incorrectas seguidas, la cuenta queda bloqueada 15 minutos aunque se reinicie el servicio o se intente desde otra IP. Un login exitoso o restablecer la contraseña la desbloquean.
   - Se mantiene además el límite en memoria por IP y correo.
   - Se agregaron 5 pruebas y se verificó el SQL contra Azure.
26. **Reabastecimiento semanal del inventario de farmacias, solo los lunes.**
   - Cada lunes (hora de Bogotá), `farmacias-service` rellena hasta 60 unidades todo producto que tenga menos. Lo hace solo: revisa al arrancar y cada hora.
   - También se puede lanzar ese día con `cd backend/services/farmacias-service && npm run inventario:reabastecer`. Otro día se niega y dice cuándo es el próximo.
   - La nueva tabla `reabastecimientos` usa la semana ISO como clave única, así que solo puede pasar una vez por semana, y registra el origen, los productos actualizados y las unidades agregadas.
   - `GET /api/farmacias/reabastecimiento` informa el estado. Se agregaron 10 pruebas (incluidos los cambios de día con la hora de Bogotá) y la tabla ya está creada en Azure.
27. **Farmacias: disponibilidad por sede y carrito.**
   - **Disponibilidad:** cada medicamento del catálogo tiene el botón "¿En qué farmacias hay?", que lista las sedes con dirección, localidad, municipio, horario, unidades y precio. Desde una sede con existencias se agrega directo al carrito y esa farmacia queda elegida para el pedido.
   - **Carrito:** la pestaña se llama "Carrito (n)", con "Agregar al carrito" y "Hacer pedido". Al pedir se descuenta el inventario, llega el correo de confirmación y el catálogo se actualiza.
   - **Reabastecimiento:** un aviso muestra la fecha del próximo.
   - 1 prueba nueva. Flujo verificado contra Azure: un pedido real bajó el inventario de 48 a 47, el correo quedó como `ENVIADA` en `db_notificaciones` y al cancelar volvió a 48.
28. **Documento de arquitectura de datos** en [docs/ARQUITECTURA_DATOS.md](docs/ARQUITECTURA_DATOS.md). Explica el principio de una base de datos por microservicio, las tablas de las cinco bases (diagramas entidad-relación en Mermaid, que GitHub dibuja), cómo se relacionan los datos entre servicios (el JWT lleva `id`, `email`, `doc` y `rol`), los flujos de login, pedido, documentos y recuperación de contraseña, y las medidas de seguridad.
