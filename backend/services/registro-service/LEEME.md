# registro-service (puerto 3003)

Microservicio de Registro: recibe las solicitudes de afiliación del formulario **Registro**, las valida contra **catálogos colombianos** guardados en su base propia `db_registro` y pide un correo de confirmación al `notification-service`. El administrador aprueba o rechaza cada afiliación y queda un historial.

## Endpoints (`/api/registro`)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servicio |
| GET | `/catalogos` | Público | Tipos de documento, géneros, departamentos con sus municipios, EPS, regímenes, tipos de afiliación y parentescos |
| POST | `/` | Público | Registra una afiliación (JSON del formulario) |
| GET | `/admin/resumen` | ADMIN | Totales por estado, últimos 7 días y distribución por EPS, régimen, tipo de afiliación y departamento |
| GET | `/admin/afiliados?estado=&buscar=` | ADMIN | Lista de afiliados con los nombres de los catálogos; `buscar` filtra por nombre, documento o correo |
| PATCH | `/admin/afiliados/:id/estado` | ADMIN | Cambia el estado (`PENDIENTE`, `ACTIVO` o `RECHAZADO`) con una observación opcional |
| GET | `/admin/afiliados/:id/historial` | ADMIN | Historial de cambios de estado |

"ADMIN" exige el JWT de `auth-service` con `rol: ADMIN` (`JWT_SECRET` igual al de `auth-service`).

### Cuerpo de `POST /`

Los catálogos se envían por **código**:

```json
{
  "nombres": "Ana", "apellidos": "Pérez",
  "tipoDocumento": "CC", "documento": "1020304050",
  "nacimientoDia": "15", "nacimientoMes": "06", "nacimientoAnio": "1990",
  "genero": "F", "correo": "ana@correo.com", "telefono": "3001234567",
  "direccion": "Calle 1 # 2-3", "municipio": "25754",
  "tipoAfiliacion": "paciente", "eps": "COMPENSAR", "regimen": "contributivo",
  "contactoEmergenciaNombre": "Luis Pérez", "contactoEmergenciaTelefono": "3007654321",
  "contactoEmergenciaParentesco": "madre",
  "aceptaTratamientoDatos": true
}
```

## Validaciones (servicio y base de datos)

- **Catálogos:** el tipo de documento, el género, el municipio, la EPS, el régimen, el tipo de afiliación y el parentesco deben existir en su tabla. El servicio responde 400, y si alguien inserta directamente en MySQL, la **llave foránea** también lo rechaza.
- **Documento según la edad** (regla colombiana): CC desde 18 años, TI de 7 a 17 y RC menores de 7. CE, PA y PPT pueden llevar letras; los demás documentos son solo números.
- **Teléfono colombiano:** celular de 10 dígitos que empieza por 3, fijo nacional 60 + 8 dígitos o fijo de 7 dígitos.
- **Habeas data:** `aceptaTratamientoDatos` debe ser `true` (Ley 1581 de 2012). Se guarda la fecha de la aceptación.
- **Sin duplicados:** el correo y el par tipo + número de documento son únicos (409 si se repiten).

## Base de datos `db_registro`

| Tabla | Contenido | Relación |
|---|---|---|
| `tipos_documento` | CC, TI, RC, CE, PA, PPT | ← `afiliados.tipo_documento_codigo` |
| `generos` | M, F, Otro | ← `afiliados.genero_codigo` |
| `departamentos` | Los 32 departamentos y Bogotá D.C., con código DANE | ← `municipios.departamento_codigo` |
| `municipios` | 84 municipios: capitales, ciudades principales y municipios cercanos a Bogotá, con código DANE | ← `afiliados.municipio_codigo` |
| `regimenes` | Contributivo, subsidiado, especial, particular | ← `afiliados.regimen_codigo` |
| `eps` | 21 entidades: Nueva EPS, Sura, Sanitas, Compensar, Famisanar, Salud Total, Coosalud, Mutual Ser, EPS indígenas, régimen de excepción… | ← `afiliados.eps_codigo` |
| `tipos_afiliacion` | Paciente, profesional, empresa | ← `afiliados.tipo_afiliacion_codigo` |
| `parentescos` | Madre, padre, cónyuge, hijo… | ← `afiliados.contacto_emergencia_parentesco_codigo` (opcional) |
| `afiliados` | Solicitudes de afiliación con su estado | → todos los catálogos |
| `historial_estados` | Quién cambió el estado de cada afiliación, cuándo y por qué | → `afiliados.id` (se borra en cascada) |

- Los catálogos se guardan en memoria del servicio por 10 minutos, porque casi no cambian.
- Si se agregan municipios, verifica el código en la DIVIPOLA del DANE: los dos primeros dígitos deben ser los del departamento (una prueba lo comprueba).

**Migración desde la versión anterior:** la primera versión guardaba la ciudad y la EPS como texto libre. `npm run db:init -- registro` detecta la tabla vieja: si está vacía la reemplaza; si tiene datos se detiene sin borrar nada, para migrarlos a mano.

## Arranque

1. Copia `.env.example` como `.env` (con `JWT_SECRET`, `NOTIFICATION_API_KEY` y los datos de MySQL).
2. Ejecuta `npm install` y luego `npm run dev`.
3. Pruebas: `npm test` (21 pruebas, no necesitan MySQL).
