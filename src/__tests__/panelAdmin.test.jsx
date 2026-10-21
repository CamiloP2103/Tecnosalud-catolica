import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PanelAdmin from '../components/pages/Admin/PanelAdmin';

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo });

const RESUMENES = {
  3002: {
    usuarios: { total: 7, activos: 6, inactivos: 1, bloqueados: 1, nuevos7Dias: 2, porRol: [{ rol: 'PACIENTE', total: 3 }, { rol: 'ADMIN', total: 3 }] },
    accesos24h: { total: 4, exitosos: 3, fallidos: 1 },
    fallosPorMotivo7Dias: [{ motivo: 'CLAVE_INCORRECTA', total: 1 }],
    accesosRecientes: [],
  },
  3003: { total: 4, pendientes: 2, activos: 1, rechazados: 1, ultimos7Dias: 3, porEps: [{ nombre: 'Compensar EPS', total: 2 }], porRegimen: [], porTipoAfiliacion: [], porDepartamento: [] },
  3004: {
    catalogo: { medicamentos: 100, conFormula: 63, controlEspecial: 4 },
    inventario: { unidades: 20404, productosAgotados: 7, productosBajos: 100, valorEstimado: 240297000, umbralBajo: 10 },
    porFarmacia: [{ id: 1, nombre: 'Farmatodo Parque 93', municipio: 'Bogotá D.C.', abierta24h: true, unidades: 2500, productos: 85, agotados: 1, bajos: 12 }],
    bajoStock: [{ farmacia: 'Farmatodo Parque 93', medicamento: 'Amoxicilina', concentracion: '500 mg', cantidad: 0 }],
    solicitudes: { porEstado: { PENDIENTE: { total: 3, valor: 21000 }, LISTA: { total: 1, valor: 7000 } }, total: 4, ventas: 28000 },
    masPedidos: [],
    reabastecimiento: { objetivo: 60, ultimo: null, hoyEsLunes: false, hechoEstaSemana: false, proximo: '2026-10-19' },
  },
  3005: { total: 5, enviadas: 5, fallidas: 0, ultimas24h: 5, porServicio: [], recientes: [] },
  3006: { documentos: { total: 0, bytes: 0, pacientes: 0, ultimos7Dias: 0 }, porTipo: [], descargas: { total: 0, ultimas24h: 0 }, recientes: [], descargasRecientes: [] },
  3007: {
    hoy: '2026-10-16', semana: { desde: '2026-10-16', hasta: '2026-10-22', porEstado: { PROGRAMADA: 2 } },
    ocupacion: { reservadas: 2, libres: 630, porcentaje: 0 }, medicos: 14, porEspecialidad: [], citasHoy: [],
  },
};

const PEDIDOS = [{ id: 3, usuarioEmail: 'paciente@x.co', estado: 'PENDIENTE', total: 7000, creadoEn: '2026-10-16T15:00:00Z', farmacia: 'Farmatodo Parque 93', municipio: 'Bogotá D.C.', productos: 1, unidades: 2 }];

function simular({ caidos = [] } = {}) {
  return vi.fn(async (url, opciones = {}) => {
    const { port, pathname } = new URL(url);
    if (caidos.includes(Number(port))) throw new TypeError('Failed to fetch');
    if (opciones.method === 'PATCH') return respuesta(200, { id: 3, estado: 'LISTA' });
    if (pathname.endsWith('/admin/resumen')) return respuesta(200, RESUMENES[port]);
    if (pathname.endsWith('/admin/solicitudes')) return respuesta(200, { solicitudes: PEDIDOS });
    if (pathname.endsWith('/admin/citas')) return respuesta(200, { citas: [] });
    if (pathname.endsWith('/admin/afiliados')) return respuesta(200, { afiliados: [] });
    if (pathname.endsWith('/admin/usuarios')) return respuesta(200, { usuarios: [{ id: 6, nombre: 'Juan', email: 'juan@x.co', tipoDoc: 'CC', documento: '1000000001', rol: 'PACIENTE', activo: true, bloqueado: false, ultimaConstancia: null }] });
    if (opciones.method === 'POST' && pathname.endsWith('/constancia')) return respuesta(200, { usuarioId: 6, email: 'juan@x.co', estado: 'ENVIADA' });
    if (opciones.method === 'POST' && pathname.endsWith('/admin/constancias')) return respuesta(200, { total: 2, enviadas: 2, fallidas: 0 });
    return respuesta(404, { error: 'no encontrado' });
  });
}

