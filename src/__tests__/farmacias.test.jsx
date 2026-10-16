import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Farmacias from '../components/pages/Farmacias/Farmacias';
import App from '../App';

const MEDICAMENTOS = [
  {
    id: 1, nombre: 'Acetaminofén', concentracion: '500 mg', formaFarmaceutica: 'Tableta', presentacion: 'Caja x 20 tabletas',
    categoria: 'Analgésicos y antiinflamatorios', requiereFormula: false, controlEspecial: false, precioReferencia: 3500,
    descripcion: 'Dolor y fiebre', unidadesDisponibles: 120, farmaciasConExistencias: 7,
  },
  {
    id: 18, nombre: 'Amoxicilina', concentracion: '500 mg', formaFarmaceutica: 'Cápsula', presentacion: 'Caja x 50 cápsulas',
    categoria: 'Antibióticos', requiereFormula: true, controlEspecial: false, precioReferencia: 12000,
    descripcion: 'Infecciones bacterianas', unidadesDisponibles: 40, farmaciasConExistencias: 5,
  },
  {
    id: 80, nombre: 'Clonazepam', concentracion: '2 mg', formaFarmaceutica: 'Tableta', presentacion: 'Caja x 30 tabletas',
    categoria: 'Salud mental y neurología', requiereFormula: true, controlEspecial: true, precioReferencia: 9000,
    descripcion: 'Ansiedad', unidadesDisponibles: 10, farmaciasConExistencias: 2,
  },
];

const FARMACIAS = [
  {
    id: 1, nombre: 'Farmatodo Parque 93', cadena: 'Farmatodo', direccion: 'Calle 93A # 12-73 Local 5', localidad: 'Chapinero',
    municipio: 'Bogotá D.C.', horario: '24 horas', abierta24h: true, medicamentosDisponibles: 80,
  },
];

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo });

// Simula farmacias-service según el método y la ruta pedida
function simularServicio({ crear = respuesta(201, {
  id: 7, total: 7000, farmacia: FARMACIAS[0], items: [], estado: 'PENDIENTE',
}) } = {}) {
  return vi.fn(async (url, opciones = {}) => {
    const ruta = new URL(url).pathname;
    const metodo = opciones.method || 'GET';
    if (metodo === 'POST' && ruta.endsWith('/solicitudes')) return crear;
    if (ruta.endsWith('/solicitudes')) return respuesta(200, { total: 0, solicitudes: [] });
    if (ruta.endsWith('/medicamentos/categorias')) return respuesta(200, { categorias: [{ categoria: 'Antibióticos', total: 12 }] });
    if (ruta.endsWith('/medicamentos')) return respuesta(200, { total: MEDICAMENTOS.length, medicamentos: MEDICAMENTOS });
    if (ruta.endsWith('/inventario')) {
      return respuesta(200, { inventario: [{ medicamento: MEDICAMENTOS[0], cantidad: 12, precio: 3400 }] });
    }
    if (ruta.endsWith('/sedes')) return respuesta(200, { total: 1, farmacias: FARMACIAS });
    if (ruta.endsWith('/reabastecimiento')) return respuesta(200, { objetivo: 60, hoyEsLunes: false, hechoEstaSemana: false, proximo: '2026-10-19' });
    if (/\/medicamentos\/\d+$/.test(ruta)) {
      return respuesta(200, {
        ...MEDICAMENTOS[0],
        disponibilidad: [
          { farmacia: FARMACIAS[0], cantidad: 12, precio: 3400 },
          { farmacia: { ...FARMACIAS[0], id: 8, nombre: 'Farmatodo Antares', direccion: 'Carrera 7 # 30B-139', localidad: null, municipio: 'Soacha' }, cantidad: 0, precio: 3600 },
        ],
      });
    }
    return respuesta(404, { error: 'no encontrado' });
  });
}

const llamadasPost = (fetch) => fetch.mock.calls.filter(([, opciones]) => opciones && opciones.method === 'POST');

async function agregarYAbrirPedido(nombre) {
  fireEvent.click(await screen.findByRole('button', { name: `Agregar ${nombre} 500 mg al carrito` }));
  fireEvent.click(screen.getByRole('button', { name: /Carrito/ }));
  fireEvent.change(screen.getByLabelText('Farmacia donde vas a reclamar'), { target: { value: '1' } });
}

