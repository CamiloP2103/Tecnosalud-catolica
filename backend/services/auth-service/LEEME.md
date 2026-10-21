# auth-service (puerto 3002)

Microservicio de autenticación: inicio de sesión con JWT, recuperación de contraseña, bitácora de accesos, bloqueo por intentos fallidos, **constancia de registro en PDF protegida con contraseña** y administración de usuarios. Base de datos propia: `db_auth`.

## Endpoints (`/api/auth`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/login` | Público | `{ usuario, contrasena }`. Devuelve `{ token, usuario }`; el JWT dura 8 horas y lleva `{ id, email, rol, doc }` |
| POST | `/recuperar-clave/solicitar` | Público | `{ email }`. Envía un enlace de 15 minutos; responde lo mismo exista o no el correo |
| POST | `/recuperar-clave/restablecer` | Público | `{ token, nuevaContrasena }` (mínimo 8 caracteres); también desbloquea la cuenta |
| POST | `/mi-constancia` | Sesión | Envía al correo del usuario su constancia de registro en PDF. Máximo 3 por hora |
| GET | `/admin/resumen` | ADMIN | Usuarios por rol, bloqueados, accesos de 24 horas, fallos por motivo y accesos recientes |
| GET | `/admin/usuarios?buscar=&rol=` | ADMIN | Usuarios con último acceso y fecha de la última constancia enviada |
| PATCH | `/admin/usuarios/:id/activo` | ADMIN | `{ activo: true\|false }`; el administrador no puede desactivarse a sí mismo |
| POST | `/admin/usuarios/:id/desbloquear` | ADMIN | Quita el bloqueo por intentos fallidos |
| POST | `/admin/usuarios/:id/constancia` | ADMIN | Envía la constancia de registro a ese usuario |
| POST | `/admin/constancias` | ADMIN | Envía la constancia a todos los usuarios activos (máximo 200 por ejecución) |

## Constancia de registro (PDF con contraseña)

`src/constancia.js` genera con **PDFKit** un PDF tamaño carta con:
- **Datos del usuario:** encabezado institucional, número de constancia (`TS-000006`), nombre, tipo y número de documento, correo, rol, estado de la cuenta, **fecha de registro**, último acceso y fecha de emisión (hora de Colombia).
- **Cifrado AES-256** (PDF 1.7 ext. 3):
  - **Contraseña para abrirlo:** el **número de identificación** del usuario, sin espacios.
  - **Contraseña de propietario** aleatoria. Con ella, el PDF no permite modificarlo ni copiar su texto; sí permite imprimirlo.

`src/envioConstancias.js` lo adjunta a un correo que explica cómo abrirlo **sin revelar la contraseña**, lo envía mediante `notification-service` (adjuntos PDF) y deja registro en `constancias_enviadas`, tanto si el envío funcionó como si falló.

Se verificó con un lector independiente (pypdf):
- Sin contraseña o con una incorrecta el PDF no abre.
- Con el número de identificación abre y muestra los datos.

> El número de identificación es una contraseña fácil de adivinar para quien conozca a la persona. Se eligió por pedido del proyecto, para que el usuario no tenga que recordar otra clave. Para documentos más sensibles, conviene una contraseña enviada por otro canal.

## Base de datos `db_auth`

`backend/Database/Script_Creacion_BasededatosAutenticacion.sql`:

| Tabla | Contenido |
|---|---|
| `roles` | PACIENTE, MEDICO, ADMIN |
| `usuarios` | Datos, hash bcrypt, rol, `activo`, `intentos_fallidos` y `bloqueado_hasta` |
| `tokens_recuperacion` | Enlaces de recuperación (15 minutos, de un solo uso) |
| `bitacora_acceso` | Cada intento de login con IP, resultado y motivo |
| `constancias_enviadas` | Cada constancia enviada: usuario, quién la envió, estado y error |

Usuarios nuevos: `cd backend && npm run usuario:crear -- --email … --nombre "…" --doc … --tipo CC --rol PACIENTE`.

## Seguridad

- Las contraseñas se guardan con bcrypt.
- Los errores de login son genéricos ("Credenciales inválidas.").
- **Límites de intentos:**
  - Login: 5 fallos por IP y correo, en memoria.
  - Bloqueo de la cuenta 15 minutos tras 5 fallos, guardado en la base.
  - Constancias: 3 por usuario cada hora.
- **CORS** restringido a `FRONTEND_URL`.
- **Plantillas de correo** con los datos escapados.

## Arranque

1. Copia `.env.example` como `.env` (`JWT_SECRET`, `NOTIFICATION_API_KEY` y los datos de MySQL).
2. Ejecuta `npm install` y luego `npm run dev`.
3. Pruebas: `npm test` (44 pruebas, no necesitan MySQL ni SMTP).
