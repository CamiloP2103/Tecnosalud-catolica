import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Acceso from '../components/pages/Acceso/Acceso';

describe('Acceso', () => {
  it('debe validar que correo y contraseña sean obligatorios', () => {
    render(<Acceso />);
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Por favor ingresa tu correo y contraseña.');
  });
});