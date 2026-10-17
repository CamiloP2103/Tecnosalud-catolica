# Pruebas automáticas

El proyecto tiene **203 pruebas automáticas**: 43 del frontend y 160 de los seis microservicios. Detectan si un cambio daña algo que ya funcionaba. **No necesitan MySQL, SMTP ni internet**: la base de datos, el correo y los demás servicios se simulan.

## Cómo correrlas

| Comando (desde la raíz) | Qué hace |
|---|---|
| `npm run test:todo` | **Todo**: revisión de imports, ESLint, pruebas del frontend y de los seis microservicios. Es lo mismo que corre GitHub |
| `npm test` | Solo las pruebas del frontend |
| `npm --prefix backend test` | Solo las pruebas de los microservicios, uno tras otro |
| `cd backend/services/<servicio> && npm test` | Las pruebas de un servicio |
| `npm run lint` | ESLint del frontend |
| `npm run verificar:imports` | Revisa que cada `import` coincida en mayúsculas con el archivo real: en Windows funciona igual, pero en Linux falla |

## Avisos automáticos

### En GitHub (cada vez que subes cambios)

`.github/workflows/ci.yml` se ejecuta en cada `push` y *pull request*, en Linux con Node 22:

1. **Frontend:** `npm ci` → revisión de imports → ESLint → pruebas → build de producción.
2. **Microservicios:** un trabajo por servicio, en paralelo (auth, notification, registro, farmacias, documentos y citas). Si uno falla, los demás se prueban igual, para ver el panorama completo.
3. **Dependencias:** `npm audit --audit-level=high` en el frontend y en cada servicio.

**Dónde ves el resultado:** junto a cada commit aparece **✔ verde** si todo pasó o **✘ roja** si algo falló. En la pestaña **Actions** del repositorio está el detalle de qué prueba falló y por qué. **GitHub envía un correo** al autor del commit cuando una ejecución falla. También se puede ejecutar a mano desde Actions → *Pruebas* → *Run workflow*.

> Para que GitHub acepte el archivo del flujo, el token con que haces `git push` debe tener el permiso **workflow** (ver README → "Permiso workflow").

### En VS Code (mientras programas)

- Al abrir el proyecto, VS Code sugiere instalar **Vitest** y **ESLint** (`.vscode/extensions.json`).
- Con la extensión Vitest, todas las pruebas aparecen en el panel **Testing** (ícono de matraz), en árbol por archivo, con **marca verde o roja**. Se pueden correr todas, un archivo o una sola prueba, y al fallar se ve la línea exacta.
- ESLint subraya en rojo los errores mientras escribes.
- **Tarea "Probar todo":** `Ctrl+Shift+P` → *Tasks: Run Test Task* ejecuta lo mismo que GitHub.

## Qué prueba cada archivo

### Frontend (`src/__tests__/`, Vitest + Testing Library)

| Archivo | Pruebas | Qué verifica |
|---|---|---|
| `navegacion.test.jsx` | 4 | Menú, migas de pan, página 404 y pie de página |
| `acceso.test.jsx` | 1 | Validación del formulario de inicio de sesión |
| `responsive.test.jsx` | 1 | Estructura adaptable |
| `servicios.test.js` | 7 | Mensajes de error: servicio apagado, base de datos caída (503), error interno, respuesta inválida |
| `registro.test.jsx` | 5 | Catálogos desde el servicio, municipio que depende del departamento, teléfono colombiano y envío de códigos sin el departamento |
| `citas.test.jsx` | 3 | Horarios libres por día, reserva con sesión, horario tomado por otra persona y cancelación |
| `farmacias.test.jsx` | 8 | Catálogo con tipo de venta, disponibilidad por sede, carrito, fórmula médica, existencias insuficientes (409), menú solo con sesión |
| `documentos.test.jsx` | 5 | Consulta con sesión, permisos de paciente y médico, carga multipart, servicio caído y 503 |
| `panelAdmin.test.jsx` | 9 | Solo ADMIN, indicadores, contadores del menú, servicio caído, despacho de pedidos, sin emojis y opción del menú según el rol |

### Microservicios (`backend/services/*/tests/`, Vitest + Supertest)

| Servicio | Archivo | Pruebas | Qué verifica |
|---|---|---|---|
| auth | `auth.test.js` | 24 | Login, JWT, bloqueo tras 5 fallos (en la base), bitácora, recuperación y restablecimiento de contraseña, correo de alerta escapado, 503 |
| auth | `admin.test.js` | 5 | Rutas `/admin` solo para ADMIN, resumen, búsqueda escapada, activar, desactivar y desbloquear; el admin no se desactiva a sí mismo |
| auth | `script-sql.test.js` | 5 | Cada hash del script SQL corresponde a su clave documentada |
| notification | `notification.test.js` | 12 | `x-api-key`, envío, error SMTP sin detalles, historial (enviada y fallida), el correo sale aunque falle la base, resumen admin con JWT y CORS solo en esa ruta |
| registro | `registro.test.js` | 21 | Validación contra catálogos, documento según edad, teléfono, fechas, habeas data, 409, 503, rutas admin con historial y estructura del script SQL (llaves foráneas, códigos DANE coherentes) |
| farmacias | `app.test.js` | 19 | Catálogo, sedes, inventario, pedidos con y sin fórmula, control especial, existencias insuficientes, JSON mal formado y 503 |
| farmacias | `repositorio.test.js` | 6 | Transacción con `FOR UPDATE`, descuento, rollback sin existencias y cancelación |
| farmacias | `validators.test.js` | 11 | Validación del pedido, vigencia de la fórmula y fecha de Bogotá |
| farmacias | `reabastecimiento.test.js` | 9 | Solo los lunes en hora de Bogotá, una vez por semana, programación automática |
| farmacias | `admin.test.js` | 10 | Resumen, pedidos por estado, transiciones válidas, devolución de unidades al rechazar y correo |
| farmacias | `script-sql.test.js` | 5 | 100 medicamentos, 8 farmacias y reglas de fórmula |
| documentos | `documentos.test.js` | 11 | Cifrado AES-GCM y detección de manipulación, permisos, carga de PDF, generación, descarga con bitácora, 503 y resumen admin |
| citas | `agenda.test.js` | 11 | Franjas según duración, pasado, fines de semana, 60 días y hora de Bogotá |
| citas | `app.test.js` | 11 | Disponibilidad, reserva, horario tomado (409), cancelación, 503 y rutas admin |

## Qué hacer si una prueba falla

1. Lee el nombre de la prueba: dice en español qué comportamiento se rompió.
2. Corre solo ese archivo, por ejemplo `npx vitest run src/__tests__/farmacias.test.jsx`, o con el botón de la prueba en el panel Testing.
3. Si el cambio en el comportamiento fue **intencional**, actualiza la prueba. Si no, corrige el código.
4. Antes de subir, corre `npm run test:todo`.
