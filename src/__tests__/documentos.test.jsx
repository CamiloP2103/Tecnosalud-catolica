import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Documentos from '../components/pages/Documentos/Documentos';

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo });
const DOCUMENTO = {
  id: '6f1c2b0e-8a7d-4c1e-9f2a-1b2c3d4e5f60',
  titulo: 'Resultado de laboratorio',
  nombreOriginal: 'resultado.pdf',
  descripcion: 'Control',
  creadoEn: '2026-10-15T10:00:00Z',
};

// Simula la sesión guardada por Acceso.jsx
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
    // El paciente no puede cambiar la identificación ni generar documentos
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
    // jsdom no reconoce archivos simulados en inputs "required": se envía el formulario directamente
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
