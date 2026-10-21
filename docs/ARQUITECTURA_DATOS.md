# Arquitectura de datos de Tecnosalud Católica

Este documento explica **qué guarda cada microservicio, en qué base de datos y cómo se relacionan los datos entre servicios**. Todas las bases viven en el mismo servidor de **Azure Database for MySQL** (`tecnosalud-mysql.mysql.database.azure.com`, región Mexico Central, MySQL 8.4, conexión con SSL). Se crean o actualizan con un solo comando:

```bash
cd backend
npm run db:init                 # las seis bases
npm run db:init -- registro     # solo una: auth, registro, farmacias, documentos, notificaciones o citas
```

El comando se puede repetir sin perder datos: usa `CREATE TABLE IF NOT EXISTS`, `INSERT … ON DUPLICATE KEY UPDATE` e `INSERT IGNORE`. Para verlas en Azure: servidor `tecnosalud-mysql` → **Settings → Databases**.

---

## 1. Principio: una base de datos por microservicio, en el mismo servidor

Cada microservicio es **dueño exclusivo** de su base de datos dentro del servidor de Azure. Ningún servicio lee ni escribe en la base de otro.

| Microservicio | Puerto | Base de datos | Tablas | Qué guarda |
|---|---|---|---|---|
| `auth-service` | 3002 | `db_auth` | 4 | Usuarios, roles, contraseñas (bcrypt), tokens de recuperación, bitácora de accesos |
| `registro-service` | 3003 | `db_registro` | 10 | Catálogos colombianos y solicitudes de afiliación con su historial |
| `farmacias-service` | 3004 | `db_farmacias` | 6 | Medicamentos, farmacias, inventario, pedidos y reabastecimientos |
| `notification-service` | 3005 | `db_notificaciones` | 1 | Historial de correos enviados |
| `documentos-service` | 3006 | `db_documentos` | 2 | Metadatos de documentos clínicos y bitácora de descargas (archivos cifrados en disco) |
| `citas-service` | 3007 | `db_citas` | 5 | Especialidades, sedes, médicos, horarios y citas |

**¿Por qué así y no una sola base?** Si un servicio cambia sus tablas, se cae o se reemplaza, los demás siguen funcionando. Es el patrón *database per service* de las arquitecturas de microservicios. **Dentro de cada base sí hay llaves foráneas** (por ejemplo, `afiliados → municipios`). **Entre bases distintas no las hay**: esas relaciones se hacen con identificadores que viajan en el JWT o en las llamadas entre servicios (sección 3).

```mermaid
flowchart LR
    U[Navegador<br/>React :5173]
    A[auth-service :3002]
    R[registro-service :3003]
    F[farmacias-service :3004]
    D[documentos-service :3006]
    C[citas-service :3007]
    N[notification-service :3005]
    SMTP[(Gmail SMTP)]
    S[(storage/<br/>archivos cifrados)]

    subgraph Azure MySQL - tecnosalud-mysql
      DA[(db_auth)]
      DR[(db_registro)]
      DF[(db_farmacias)]
      DD[(db_documentos)]
      DC[(db_citas)]
      DN[(db_notificaciones)]
    end

    U -->|login, recuperar clave| A
    U -->|afiliación| R
    U -->|catálogo, pedidos + JWT| F
    U -->|documentos + JWT| D
    U -->|disponibilidad, citas + JWT| C
    U -->|panel admin + JWT ADMIN| A & R & F & D & C & N
    A --> DA
    R --> DR
    F --> DF
    D --> DD
    D --> S
    C --> DC
    A & R & F & C -->|x-api-key| N
    N --> DN
    N --> SMTP
```

---

## 2. Tablas de cada base de datos

### 2.1 `db_auth` (auth-service)

