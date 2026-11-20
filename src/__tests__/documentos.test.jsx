import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Documentos from '../components/pages/Documentos/Documentos';
import DocumentosExternosMedico from '../components/pages/Medico/DocumentosExternosMedico';

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo });
const DOCUMENTO = {
  id: '6f1c2b0e-8a7d-4c1e-9f2a-1b2c3d4e5f60',
  titulo: 'Resultado de laboratorio',
  tipoDocumento: 'Examen de laboratorio',
  nombreOriginal: 'resultado.pdf',
  descripcion: 'Control',
  creadoEn: '2026-10-15T10:00:00Z',
};

function iniciarSesion(usuario) {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((clave) => ({
      tecnosalud_token: 'token-de-prueba',
      tecnosalud_sesion_activa: JSON.stringify(usuario),
    }[clave] || null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Página de Documentos clínicos', () => {
  it('consulta automáticamente los documentos del paciente de la sesión, con su JWT', async () => {
    iniciarSesion({ id: 1, nombre: 'Carlos', documento: '72000607', rol: 'PACIENTE' });
    const fetch = vi.fn().mockResolvedValue(respuesta(200, { documentos: [DOCUMENTO] }));
    vi.stubGlobal('fetch', fetch);
    render(<Documentos />);

    expect(await screen.findByText('Resultado de laboratorio')).toBeInTheDocument();
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3006/api/documentos?documentoPaciente=72000607');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(screen.getByLabelText('Identificación del paciente')).toHaveAttribute('readonly');
    expect(screen.queryByText('Generar documento clínico')).not.toBeInTheDocument();
  });

  it('muestra la generación de documentos al personal clínico', async () => {
    iniciarSesion({ id: 3, nombre: 'María', documento: '52148963', rol: 'MEDICO' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { documentos: [] })));
    render(<Documentos />);

    expect(await screen.findByText('Generar documento clínico')).toBeInTheDocument();
    expect(screen.getByLabelText('Identificación del paciente')).not.toHaveAttribute('readonly');
  });

  it('carga un archivo como multipart sin forzar Content-Type JSON', async () => {
    iniciarSesion({ id: 1, nombre: 'Carlos', documento: '72000607', rol: 'PACIENTE' });
    const fetch = vi.fn()
      .mockResolvedValueOnce(respuesta(200, { documentos: [] }))
      .mockResolvedValueOnce(respuesta(201, { documento: DOCUMENTO }))
      .mockResolvedValue(respuesta(200, { documentos: [DOCUMENTO] }));
    vi.stubGlobal('fetch', fetch);
    const { container } = render(<Documentos />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getAllByLabelText('Título del documento')[0], { target: { value: 'Resultado' } });
    const archivo = new File(['%PDF-1.7'], 'resultado.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [archivo] } });
    fireEvent.submit(screen.getByRole('button', { name: 'Cargar archivo' }).closest('form'));

    expect(await screen.findByText('Documento cargado correctamente.')).toBeInTheDocument();
    const [url, opciones] = fetch.mock.calls[1];
    expect(url).toBe('http://localhost:3006/api/documentos');
    expect(opciones.body).toBeInstanceOf(FormData);
    expect(opciones.body.get('documentoPaciente')).toBe('72000607');
    expect(opciones.headers['Content-Type']).toBeUndefined();
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('explica la causa cuando el servicio está apagado, sin cerrar la sesión', async () => {
    iniciarSesion({ id: 1, nombre: 'Carlos', documento: '72000607', rol: 'PACIENTE' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<Documentos />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servicio de documentos');
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });

  it('muestra la causa cuando la base de datos no está disponible (503)', async () => {
    iniciarSesion({ id: 1, nombre: 'Carlos', documento: '72000607', rol: 'PACIENTE' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(503, {
      error: 'El servicio está encendido, pero no puede usar la base de datos. MySQL no está corriendo.',
    })));
    render(<Documentos />);

    expect(await screen.findByRole('alert')).toHaveTextContent('no puede usar la base de datos');
  });
});

describe('DocumentosExternosMedico (Panel Médico)', () => {
  it('consulta los documentos de un paciente por identificación y muestra su tipoDocumento', async () => {
    iniciarSesion({ id: 3, nombre: 'María', documento: '52148963', rol: 'MEDICO' });
    const fetch = vi.fn().mockResolvedValue(respuesta(200, { documentos: [DOCUMENTO] }));
    vi.stubGlobal('fetch', fetch);

    render(<DocumentosExternosMedico />);

    fireEvent.change(
      screen.getByPlaceholderText('Número de documento del paciente (ej. 72000607)'),
      { target: { value: '72000607' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Consultar documentos' }));

    expect(await screen.findByText('Resultado de laboratorio')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText('Examen de laboratorio')).toBeInTheDocument();

    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3006/api/documentos?documentoPaciente=72000607');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('sube un examen externo enviando tipoDocumento, titulo, descripcion y archivo en FormData', async () => {
    iniciarSesion({ id: 3, nombre: 'María', documento: '52148963', rol: 'MEDICO' });
    const docCreado = {
      ...DOCUMENTO,
      titulo: 'Radiografía de tórax',
      tipoDocumento: 'Radiografía / Imagen diagnóstica',
      descripcion: 'Control anual',
    };

    const fetch = vi.fn().mockResolvedValueOnce(respuesta(201, { documento: docCreado }));
    vi.stubGlobal('fetch', fetch);

    const { container } = render(<DocumentosExternosMedico />);

    fireEvent.change(screen.getByPlaceholderText('Ej: 72000607'), {
      target: { value: '72000607' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Radiografía / Imagen diagnóstica' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: Radiografía de tórax'), {
      target: { value: 'Radiografía de tórax' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: Laboratorio externo - control anual'), {
      target: { value: 'Control anual' },
    });

    const archivo = new File(['%PDF-1.7'], 'rx_torax.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [archivo] } });
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar en historia clínica' }).closest('form'));

    expect(await screen.findByText(/cargado correctamente/i)).toBeInTheDocument();

    const [urlPost, opcionesPost] = fetch.mock.calls[0];
    expect(urlPost).toBe('http://localhost:3006/api/documentos');
    expect(opcionesPost.method).toBe('POST');
    expect(opcionesPost.body).toBeInstanceOf(FormData);
    expect(opcionesPost.body.get('documentoPaciente')).toBe('72000607');
    expect(opcionesPost.body.get('tipoDocumento')).toBe('Radiografía / Imagen diagnóstica');
    expect(opcionesPost.body.get('titulo')).toBe('Radiografía de tórax');
    expect(opcionesPost.body.get('descripcion')).toBe('Control anual');
    expect(opcionesPost.headers['Content-Type']).toBeUndefined();
    expect(opcionesPost.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('muestra alerta si falla la conexión con el servicio de documentos', async () => {
    iniciarSesion({ id: 3, nombre: 'María', documento: '52148963', rol: 'MEDICO' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<DocumentosExternosMedico />);

    fireEvent.change(
      screen.getByPlaceholderText('Número de documento del paciente (ej. 72000607)'),
      { target: { value: '72000607' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Consultar documentos' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión con el servicio de documentos.');
  });
});