import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Imagen, { ASIGNACION, obtenerImagen } from '../components/Imagen/Imagen';

describe('Imagen', () => {
  it('cada espacio asignado apunta a un archivo que existe en src/assets/imagenes', () => {
    Object.keys(ASIGNACION).forEach((nombre) => {
      expect(obtenerImagen(nombre), nombre).toBeDefined();
    });
  });

  it('muestra la foto asignada con su texto alternativo', () => {
    render(<Imagen nombre="historia-1" alt="Foto de prueba" />);

    expect(screen.getByRole('img', { name: 'Foto de prueba' })).toHaveAttribute(
      'src',
      expect.stringContaining('imagen4'),
    );
  });

  it('muestra un espacio reservado cuando no hay archivo', () => {
    render(<Imagen nombre="sin-archivo" />);

    expect(
      screen.getByRole('img', { name: /Espacio reservado para la imagen sin-archivo/ }),
    ).toBeInTheDocument();
  });
});
