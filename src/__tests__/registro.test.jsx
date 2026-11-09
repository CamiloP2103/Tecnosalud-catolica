import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Registro from '../components/pages/Registro/Registro';

const DEPARTAMENTOS = [{ codigo: 'ANT', nombre: 'Antioquia', municipios: [{ codigo: '05001', nombre: 'Medellín' }] }];

const respuestaJson = (datos) => ({ ok: true, json: async () => datos });

// Simula los catálogos geográficos del servicio de Registro
const mockFetchCatalogos = () =>
  vi.fn().mockImplementation(async (url) => {
    if (url.endsWith('/departamentos')) return respuestaJson(DEPARTAMENTOS);
    return respuestaJson({});
  });

describe('Registro - Perfil Farmacia', () => {
  it('debe mostrar un error al enviar el formulario vacío', async () => {
    vi.stubGlobal('fetch', mockFetchCatalogos());
    render(<Registro />);
    
    // Esperar que carguen los departamentos
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Ciudad \/ Municipio/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar Farmacia y Activar Cuenta' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Por favor completa el campo: Nombre del responsable / Establecimiento');
  });

  it('debe cargar los municipios desde el servicio y no enviar el registro antes de tiempo', async () => {
    const fetchMock = mockFetchCatalogos();
    vi.stubGlobal('fetch', fetchMock);
    render(<Registro />);

    expect(screen.getByRole('button', { name: 'Registrar Farmacia y Activar Cuenta' })).toBeInTheDocument();
    
    // Esperar a que cargue el selector de municipios
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Ciudad \/ Municipio/i })).toBeInTheDocument();
    });

    // Ningún POST de registro hasta que se envíe el formulario
    const huboPost = fetchMock.mock.calls.some(([, opciones]) => opciones && opciones.method === 'POST');
    expect(huboPost).toBe(false);
  });
});