function sesion(rol) {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((clave) => ({ tecnosalud_token: 'token-admin', tecnosalud_sesion_activa: JSON.stringify({ id: 7, nombre: 'Admin', rol }) }[clave] || null)),
    setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Panel de administración', () => {
  it('solo lo ve un usuario con rol ADMIN', () => {
    sesion('PACIENTE');
    const fetch = simular();
    vi.stubGlobal('fetch', fetch);
    render(<PanelAdmin />);
    expect(screen.getByRole('heading', { name: 'Acceso solo para administradores' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('muestra los indicadores de los seis servicios con la sesión del administrador', async () => {
    sesion('ADMIN');
    const fetch = simular();
    vi.stubGlobal('fetch', fetch);
    render(<PanelAdmin />);

    expect(await screen.findByText('20.404')).toBeInTheDocument(); // unidades en inventario
    expect(screen.getByRole('button', { name: /Pedidos por despachar\s*4/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Afiliaciones por revisar\s*2/ })).toBeInTheDocument();
    expect(screen.getAllByText('Funcionando')).toHaveLength(6);
    expect(fetch.mock.calls.every(([, o]) => o.headers.Authorization === 'Bearer token-admin')).toBe(true);
  });

  it('muestra contadores de pendientes en el menú lateral', async () => {
    sesion('ADMIN');
    vi.stubGlobal('fetch', simular());
    render(<PanelAdmin />);
    const menu = await screen.findByRole('complementary', { name: 'Secciones del panel' });
    await waitFor(() => expect(within(menu).getByRole('button', { name: /Pedidos de medicamentos\s*3/ })).toBeInTheDocument());
    expect(within(menu).getByRole('button', { name: /Farmacias e inventario\s*7/ })).toBeInTheDocument();
  });

  it('si un servicio está caído, lo marca y muestra los demás', async () => {
    sesion('ADMIN');
    vi.stubGlobal('fetch', simular({ caidos: [3007] }));
    render(<PanelAdmin />);
    expect(await screen.findByText('Con problemas')).toBeInTheDocument();
    expect(screen.getAllByText('Funcionando')).toHaveLength(5);
    expect(screen.getByText('20.404')).toBeInTheDocument();
  });

  it('las tarjetas llevan a su sección y el administrador puede despachar un pedido', async () => {
    sesion('ADMIN');
    const fetch = simular();
    vi.stubGlobal('fetch', fetch);
    render(<PanelAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: /Pedidos por despachar/ }));
    expect(screen.getByRole('heading', { name: 'Pedidos de medicamentos', level: 2 })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar lista' }));

    await waitFor(() => expect(fetch.mock.calls.some(([u, o]) => o.method === 'PATCH' && u.endsWith('/admin/solicitudes/3/estado'))).toBe(true));
    const [, opciones] = fetch.mock.calls.find(([, o]) => o.method === 'PATCH');
    expect(JSON.parse(opciones.body)).toEqual({ estado: 'LISTA' });
    expect(await screen.findByRole('status')).toHaveTextContent('Pedido #3 actualizado a "Lista"');
  });

  it('no usa emojis: los íconos son SVG', async () => {
    sesion('ADMIN');
    vi.stubGlobal('fetch', simular());
    const { container } = render(<PanelAdmin />);
    await screen.findByText('20.404');
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(10);
  });
});

describe('Opción del menú principal', () => {
  it.each([
    ['ADMIN', true],
    ['MEDICO', false],
    ['PACIENTE', false],
  ])('con rol %s la opción "Panel de administración" aparece: %s', async (rol, visible) => {
    const { default: App } = await import('../App');
    sesion(rol);
    vi.stubGlobal('fetch', simular());
    window.location.hash = '';
    render(<App />);
    expect(Boolean(screen.queryByRole('button', { name: 'Panel de administración' }))).toBe(visible);
  });
});

describe('Constancias desde el panel', () => {
  it('el administrador envía la constancia de un usuario y a todos', async () => {
    sesion('ADMIN');
    vi.stubGlobal('confirm', vi.fn(() => true));
    const fetch = simular();
    vi.stubGlobal('fetch', fetch);
    render(<PanelAdmin />);

    fireEvent.click(await screen.findByRole('button', { name: /Usuarios registrados/ }));
    expect(await screen.findByText('Nunca')).toBeInTheDocument(); // columna "Constancia enviada"
    fireEvent.click(screen.getByRole('button', { name: 'Enviar constancia' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Constancia enviada a juan@x.co');
    expect(fetch.mock.calls.some(([u, o]) => o.method === 'POST' && u.endsWith('/admin/usuarios/6/constancia'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar constancias a todos' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Constancias enviadas: 2 de 2'));
  });
});

