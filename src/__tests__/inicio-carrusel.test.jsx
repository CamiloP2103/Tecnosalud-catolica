import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Inicio from '../components/pages/Inicio/Inicio';

const etiquetaActiva = (contenedor) =>
  contenedor.querySelector('.carrusel__diapositiva--activa')?.getAttribute('aria-label');

describe('Carrusel de Inicio', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra cuatro diapositivas y solo la primera activa', () => {
    const { container } = render(<Inicio onNavigate={() => {}} />);

    expect(container.querySelectorAll('.carrusel__diapositiva')).toHaveLength(4);
    expect(container.querySelectorAll('.carrusel__diapositiva--activa')).toHaveLength(1);
    expect(etiquetaActiva(container)).toBe('1 de 4');
  });

  it('avanza y retrocede con las flechas', () => {
    const { container } = render(<Inicio onNavigate={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Diapositiva siguiente' }));
    expect(etiquetaActiva(container)).toBe('2 de 4');

    fireEvent.click(screen.getByRole('button', { name: 'Diapositiva anterior' }));
    fireEvent.click(screen.getByRole('button', { name: 'Diapositiva anterior' }));
    expect(etiquetaActiva(container)).toBe('4 de 4');
  });

  it('salta a una diapositiva con los indicadores', () => {
    const { container } = render(<Inicio onNavigate={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ir a la diapositiva 3' }));
    expect(etiquetaActiva(container)).toBe('3 de 4');
  });

  it('el botón de cada diapositiva navega a su página', () => {
    const onNavigate = vi.fn();
    render(<Inicio onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Conoce más sobre nosotros' }));
    expect(onNavigate).toHaveBeenLastCalledWith('historia');

    fireEvent.click(screen.getByRole('button', { name: 'Diapositiva siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver medicamentos' }));
    expect(onNavigate).toHaveBeenLastCalledWith('medicamentos');
  });

  it('pasa sola a la siguiente diapositiva', () => {
    vi.useFakeTimers();
    const { container } = render(<Inicio onNavigate={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(etiquetaActiva(container)).toBe('2 de 4');
  });

  it('se detiene al pasar el mouse por encima', () => {
    vi.useFakeTimers();
    const { container } = render(<Inicio onNavigate={() => {}} />);

    fireEvent.mouseEnter(screen.getByLabelText('Novedades de Tecnosalud'));
    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(etiquetaActiva(container)).toBe('1 de 4');
  });

  it('se detiene y se reanuda con el botón de pausa', () => {
    vi.useFakeTimers();
    const { container } = render(<Inicio onNavigate={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pausar carrusel' }));
    act(() => {
      vi.advanceTimersByTime(14000);
    });
    expect(etiquetaActiva(container)).toBe('1 de 4');

    fireEvent.click(screen.getByRole('button', { name: 'Reanudar carrusel' }));
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(etiquetaActiva(container)).toBe('2 de 4');
  });
});
