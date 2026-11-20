import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Nosotros from '../components/pages/Nosotros/Nosotros';
import MuerteDigna from '../components/pages/Afiliados/MuerteDigna';
import Medicamentos from '../components/pages/Afiliados/Medicamentos';
import Triage from '../components/pages/Afiliados/Triage';

const filas = (contenedor) => contenedor.querySelectorAll('.pg-fila');
const filasInversas = (contenedor) => contenedor.querySelectorAll('.pg-fila--inversa');
const fotos = (contenedor) => contenedor.querySelectorAll('figure.imagen img');

describe('Nosotros', () => {
  it('Historia alterna el texto entre izquierda y derecha', () => {
    const { container } = render(<Nosotros seccion="historia" />);

    expect(
      screen.getByRole('heading', {
        name: 'Innovación Académica y Vocación al Servicio de la Vida',
      }),
    ).toBeInTheDocument();
    expect(filas(container)).toHaveLength(2);
    expect(filasInversas(container)).toHaveLength(1);
    expect(fotos(container)).toHaveLength(2);
  });

  it('Misión y visión muestra cada bloque con su imagen', () => {
    const { container } = render(<Nosotros seccion="mision-vision" />);

    expect(screen.getByRole('heading', { name: 'Misión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Visión' })).toBeInTheDocument();
    expect(filas(container)).toHaveLength(2);
    expect(filasInversas(container)).toHaveLength(1);
    expect(fotos(container)).toHaveLength(2);
  });

  it('Valores lista los cinco valores', () => {
    const { container } = render(<Nosotros seccion="valores" />);

    expect(container.querySelectorAll('.pg-item')).toHaveLength(5);
    expect(fotos(container)).toHaveLength(1);
  });

  it('Trabaja con nosotros conserva el enlace para enviar la hoja de vida', () => {
    const { container } = render(<Nosotros seccion="trabaja-con-nosotros" />);

    expect(screen.getByRole('link', { name: 'Enviar hoja de vida' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:seleccion@tecnosaludcatolica.com'),
    );
    expect(filas(container)).toHaveLength(2);
    expect(fotos(container)).toHaveLength(2);
  });
});

describe('Afiliados', () => {
  it('Muerte digna muestra los cuatro pasos de la ruta de atención', () => {
    const { container } = render(<MuerteDigna />);

    expect(
      screen.getByRole('heading', { name: 'Derecho fundamental a morir con dignidad' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.pg-item--paso')).toHaveLength(4);
    expect(filas(container)).toHaveLength(2);
    expect(fotos(container)).toHaveLength(2);
  });

  it('Triage muestra los cinco niveles de priorización', () => {
    const { container } = render(<Triage />);

    expect(
      screen.getByRole('heading', { name: 'Sistema de clasificación Triage' }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('.triage-card')).toHaveLength(5);
    expect(screen.getByText('Triage I')).toBeInTheDocument();
    expect(screen.getByText('Triage V')).toBeInTheDocument();
    expect(fotos(container)).toHaveLength(2);
  });

  it('Medicamentos filtra la tabla al buscar', () => {
    const { container } = render(<Medicamentos />);

    expect(screen.getByText('Metformina 850mg')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar medicamento'), {
      target: { value: 'Losartán' },
    });
    expect(screen.getByText('Losartán 50mg')).toBeInTheDocument();
    expect(screen.queryByText('Metformina 850mg')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Buscar medicamento'), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByText(/No se encontraron coincidencias/)).toBeInTheDocument();
    expect(fotos(container)).toHaveLength(2);
  });
});
