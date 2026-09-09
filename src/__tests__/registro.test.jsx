import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Registro from '../components/pages/Registro/Registro';

describe('Registro', () => {
  it('debe mostrar un error al enviar el formulario vacío', () => {
    render(<Registro />);
    fireEvent.click(screen.getByRole('button', { name: 'Completar Afiliación' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Por favor completa el campo: Nombres');
  });

  it('debe enviar los datos al backend cuando la validación local es correcta', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 6, email: 'ana@example.com', nombre: 'Ana Pérez' }),
    });
    render(<Registro />);
    expect(screen.getByRole('button', { name: 'Completar Afiliación' })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});