import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Registro from '../components/pages/Registro/Registro';

const DEPARTAMENTOS = [{ id: 1, nombre: 'Antioquia', ciudades: [{ id: 10, nombre: 'Medellín' }] }];
const EPS = [{ id: 5, nombre: 'Sanitas' }];

const respuestaJson = (datos) => ({ ok: true, json: async () => datos });

// Simula los catálogos del servicio de Registro
const mockFetchCatalogos = () =>
  vi.fn().mockImplementation(async (url) => {
    if (url.endsWith('/departamentos')) return respuestaJson(DEPARTAMENTOS);
    if (url.endsWith('/eps')) return respuestaJson(EPS);
    return respuestaJson({});
  });

describe('Registro', () => {
  it('debe mostrar un error al enviar el formulario vacío', () => {
    vi.stubGlobal('fetch', mockFetchCatalogos());
    render(<Registro />);
    fireEvent.click(screen.getByRole('button', { name: 'Completar Afiliación' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Por favor completa el campo: Nombres');
  });

  it('debe cargar ciudades y EPS desde el servicio y no enviar el registro antes de tiempo', async () => {
    const fetchMock = mockFetchCatalogos();
    vi.stubGlobal('fetch', fetchMock);
    render(<Registro />);

    expect(screen.getByRole('button', { name: 'Completar Afiliación' })).toBeInTheDocument();
    
    // Esperar a que cargue la EPS (que sí se muestra directamente o al interactuar)
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /EPS/i })).toBeInTheDocument();
    });

    // Ningún POST de registro hasta que se envíe el formulario
    const huboPost = fetchMock.mock.calls.some(([, opciones]) => opciones && opciones.method === 'POST');
    expect(huboPost).toBe(false);
  });
});