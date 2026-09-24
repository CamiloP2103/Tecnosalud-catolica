import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Estructura de la aplicación', () => {
  it('debe renderizar nav, main y una sección', async () => {
    render(<App />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(await screen.findByText(/Salud y tecnología/i)).toBeInTheDocument();
  });
});