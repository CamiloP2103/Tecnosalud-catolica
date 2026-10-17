// Íconos de línea en SVG (estilo médico e institucional). Heredan el color del texto (currentColor).

function Icono({ children, tamano = 20, titulo }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : 'true'}
      role={titulo ? 'img' : undefined}
      focusable="false"
    >
      {titulo && <title>{titulo}</title>}
      {children}
    </svg>
  );
}

export const IconoResumen = (p) => (
  <Icono {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Icono>
);

export const IconoCalendario = (p) => (
  <Icono {...p}><rect x="3" y="4.5" width="18" height="16.5" rx="2" /><path d="M16 3v3M8 3v3M3 10h18" /><path d="M12 13.5v4M10 15.5h4" /></Icono>
);

export const IconoMedicamento = (p) => (
  <Icono {...p}><path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7Z" /><path d="m8.5 8.5 7 7" /></Icono>
);

export const IconoPedido = (p) => (
  <Icono {...p}><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" /><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="m9 13 2 2 4-4" /></Icono>
);

export const IconoAfiliacion = (p) => (
  <Icono {...p}><path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-3Z" /><path d="M12 8v6M9 11h6" /></Icono>
);

export const IconoUsuarios = (p) => (
  <Icono {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Icono>
);

export const IconoDocumento = (p) => (
  <Icono {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Icono>
);

export const IconoCorreo = (p) => (
  <Icono {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" /></Icono>
);

export const IconoActualizar = (p) => (
  <Icono {...p}><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 21v-5h-5" /></Icono>
);

export const IconoPulso = (p) => (
  <Icono {...p}><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></Icono>
);

export const IconoAlerta = (p) => (
  <Icono {...p}><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></Icono>
);

export const IconoFarmacia = (p) => (
  <Icono {...p}><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M12 10v6M9 13h6" /></Icono>
);

export const IconoMenu = (p) => (
  <Icono {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icono>
);

export const IconoBuscar = (p) => (
  <Icono {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icono>
);
