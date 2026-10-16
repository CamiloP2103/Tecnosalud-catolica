# farmacias-service (puerto 3004)

Microservicio de Farmacias: catálogo de 100 medicamentos comunes, 8 farmacias de Bogotá y municipios cercanos, inventario por farmacia y solicitudes de medicamentos de los usuarios. Base de datos propia: `db_farmacias`.

## Endpoints (`/api/farmacias`)

| Método | Ruta | Sesión | Descripción |
|---|---|---|---|
| GET | `/health` | No | Estado del servicio |
| GET | `/medicamentos?buscar=&categoria=&requiereFormula=true\|false` | No | Catálogo con unidades disponibles y número de farmacias con existencias |
| GET | `/medicamentos/categorias` | No | Categorías y cuántos medicamentos tiene cada una |
| GET | `/medicamentos/:id` | No | Detalle y disponibilidad en cada farmacia (cantidad y precio) |
| GET | `/sedes?municipio=` | No | Farmacias (dirección, horario, si abre 24 h) |
| GET | `/sedes/:id` | No | Detalle de una farmacia |
| GET | `/sedes/:id/inventario?buscar=&categoria=&disponibles=true` | No | Inventario de una farmacia |
| POST | `/solicitudes` | Sí | Solicita medicamentos en una farmacia |
| GET | `/solicitudes` | Sí | Solicitudes del usuario de la sesión |
| PATCH | `/solicitudes/:id/cancelar` | Sí | Cancela una solicitud pendiente y devuelve las unidades al inventario |

"Sesión" significa la cabecera `Authorization: Bearer <token>` con el JWT que entrega `auth-service` al iniciar sesión. Por eso `JWT_SECRET` debe ser **igual** al de `auth-service`.

### Ejemplo de solicitud

```json
POST /api/farmacias/solicitudes
{
  "farmaciaId": 1,
  "items": [
    { "medicamentoId": 1, "cantidad": 2 },
    { "medicamentoId": 18, "cantidad": 1 }
  ],
  "formula": {
    "numero": "F-1234",
    "medico": "Dra. Laura Rojas",
    "registroMedico": "RM-56789",
    "fecha": "2026-10-15"
  },
  "observaciones": "Reclama mi hija"
}
```

## Reglas de negocio

- **Venta libre**: se puede solicitar sin fórmula.
- **Requiere fórmula**: hay que enviar `formula` con número, médico, registro médico y fecha. La fórmula vence a los 30 días y no puede tener fecha futura. Responde `422` si falta y `400` si es inválida.
- **Control especial** (Fondo Nacional de Estupefacientes): no se puede solicitar en línea (`422`); se reclama en la farmacia con la fórmula oficial en original.
- Hasta 10 medicamentos distintos por solicitud y 10 unidades de cada uno.
- **Existencias**: se descuentan en una transacción con bloqueo de filas (`SELECT … FOR UPDATE`), así dos solicitudes al mismo tiempo no pueden llevarse las mismas unidades. Si falta algo, responde `409` con el detalle y no descuenta nada.
- Cancelar solo aplica a solicitudes `PENDIENTE` del propio usuario y devuelve las unidades.
- Al crear una solicitud se envía un correo de confirmación por medio del `notification-service`.

## Base de datos

`database/Script_Creacion_BasedeDatosFarmacias.sql` crea las tablas `medicamentos`, `farmacias`, `inventario`, `solicitudes` y `solicitud_items`, y carga los datos. Ejecútalo con `cd backend && npm run db:init`.

- **Medicamentos**: 100 de uso común en Colombia (33 de venta libre, 63 con fórmula y 4 de control especial). Los precios son referencias **aproximadas y solo demostrativas**.
- **Farmacias**: sedes reales de Farmatodo y Droguerías Colsubsidio en Bogotá (Chapinero, Fontibón, Teusaquillo, Kennedy, Usaquén), Chía, Cajicá y Soacha. Las direcciones y horarios se tomaron de los directorios públicos de cada cadena en octubre de 2026 y pueden cambiar.
- **Inventario**: **ficticio**, generado de forma determinística para la demostración.

## Arranque

1. Copia `.env.example` como `.env` y completa los valores (`JWT_SECRET` y `NOTIFICATION_API_KEY` iguales a los de los otros servicios).
2. Ejecuta `npm install` y luego `npm run dev`.
3. Pruebas: `npm test` (no necesita MySQL).
