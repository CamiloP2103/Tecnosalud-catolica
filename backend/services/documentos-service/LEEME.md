# documentos-service (puerto 3006)

Microservicio de Documentos clínicos: carga, generación y descarga de documentos de la historia clínica. Los archivos se guardan **cifrados con AES-256-GCM** en la carpeta `storage/` del servicio. La base de datos propia `db_documentos` guarda solo los metadatos y la bitácora de descargas.

## Endpoints (`/api/documentos`)

Todos, excepto `/health`, requieren la cabecera `Authorization: Bearer <token>` con el JWT de `auth-service`.

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado del servicio |
| GET | `/?documentoPaciente=` | Titular o MEDICO/ADMIN | Lista los documentos de un paciente |
| POST | `/` (multipart: `documentoPaciente`, `titulo`, `descripcion`, `archivo`) | Titular o MEDICO/ADMIN | Carga un PDF, PNG o JPG de hasta 10 MB |
| POST | `/generar` (JSON: `documentoPaciente`, `titulo`, `contenido`) | Solo MEDICO/ADMIN | Genera un documento de texto |
| POST | `/:id/descargar` (JSON: `documentoAcceso`) | Titular o MEDICO/ADMIN | Descarga el archivo descifrado y lo registra en la bitácora |

## Seguridad

- **Permisos**: un paciente solo ve, carga y descarga **sus propios** documentos (compara su número de documento del JWT). Los roles `MEDICO` y `ADMIN` pueden gestionar documentos de otros pacientes.
- **Cifrado**: cada archivo se cifra con AES-256-GCM, con un vector de inicialización aleatorio y una etiqueta de autenticación, así que un archivo modificado no se descifra. La clave es `DOCUMENTOS_ENCRYPTION_KEY`. **Si se pierde o se cambia, los archivos guardados no se pueden recuperar.**
- **Validación de archivos**: además del tipo declarado, se revisa la firma real del contenido (los "magic bytes" de PDF, PNG o JPG) y la extensión. El nombre original se limpia de caracteres peligrosos.
- **Descarga confirmada**: el usuario debe escribir su número de identificación, que tiene que coincidir con el de la sesión. Cada descarga queda registrada en `bitacora_descargas` (usuario, rol, IP, navegador y fecha).
- Respuestas sin caché (`Cache-Control: no-store`) y `X-Content-Type-Options: nosniff`.

## Base de datos

`database/Script_Creacion_BasedeDatosDocumentos.sql` crea las tablas `documentos` y `bitacora_descargas`. Ejecútalo con `cd backend && npm run db:init` (o solo esta base con `npm run db:init -- documentos`).

## Arranque

1. Copia `.env.example` como `.env`. Configura `JWT_SECRET` (igual al de `auth-service`), `DOCUMENTOS_ENCRYPTION_KEY` (genérala con el comando que trae el archivo) y los datos de MySQL.
2. Ejecuta `npm install` y luego `npm run dev`.
3. Pruebas: `npm test` (no necesita MySQL).

> Basado en el microservicio desarrollado por un compañero del equipo y adaptado a la arquitectura del proyecto: puerto 3006, errores 503 de base de datos, pruebas con Vitest, `node --watch` e integración con `db:init`.
