# Tecnosalud Católica

Aplicación SPA construida con React y Vite.

## Estructura

- `src/App.jsx`: estado global y selección de página.
- `src/components/Navbar`: navegación principal.
- `src/components/Layout`: estructura general.
- `src/components/pages/Inicio`: bienvenida y hora de carga.
- `src/components/pages/Nosotros`: información institucional y contador.
- `src/components/pages/Afiliados`: formulario de afiliación.
- `src/components/pages/Acceso`: formulario de acceso.

## Ejecución

### Frontend

```bash
npm install
npm run dev
```

El frontend se inicia normalmente en `http://localhost:5173`.

### Backend

En otra terminal:

```bash
cd backend
npm install
npm start
```

El backend queda disponible en `http://localhost:3001`.

### Tests

Desde la raíz del proyecto:

```bash
npm test
```

Para ejecutar únicamente los tests del backend:

```bash
cd backend
npm test
```

El backend trabaja actualmente en memoria. Los registros nuevos se pierden al reiniciar el servidor porque todavía no hay una base de datos conectada.
