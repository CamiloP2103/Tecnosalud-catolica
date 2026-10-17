import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
    global.fetch = mockFetchCatalogos();
    render(<Registro />);
    fireEvent.click(screen.getByRole('button', { name: 'Completar Afiliación' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Por favor completa el campo: Nombres');
  });

  it('debe cargar ciudades y EPS desde el servicio y no enviar el registro antes de tiempo', async () => {
    global.fetch = mockFetchCatalogos();
    render(<Registro />);

    expect(screen.getByRole('button', { name: 'Completar Afiliación' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Medellín' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Sanitas' })).toBeInTheDocument();

    // Ningún POST de registro hasta que se envíe el formulario
    const huboPost = global.fetch.mock.calls.some(([, opciones]) => opciones && opciones.method === 'POST');
    expect(huboPost).toBe(false);
  });
});
