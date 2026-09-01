# Documentación del proyecto Tecnosalud Católica

## 1. Descripción general

Tecnosalud Católica es una aplicación web desarrollada con React y Vite para una marca de salud, tecnología e ingeniería. El proyecto se presenta como una SPA (Single Page Application) orientada a mostrar información institucional, facilitar el registro de afiliados y permitir el acceso a usuarios con autenticación simulada.

La solución visualmente está enfocada en un estilo institucional con branding azul y amarillo, integración de elementos gráficos y contenido orientado a salud, innovación y confianza.

## 2. Objetivo del sistema

El proyecto busca:

- Presentar la identidad institucional de Tecnosalud Católica.
- Dar acceso a información sobre la empresa, valores, misión, visión y servicios.
- Permitir que nuevos usuarios completen un formulario de afiliación.
- Simular procesos de autenticación y recuperación de usuario/contraseña.
- Mostrar una interfaz dinámica con navegación por secciones y menú desplegable.

## 3. Stack tecnológico

### Frontend
- React 18
- Vite 5
- JavaScript / JSX
- CSS modular y archivos .css por componente

### Dependencias principales
- react
- react-dom
- @vitejs/plugin-react
- vite
- eslint
- eslint-plugin-react

## 4. Estructura del proyecto

```text
Tecnosalud-catolica/
├── index.html
├── package.json
├── README.md
├── DOCUMENTACION.md
├── vite.config.js
├── public/
│   └── robots.txt
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Layout.css
│   │   │   └── Layout.jsx
│   │   ├── Navbar/
│   │   │   ├── Navbar.css
│   │   │   ├── Navbar.jsx
│   │   │   └── Images/
│   │   └── pages/
│   │       ├── Acceso/
│   │       │   ├── Acceso.css
│   │       │   └── Acceso.jsx
│   │       ├── Afiliados/
│   │       │   ├── Afiliados.css
│   │       │   ├── Medicamentos.jsx
│   │       │   ├── MuerteDigna.jsx
│   │       │   └── Triage.jsx
│   │       ├── Inicio/
│   │       │   ├── Inicio.css
│   │       │   ├── Inicio.jsx
│   │       │   └── Images/
│   │       ├── Nosotros/
│   │       │   ├── Nosotros.css
│   │       │   └── Nosotros.jsx
│   │       ├── Registro/
│   │       │   ├── Registro.css
│   │       │   └── Registro.jsx
│   │       └── ServiciosSalud/
│   │           ├── ServiciosSalud.css
│   │           └── ServiciosSalud.jsx
│   └── styles/
│       └── global.css
└── .gitignore
```

## 5. Flujo principal de la aplicación

### 5.1 Componente raíz
El punto de entrada de la app se encuentra en `src/App.jsx`.

Este archivo:

- Define la navegación principal.
- Gestiona la página activa con `useState`.
- Carga de forma perezosa cada sección con `lazy()` y `Suspense`.
- Controla la sesión activa con `localStorage`.
- Muestra el navbar y el layout base para todas las vistas.

### 5.2 Navegación
La navegación se maneja con:

- `currentPage` para identificar la vista activa.
- `handleNavigate(pageId)` para cambiar la vista.
- Menú con dropdowns para secciones de tipo “Nosotros” y “Afiliados”.

### 5.3 Estado de sesión
La sesión del usuario se almacena en localStorage usando la clave:

- `tecnosalud_sesion_activa`

Esto permite:

- activar el acceso a “Servicios Clínicos” cuando el usuario inicia sesión.
- mantener la sesión en recargas del navegador.
- cerrar sesión y volver a la vista de acceso.

## 6. Módulos y pantallas principales

### Inicio
Archivo: `src/components/pages/Inicio/Inicio.jsx`

Incluye:

- Hero section con texto institucional.
- Botón de acción para conocer más sobre la empresa.
- Hora de carga de la vista basada en `new Date().toLocaleTimeString(...)`.
- Footer con texto promocional de marca.

### Nosotros
Archivo: `src/components/pages/Nosotros/Nosotros.jsx`

Se asume como una sección informativa de la organización con contenido institucional, misión, visión, valores y posible información sobre trabajo en la empresa.

### Registro
Archivo: `src/components/pages/Registro/Registro.jsx`

Funcionalidades actuales:

- Formulario completo de afiliación con datos personales.
- Validación de campos obligatorios.
- Validación de fecha de nacimiento.
- Validación del correo electrónico.
- Validación del teléfono y contacto de emergencia.
- Aceptación de tratamiento de datos.
- Captcha simple local.
- Modal de éxito al finalizar el registro.

