# Panel de administración

Panel para el usuario con rol **ADMIN**. Reúne la información de los seis microservicios y permite actuar sobre ella. Está en `src/components/pages/Admin/` y se abre desde la opción **"Panel de administración"** del menú principal, que solo aparece cuando la sesión es de un ADMIN.

## Cómo entrar

1. Inicia sesión en **Acceso** con una cuenta de rol ADMIN.
2. En el menú aparece **Panel de administración**.
3. Si alguien sin rol ADMIN abre la dirección `#/admin`, ve "Acceso solo para administradores", y los servicios responden 403 de todas formas.

Cuentas de administrador nuevas: `cd backend && npm run usuario:crear -- --email … --nombre "…" --doc … --tipo CC --rol ADMIN`.

## Cómo está construido

| Archivo | Responsabilidad |
|---|---|
| `PanelAdmin.jsx` | Estructura: menú lateral, encabezado, carga de datos y cambio de sección |
| `api.js` | Llamadas a `/admin` de cada servicio con el JWT. `cargarResumenes()` usa `Promise.allSettled`: si un servicio falla, los demás se muestran igual |
| `componentes.jsx` | Piezas reutilizables: `Indicador`, `Tarjeta`, `Tabla`, `Barra`, `Distribucion`, `Insignia` y formatos de pesos y fechas |
| `iconos.jsx` | Íconos SVG de línea dibujados para el proyecto (sin emojis ni librerías externas) |
| `secciones/*.jsx` | Una sección por tema (abajo) |
| `PanelAdmin.css` | Estilos con paleta institucional de salud; se adapta a celular (el menú se despliega con un botón) |

## Menú y secciones

El menú lateral muestra un **contador** junto a lo que requiere atención: pedidos pendientes, productos agotados, afiliaciones por revisar, cuentas bloqueadas, correos fallidos y citas de hoy. Si un servicio no responde, su sección muestra un **"!"** rojo.

| Sección | Qué muestra | Acciones | Endpoints |
|---|---|---|---|
| **Resumen general** | Tarjetas con citas de hoy, unidades en inventario, pedidos por despachar, afiliaciones por revisar, usuarios, documentos y correos; estado de los seis microservicios; ocupación de citas | Clic en una tarjeta lleva a su sección | `GET /admin/resumen` de los seis |
| **Citas médicas** | Ocupación de la semana (reservadas, libres, atendidas, no asistió, canceladas), disponibilidad por especialidad con la próxima franja libre, agenda de hoy o de 7 días | Marcar **Atendida**, **No asistió** o **Cancelar** | `citas: /admin/resumen`, `/admin/citas`, `PATCH /admin/citas/:id/estado` |
| **Farmacias e inventario** | Unidades, valor estimado, agotados, productos con menos de 10 unidades, existencias por farmacia con barras, más pedidos, estado del reabastecimiento de los lunes | — | `farmacias: /admin/resumen` |
| **Pedidos de medicamentos** | Pedidos filtrados por estado, con usuario, farmacia, productos y total | **Marcar lista**, **Entregada** o **Rechazar** (las unidades vuelven al inventario y el usuario recibe un correo) | `farmacias: /admin/solicitudes`, `PATCH /admin/solicitudes/:id/estado` |
| **Afiliaciones** | Totales por estado, distribución por EPS, régimen y departamento, lista con búsqueda | **Aprobar** o **Rechazar** con observación (queda en `historial_estados`) | `registro: /admin/resumen`, `/admin/afiliados`, `PATCH /admin/afiliados/:id/estado` |
| **Usuarios y accesos** | Usuarios por rol, bloqueados, accesos de 24 horas, lista con búsqueda, último acceso y fecha de la última constancia enviada, accesos recientes, fallos por motivo | **Enviar constancia** (PDF con sus datos y fecha de registro, protegido con su número de identificación), **Enviar constancias a todos**, **Desbloquear**, **Activar** o **Desactivar** (no puedes desactivar tu propia cuenta) | `auth: /admin/resumen`, `/admin/usuarios`, `PATCH /admin/usuarios/:id/activo`, `POST /admin/usuarios/:id/desbloquear`, `POST /admin/usuarios/:id/constancia`, `POST /admin/constancias` |
| **Documentos clínicos** | Total, pacientes, espacio usado, tipos de archivo, últimos documentos y bitácora de descargas | — | `documentos: /admin/resumen` |
| **Correos** | Enviados y fallidos, últimas 24 horas, distribución por servicio de origen y últimos correos | — | `notifications: /admin/resumen` |

## Actualización

- **Botón "Actualizar":** vuelve a pedir los seis resúmenes.
- **"Actualizar cada minuto":** si está marcado, refresca solo cada 60 segundos.
- **Después de cada acción** (despachar, aprobar…) se recargan la lista y los contadores.

## Pruebas

`src/__tests__/panelAdmin.test.jsx` comprueba:
- Que solo entra un ADMIN, y que la opción del menú se muestra únicamente para ese rol.
- Los indicadores, los contadores del menú y el despacho de un pedido.
- Que un servicio caído no oculta los demás.
- Que el panel no muestra emojis y usa íconos SVG.