```mermaid
erDiagram
    roles ||--o{ usuarios : "rol_id"
    usuarios ||--o{ tokens_recuperacion : "usuario_id"
    usuarios ||--o{ bitacora_acceso : "usuario_id"

    roles {
        INT id PK
        VARCHAR nombre "PACIENTE, MEDICO, ADMIN"
    }
    usuarios {
        INT id PK "viaja en el JWT como id"
        ENUM tipo_doc "CC, TI, CE, PA"
        VARCHAR documento "viaja en el JWT como doc"
        VARCHAR email UK "viaja en el JWT como email"
        VARCHAR contrasena_hash "bcrypt"
        VARCHAR nombre
        INT rol_id FK "viaja en el JWT como rol"
        BOOLEAN activo
        INT intentos_fallidos "bloqueo tras 5 fallos"
        DATETIME bloqueado_hasta "15 minutos"
    }
    tokens_recuperacion {
        INT id PK
        INT usuario_id FK
        VARCHAR token UK "aleatorio, 15 minutos"
        DATETIME expira_en
        BOOLEAN usado
    }
    bitacora_acceso {
        BIGINT id PK
        INT usuario_id FK "NULL si el correo no existe"
        VARCHAR email_ingresado
        VARCHAR ip_origen
        BOOLEAN exitoso
        VARCHAR motivo_fallo "CLAVE_INCORRECTA, CUENTA_BLOQUEADA..."
    }
```

Usuarios nuevos: `npm run usuario:crear` (README). El administrador activa, desactiva y desbloquea cuentas desde el panel.

### 2.2 `db_registro` (registro-service) — catálogos colombianos

```mermaid
erDiagram
    tipos_documento ||--o{ afiliados : "tipo_documento_codigo"
    generos ||--o{ afiliados : "genero_codigo"
    departamentos ||--|{ municipios : "departamento_codigo"
    municipios ||--o{ afiliados : "municipio_codigo"
    tipos_afiliacion ||--o{ afiliados : "tipo_afiliacion_codigo"
    eps ||--o{ afiliados : "eps_codigo"
    regimenes ||--o{ afiliados : "regimen_codigo"
    parentescos ||--o{ afiliados : "contacto_emergencia_parentesco_codigo"
    afiliados ||--o{ historial_estados : "afiliado_id (cascada)"

    tipos_documento { VARCHAR codigo PK "CC, TI, RC, CE, PA, PPT" }
    generos { VARCHAR codigo PK "M, F, Otro" }
    departamentos { CHAR codigo PK "DANE, 33 registros" }
    municipios { CHAR codigo PK "DANE, 84 registros" }
    regimenes { VARCHAR codigo PK "contributivo, subsidiado, especial, particular" }
    eps { VARCHAR codigo PK "21 entidades" }
    tipos_afiliacion { VARCHAR codigo PK "paciente, profesional, empresa" }
    parentescos { VARCHAR codigo PK "madre, padre, conyuge..." }
    afiliados {
        INT id PK
        VARCHAR documento "único con tipo_documento_codigo"
        VARCHAR correo UK
        DATE fecha_nacimiento
        VARCHAR telefono
        BOOLEAN acepta_tratamiento_datos "Ley 1581 de 2012"
        ENUM estado "PENDIENTE, ACTIVO, RECHAZADO"
    }
    historial_estados {
        BIGINT id PK
        INT afiliado_id FK
        ENUM estado_anterior
        ENUM estado_nuevo
        VARCHAR cambiado_por "correo del ADMIN"
        VARCHAR observacion
    }
```

- **Llaves foráneas a todos los catálogos:** MySQL rechaza un municipio, EPS o tipo de documento que no exista (verificado en Azure con el error `ER_NO_REFERENCED_ROW_2`).
- **Reglas colombianas en el servicio:** el tipo de documento según la edad (CC desde 18 años, TI de 7 a 17, RC menores de 7) y teléfono celular de 10 dígitos que empieza por 3 o fijo 60 + 8 dígitos.
- **Formulario:** la lista de municipios depende del departamento elegido.

### 2.3 `db_farmacias` (farmacias-service)

