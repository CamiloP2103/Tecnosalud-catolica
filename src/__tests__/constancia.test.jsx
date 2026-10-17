import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Acceso from '../components/pages/Acceso/Acceso';

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo });
const USUARIO = { id: 6, nombre: 'Juan Esteban Peña', email: 'juan@x.co', tipoDoc: 'CC', documento: '1000000001', rol: 'PACIENTE' };

function sesionIniciada() {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((clave) => ({ tecnosalud_token: 'token-usuario', tecnosalud_sesion_activa: JSON.stringify(USUARIO) }[clave] || null)),
    setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Constancia de registro desde la sesión del usuario', () => {
  it('pide la constancia con la sesión y muestra cómo abrirla', async () => {
    sesionIniciada();
    const fetch = vi.fn().mockResolvedValue(respuesta(200, { mensaje: 'Enviamos tu constancia a juan@x.co. Ábrela con tu número de identificación.' }));
    vi.stubGlobal('fetch', fetch);
    render(<Acceso sesionActiva onNavigate={vi.fn()} onLogout={vi.fn()} />);

    expect(screen.getByText(/Para abrirlo usa tu número de identificación/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme mi constancia de registro (PDF)' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Enviamos tu constancia a juan@x.co');
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3002/api/auth/mi-constancia');
    expect(opciones).toMatchObject({ method: 'POST' });
    expect(opciones.headers.Authorization).toBe('Bearer token-usuario');
  });

  it('muestra el límite cuando ya la pidió varias veces', async () => {
    sesionIniciada();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(429, { error: 'Ya pediste tu constancia varias veces. Intenta de nuevo en una hora.' })));
    render(<Acceso sesionActiva onNavigate={vi.fn()} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme mi constancia de registro (PDF)' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Intenta de nuevo en una hora'));
  });

  it('la tarjeta de sesión no usa emojis', () => {
    sesionIniciada();
    vi.stubGlobal('fetch', vi.fn());
    const { container } = render(<Acceso sesionActiva onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
