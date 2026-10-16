# citas-service (puerto 3007)

Microservicio de citas médicas: especialidades, sedes, médicos, horarios de atención, **disponibilidad real** y reservas. Base de datos propia: `db_citas`.

## Endpoints (`/api/citas`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servicio |
| GET | `/especialidades` | Público | Especialidades, duración de la consulta y número de médicos |
| GET | `/sedes` | Público | Sedes de atención |
| GET | `/medicos?especialidadId=&sedeId=` | Público | Médicos con su especialidad y sede |
| GET | `/disponibilidad?especialidadId=&sedeId=&medicoId=&desde=&dias=7` | Público | Franjas libres (máximo 14 días por consulta) |
| POST | `/citas` | Sesión | Reserva `{ medicoId, fecha: "AAAA-MM-DD", hora: "HH:MM", motivo }` |
| GET | `/citas` | Sesión | Citas del usuario |
| PATCH | `/citas/:id/cancelar` | Sesión | Cancela una cita propia programada |
| GET | `/admin/resumen` | ADMIN | Ocupación de la semana, citas por estado, citas de hoy y próxima franja libre por especialidad |
| GET | `/admin/citas?desde=&hasta=&estado=` | ADMIN | Agenda completa en un rango |
| PATCH | `/admin/citas/:id/estado` | ADMIN | Marca una cita como `ATENDIDA`, `NO_ASISTIO` o `CANCELADA` |

"Sesión" es el JWT de `auth-service` (`Authorization: Bearer …`), por eso `JWT_SECRET` debe ser igual al de `auth-service`. "ADMIN" exige además que el JWT tenga `rol: ADMIN`.

## Cómo se calcula la disponibilidad

1. Cada médico tiene **bloques semanales** en `horarios` (por ejemplo, lunes de 07:00 a 12:00).
2. Cada bloque se divide en franjas según la **duración de la consulta** de la especialidad (20 minutos en Medicina General, 30 en las demás).
3. Se quitan las franjas que **ya pasaron** (hora de Bogotá) y las que tienen una cita `PROGRAMADA`.

La disponibilidad no se guarda: se calcula en cada consulta, así nunca queda desactualizada.

## Reglas

- Solo se reservan franjas reales del médico, desde ahora y hasta **60 días** adelante.
- **Nadie puede reservar dos veces el mismo horario**, aunque dos personas lo intenten al mismo tiempo. La columna generada `activa` vale 1 solo mientras la cita está programada, y el índice único `(medico_id, fecha, hora, activa)` lo impide en la base de datos. Si se cancela, el horario se puede volver a reservar.
- Un usuario tiene máximo **5 citas programadas** y no puede tener dos a la misma hora.
- Al reservar se envía un **correo de confirmación** por medio del `notification-service`.

## Base de datos

`database/Script_Creacion_BasedeDatosCitas.sql` crea `especialidades`, `sedes`, `medicos`, `horarios` y `citas`, y carga:
- 7 especialidades y 4 sedes, las mismas que muestra el portal.
- 14 médicos **ficticios** (datos de demostración).
- Sus horarios: los registros pares atienden en la mañana y los impares en la tarde, de lunes a viernes; Medicina General y Pediatría también los sábados en la mañana.

Se crea con `cd backend && npm run db:init -- citas`.

## Arranque

1. Copia `.env.example` como `.env` (con `JWT_SECRET` y `NOTIFICATION_API_KEY` iguales a los demás servicios y los datos de MySQL).
2. Ejecuta `npm install` y luego `npm run dev`.
3. Pruebas: `npm test` (no necesita MySQL).