```mermaid
erDiagram
    medicamentos ||--o{ inventario : "medicamento_id"
    farmacias ||--o{ inventario : "farmacia_id"
    farmacias ||--o{ solicitudes : "farmacia_id"
    solicitudes ||--|{ solicitud_items : "solicitud_id"
    medicamentos ||--o{ solicitud_items : "medicamento_id"

    medicamentos {
        INT id PK
        VARCHAR codigo UK "MED-001 ... MED-100"
        VARCHAR nombre
        BOOLEAN requiere_formula
        BOOLEAN control_especial "no se pide en línea"
        DECIMAL precio_referencia
    }
    farmacias {
        INT id PK
        VARCHAR codigo UK "FAR-01 ... FAR-08"
        VARCHAR direccion
        VARCHAR municipio
        BOOLEAN abierta_24h
    }
    inventario {
        INT farmacia_id PK
        INT medicamento_id PK
        INT cantidad "nunca negativa"
        DECIMAL precio
    }
    solicitudes {
        INT id PK
        INT usuario_id "db_auth.usuarios.id (JWT)"
        VARCHAR usuario_email "db_auth.usuarios.email (JWT)"
        INT farmacia_id FK
        ENUM estado "PENDIENTE, LISTA, ENTREGADA, CANCELADA, RECHAZADA"
        DECIMAL total
    }
    solicitud_items {
        INT solicitud_id PK
        INT medicamento_id PK
        INT cantidad
        DECIMAL precio_unitario "precio al momento de pedir"
    }
    reabastecimientos {
        INT id PK
        CHAR semana UK "semana ISO: una vez por semana"
        DATE fecha "siempre un lunes"
        ENUM origen "AUTOMATICO, MANUAL"
    }
```

Ciclo de un pedido: el **usuario** lo crea (PENDIENTE) o lo cancela. El **ADMIN** lo marca LISTA y luego ENTREGADA, o lo RECHAZA. Al cancelar o rechazar, las unidades vuelven al inventario. Los lunes, los productos con menos de 60 unidades vuelven a 60.

### 2.4 `db_citas` (citas-service)

```mermaid
erDiagram
    especialidades ||--o{ medicos : "especialidad_id"
    sedes ||--o{ medicos : "sede_id"
    medicos ||--o{ horarios : "medico_id"
    medicos ||--o{ citas : "medico_id"

    especialidades { INT id PK
        VARCHAR nombre UK
        INT duracion_min "20 o 30 minutos" }
    sedes { INT id PK
        VARCHAR nombre UK
        VARCHAR zona }
    medicos { INT id PK
        VARCHAR registro_medico UK "ficticios" }
    horarios { INT id PK
        TINYINT dia_semana "1 = lunes ... 7 = domingo"
        TIME hora_inicio
        TIME hora_fin }
    citas {
        INT id PK
        INT usuario_id "db_auth.usuarios.id (JWT)"
        VARCHAR usuario_email "db_auth.usuarios.email (JWT)"
        VARCHAR usuario_doc "db_auth.usuarios.documento (JWT)"
        DATE fecha
        TIME hora
        ENUM estado "PROGRAMADA, ATENDIDA, NO_ASISTIO, CANCELADA"
        TINYINT activa "columna generada: 1 si PROGRAMADA"
    }
```

- **Disponibilidad:** se calcula con los horarios menos las citas programadas, en hora de Bogotá; no se guarda.
- **Doble reserva:** el índice único `(medico_id, fecha, hora, activa)` impide reservar dos veces el mismo horario aunque dos personas lo intenten al mismo tiempo (verificado en Azure). Al cancelar, `activa` pasa a NULL y el horario se libera.

### 2.5 `db_documentos` (documentos-service)

```mermaid
erDiagram
    documentos ||--o{ bitacora_descargas : "documento_id"
    documentos {
        CHAR id PK "UUID"
        VARCHAR paciente_doc "db_auth.usuarios.documento"
        VARCHAR nombre_guardado UK "archivo cifrado en storage/"
        VARCHAR content_type
        BIGINT tamano
        VARCHAR creado_por_doc "documento de quien lo subió (JWT)"
    }
    bitacora_descargas {
        BIGINT id PK
        CHAR documento_id FK
        VARCHAR usuario_doc "quién descargó (JWT)"
        VARCHAR rol_usuario
        VARCHAR ip_origen
    }
```

Los archivos están en `backend/services/documentos-service/storage/`, cifrados con AES-256-GCM (`DOCUMENTOS_ENCRYPTION_KEY`).

### 2.6 `db_notificaciones` (notification-service)

