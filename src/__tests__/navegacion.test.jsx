import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('Navegación', () => {
  it('debe abrir la sección de registro desde el navbar', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Registro' }));
    expect(await screen.findByRole('heading', { name: /Afiliación al Sistema Tecnosalud/i })).toBeInTheDocument();
  });

  it('debe desplegar Nosotros y navegar a Historia', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Nosotros' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Historia' }));
    expect(await screen.findByRole('heading', { name: /Innovación y Vocación al Servicio de la Vida/i })).toBeInTheDocument();
  });
});