### Acceso
Archivo: `src/components/pages/Acceso/Acceso.jsx`

Funciones principales:

- Inicio de sesión con credenciales simuladas.
- Validación de usuario y contraseña.
- Captcha local para protección del login.
- Recordar usuario en localStorage.
- Recuperación de usuario por documento y correo.
- Recuperación de contraseña por correo y documento.
- Modal de bienvenida y cierre de sesión.

### Afiliados
Archivos vinculados:

- `src/components/pages/Afiliados/MuerteDigna.jsx`
- `src/components/pages/Afiliados/Medicamentos.jsx`
- `src/components/pages/Afiliados/Triage.jsx`

Estos modulos están pensados para representar contenido relacionado con atención, trámites y servicios de afiliación, aunque en el estado actual se mantienen como vistas específicas dentro del sistema.

### Servicios de salud
Archivo: `src/components/pages/ServiciosSalud/ServiciosSalud.jsx`

Es una vista adicional que aparece en la navegación cuando el usuario ha iniciado sesión correctamente.

## 7. Datos simulados y pruebas funcionales

El módulo de acceso usa una lista local llamada `DUMMY_USERS` con usuarios de prueba, por ejemplo:

- Carlos Jiménez
- Carlos Admin
- María Gómez
- Soporte Técnico
- Afiliaciones Bogotá

Estas credenciales permiten probar la lógica de autenticación sin backend real.

También se incluyen listas de correos y documentos distractores para simular flujos de recuperación de cuenta.

## 8. Persistencia y almacenamiento local

El proyecto emplea `localStorage` para manejar:

- `tecnosalud_sesion_activa`: guarda la sesión autenticada del usuario.
- `tecnosalud_usuario_recordado`: recuerda el correo del usuario si se activa la opción de recordar usuario.

Esto permite que la aplicación mantenga una experiencia simple, sin un backend ni base de datos.

## 9. Estilos y UI

Los estilos están definidos por componentes en archivos CSS separados, por ejemplo:

- `src/components/Navbar/Navbar.css`
- `src/components/Layout/Layout.css`
- `src/components/pages/Inicio/Inicio.css`
- `src/components/pages/Acceso/Acceso.css`
- `src/components/pages/Registro/Registro.css`
- `src/styles/global.css`

La interfaz usa una identidad visual con:

- fondo claro
- azul institucional
- amarillo de acento
- diseño moderno y tipo corporativo
- botones, cards y formularios con diseño adaptable

## 10. Cómo ejecutar el proyecto

Desde la raíz del proyecto:

```bash
npm install
npm run dev
```

### Scripts disponibles

En `package.json` se definen estos comandos:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src --ext .js,.jsx"
}
```

## 11. Estado actual del proyecto

Hasta este momento, el proyecto se encuentra en una etapa de prototipo funcional con:

- navegación SPA completa
- pantallas principales desarrolladas
- autenticación simulada
- registro de afiliación funcional a nivel frontend
- formularios con validación local
- persistencia con `localStorage`
- branding y diseño de la marca Tecnosalud Católica

## 12. Limitaciones actuales

El sistema todavía no cuenta con:

- backend real
- conexión a base de datos
- autenticación segura con JWT o sesiones servidor
- REST API
- gestión real de usuarios y afiliados
- despliegue en entorno productivo
- pruebas automatizadas de frontend

## 13. Posibles mejoras futuras

1. Integrar backend con Node.js o Express.
2. Conectar formulario de registro a base de datos.
3. Implementar autenticación real con JWT + cookies o tokens.
4. Añadir validaciones más robustas en frontend y backend.
5. Crear rutas protegidas para servicios clínicos.
6. Rediseñar la estructura para componentes más reutilizables.
7. Añadir gestión de estados con Redux, Zustand o Context API más scalable.
8. Implementar pruebas unitarias y de integración.

## 14. Resumen ejecutivo

Tecnosalud Católica es un proyecto frontend orientado a presentar y operar un portal de salud con enfoque institucional. Actualmente cumple con una propuesta visual sólida y una experiencia de usuario funcional básica para navegación, registro y autenticación local. La base del proyecto está lista para evolucionar hacia un sistema más completo con backend, control de seguridad y gestión real de datos.

## 15. Observación final

Este documento se ha elaborado a partir del estado real del código fuente del proyecto hasta el momento y sirve como referencia técnica y operativa para continuar el desarrollo.