beforeEach(() => {
  // localStorage propio por prueba (unstubAllGlobals lo retira junto con fetch)
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((clave) => (clave === 'tecnosalud_token' ? 'token-de-prueba' : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Página de Farmacias', () => {
  it('muestra el catálogo con el tipo de venta de cada medicamento', async () => {
    vi.stubGlobal('fetch', simularServicio());
    render(<Farmacias />);

    expect(await screen.findByText('3 medicamentos encontrados.')).toBeInTheDocument();
    expect(screen.getByText('Venta libre')).toBeInTheDocument();
    expect(screen.getByText('Requiere fórmula')).toBeInTheDocument();
    expect(screen.getByText('Control especial')).toBeInTheDocument();
    // Los de control especial no se pueden agregar
    expect(screen.queryByRole('button', { name: 'Agregar Clonazepam 2 mg al carrito' })).not.toBeInTheDocument();
    expect(screen.getByText(/fórmula oficial en original/)).toBeInTheDocument();
  });

  it('muestra en qué farmacias hay cada medicamento y permite agregarlo desde una sede', async () => {
    const fetch = simularServicio();
    vi.stubGlobal('fetch', fetch);
    render(<Farmacias />);

    expect(await screen.findByText(/Próximo reabastecimiento/)).toBeInTheDocument();
    fireEvent.click((await screen.findAllByRole('button', { name: '¿En qué farmacias hay?' }))[0]);

    expect(await screen.findByText('12 disponibles · $ 3.400')).toBeInTheDocument();
    expect(screen.getByText(/Calle 93A # 12-73 Local 5, Chapinero — Bogotá D.C./)).toBeInTheDocument();
    expect(screen.getByText('Agotado en esta sede')).toBeInTheDocument();
    // Solo se puede agregar desde la sede que tiene unidades
    expect(screen.queryByRole('button', { name: /al carrito desde Farmatodo Antares/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Agregar Acetaminofén 500 mg al carrito desde Farmatodo Parque 93' }));
    fireEvent.click(screen.getByRole('button', { name: /Carrito \(1\)/ }));
    expect(screen.getByLabelText('Farmacia donde vas a reclamar')).toHaveValue('1');
  });

  it('envía una solicitud de venta libre con la sesión del usuario', async () => {
    const fetch = simularServicio();
    vi.stubGlobal('fetch', fetch);
    render(<Farmacias />);

    await agregarYAbrirPedido('Acetaminofén');
    expect(await screen.findByText(/Disponibles en esta farmacia: 12/)).toBeInTheDocument();
    expect(screen.queryByText('Datos de la fórmula médica')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hacer pedido' }));

    expect(await screen.findByText(/Pedido #7 enviado a Farmatodo Parque 93/)).toBeInTheDocument();
    const [[url, opciones]] = llamadasPost(fetch);
    expect(url).toContain('/api/farmacias/solicitudes');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(JSON.parse(opciones.body)).toEqual({ farmaciaId: 1, items: [{ medicamentoId: 1, cantidad: 1 }] });
  });

  it('pide los datos de la fórmula cuando el pedido incluye medicamentos que la requieren', async () => {
    const fetch = simularServicio();
    vi.stubGlobal('fetch', fetch);
    render(<Farmacias />);

    await agregarYAbrirPedido('Amoxicilina');
    expect(screen.getByText('Datos de la fórmula médica')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hacer pedido' }));

    expect(screen.getByRole('alert')).toHaveTextContent('completa todos los datos de la fórmula');
    expect(llamadasPost(fetch)).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Número de fórmula'), { target: { value: 'F-1' } });
    fireEvent.change(screen.getByLabelText('Médico que formula'), { target: { value: 'Dra. Rojas' } });
    fireEvent.change(screen.getByLabelText('Registro médico'), { target: { value: 'RM-123' } });
    fireEvent.change(screen.getByLabelText('Fecha de la fórmula'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hacer pedido' }));

    await waitFor(() => expect(llamadasPost(fetch)).toHaveLength(1));
    expect(JSON.parse(llamadasPost(fetch)[0][1].body).formula).toEqual({
      numero: 'F-1', medico: 'Dra. Rojas', registroMedico: 'RM-123', fecha: '2026-10-15',
    });
  });

  it('marca los medicamentos sin existencias suficientes cuando el servicio responde 409', async () => {
    vi.stubGlobal('fetch', simularServicio({
      crear: respuesta(409, {
        error: 'No hay existencias suficientes en esta farmacia.',
        detalle: [{ medicamentoId: 1, nombre: 'Acetaminofén', solicitada: 1, disponible: 0 }],
      }),
    }));
    render(<Farmacias />);

    await agregarYAbrirPedido('Acetaminofén');
    fireEvent.click(screen.getByRole('button', { name: 'Hacer pedido' }));

    expect(await screen.findByText('Solo hay 0 disponibles.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No hay existencias suficientes');
  });

  it('explica el problema si el servicio de farmacias está apagado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<Farmacias />);
    const alertas = await screen.findAllByRole('alert');
    expect(alertas.some((a) => within(a).queryByText(/No hay conexión con el servicio de farmacias/))).toBe(true);
  });
});

describe('Menú de Farmacias', () => {
  it('no aparece sin sesión', () => {
    localStorage.getItem.mockReturnValue(null);
    vi.stubGlobal('fetch', simularServicio());
    window.location.hash = '';
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Farmacias' })).not.toBeInTheDocument();
  });

  it('aparece con sesión y abre la página', async () => {
    // JWT con expiración futura (RutaProtegida solo revisa el payload; la firma la valida el backend)
    const payload = btoa(JSON.stringify({ id: 1, email: 'carlos@x.co', exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.getItem.mockImplementation((clave) => ({
      tecnosalud_token: `encabezado.${payload}.firma`,
      tecnosalud_sesion_activa: JSON.stringify({ id: 1, nombre: 'Carlos' }),
    }[clave] || null));
    vi.stubGlobal('fetch', simularServicio());
    window.location.hash = '';
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Farmacias' }));
    expect(await screen.findByRole('heading', { name: 'Farmacias Tecnosalud' })).toBeInTheDocument();
    expect(screen.queryByText('Acceso Restringido')).not.toBeInTheDocument();
  });
});
