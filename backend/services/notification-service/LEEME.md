# notification-service (puerto 3005)

Microservicio transversal de correo. Los demás servicios le piden enviar correos y él los despacha por SMTP (Gmail) y guarda el historial en su base propia `db_notificaciones`. **El navegador nunca lo llama**: no tiene CORS y exige la cabecera `x-api-key`.

## Quién lo usa

| Servicio | Correos que pide |
|---|---|
| `auth-service` | Alerta de inicio de sesión exitoso o fallido, enlace de recuperación de contraseña |
| `registro-service` | Confirmación de la solicitud de afiliación |
| `farmacias-service` | Confirmación de una solicitud de medicamentos |

Cada servicio se identifica con la cabecera `x-servicio-origen` (por ejemplo `farmacias-service`), que queda en el historial.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio (público) |
| POST | `/api/notifications/email` | Envía un correo. Cuerpo: `{ to, subject, html o text, adjuntos? }`. Requiere `x-api-key` |
| GET | `/api/notifications/historial?limite=50&destinatario=&estado=ENVIADA\|FALLIDA` | Últimos envíos (máximo 200). Requiere `x-api-key` |
| GET | `/api/notifications/admin/resumen` | Resumen para el panel de administración. Requiere el JWT de un ADMIN (no `x-api-key`); única ruta con CORS |

## Adjuntos

`adjuntos` es opcional: `[{ "nombre": "constancia.pdf", "tipo": "application/pdf", "contenidoBase64": "..." }]`.
- **Solo PDF:** se verifica la firma real `%PDF-` del contenido, no solo el tipo declarado.
- **Límites:** máximo 3 adjuntos de 3 MB cada uno.
- **Nombre de archivo:** solo letras, números, puntos, guiones y guion bajo, sin rutas.

Lo usa `auth-service` para enviar la constancia de registro protegida con contraseña.

## Base de datos `db_notificaciones`

`database/Script_Creacion_BasedeDatosNotificaciones.sql` crea la tabla `notificaciones`: destinatario, asunto, servicio de origen, estado (`ENVIADA`/`FALLIDA`), `message_id` del SMTP, motivo del error y fecha.

- **No guarda el cuerpo del correo**, porque puede contener enlaces de recuperación o datos clínicos.
- **Si la base no está disponible, el correo se envía igual**: el historial nunca bloquea el envío.
- Se crea con `cd backend && npm run db:init -- notificaciones`.

## Arranque

1. Copia `.env.example` como `.env`. Completa `NOTIFICATION_API_KEY` (la misma de los demás servicios), las credenciales SMTP (contraseña de aplicación de Gmail) y los datos de MySQL.
2. Ejecuta `npm install` y luego `npm run dev`.
3. Pruebas: `npm test` (no necesita SMTP ni MySQL).