```mermaid
erDiagram
    notificaciones {
        BIGINT id PK
        VARCHAR destinatario "db_auth.usuarios.email"
        VARCHAR asunto
        VARCHAR servicio_origen "auth, registro, farmacias, citas"
        ENUM estado "ENVIADA, FALLIDA"
        VARCHAR message_id
        VARCHAR error
    }
```

No guarda el cuerpo del correo, para no almacenar enlaces de recuperación ni datos clínicos.

---

## 3. Cómo se relacionan los datos entre servicios

Al iniciar sesión, `auth-service` firma un **JWT** con `{ id, email, doc, rol }`. Los demás servicios **validan la firma** con el mismo `JWT_SECRET` y usan esos datos como identidad, sin consultar `db_auth`:

| Dato en otra base | Se relaciona con `db_auth.usuarios` por | Cómo llega |
|---|---|---|
| `db_farmacias.solicitudes.usuario_id` / `usuario_email` | `usuarios.id` / `email` | Campos `id` y `email` del JWT al pedir |
| `db_citas.citas.usuario_id` / `usuario_email` / `usuario_doc` | `usuarios.id` / `email` / `documento` | JWT al reservar |
| `db_documentos.documentos.paciente_doc`, `creado_por_doc`, `bitacora_descargas.usuario_doc` | `usuarios.documento` | Campo `doc` del JWT |
| `db_registro.historial_estados.cambiado_por` | `usuarios.email` del ADMIN | JWT del administrador |
| `db_notificaciones.notificaciones.destinatario` | `usuarios.email` | El servicio que pide el correo |
| `db_registro.afiliados.documento` y `correo` | `usuarios.documento` y `email` | Al aprobar la afiliación se crea la cuenta con los mismos datos (`npm run usuario:crear`) |
| Permisos (`MEDICO`, `ADMIN`) | `roles.nombre` | Campo `rol` del JWT; las rutas `/admin` exigen `ADMIN` |

**Consecuencias de diseño:**
- Los pedidos y las citas guardan el correo con el que se hicieron: si el usuario lo cambia después, el historial conserva el original.
- El JWT vale 8 horas. Si un administrador desactiva una cuenta, el usuario no podrá volver a iniciar sesión, pero el token vigente sigue sirviendo hasta que expire.
- Para cruzar datos de varias bases (como hace el panel de administración), se consulta el endpoint de cada servicio. Nunca se hace un `JOIN` entre bases.

---

## 4. Flujos completos

1. **Iniciar sesión:** `auth-service` valida en `db_auth`, registra el intento en `bitacora_acceso`, actualiza el bloqueo, pide la alerta por correo y entrega el JWT.
2. **Afiliarse:** el formulario carga los catálogos de `db_registro`. `registro-service` valida contra ellos, guarda en `afiliados` (estado PENDIENTE) y envía la confirmación. El ADMIN la aprueba o rechaza, y el cambio queda en `historial_estados`.
3. **Agendar una cita:** `citas-service` calcula los horarios libres, valida la franja, inserta en `citas` (el índice único evita la doble reserva) y envía la confirmación.
4. **Pedir medicamentos:** `farmacias-service` valida la fórmula, bloquea el inventario, descuenta, crea `solicitudes` + `solicitud_items` y envía la confirmación. El ADMIN lo despacha (LISTA y luego ENTREGADA) y el usuario recibe un correo.
5. **Documentos:** `documentos-service` cifra el archivo, guarda los metadatos y registra cada descarga.
6. **Panel de administración:** el navegador llama a `/admin/resumen` de los seis servicios con el JWT del ADMIN (ver `docs/PANEL_ADMIN.md`).

---

## 5. Seguridad de los datos

- **Conexión:** cifrada con Azure (`DB_SSL=true`, TLS 1.2) y firewall por IP.
- **Cifrado:** contraseñas con bcrypt, documentos con AES-256-GCM y correos sin cuerpo en el historial.
- **Consultas:** parametrizadas (`?`) en todos los servicios, para evitar inyección SQL.
- **Credenciales:** solo en los `.env` de cada servicio, que nunca se suben a git (ver los `.env.example`).
- **Auditoría:** `bitacora_acceso` (logins), `historial_estados` (afiliaciones), `bitacora_descargas` (documentos), `notificaciones` (correos) y `reabastecimientos` (inventario).
