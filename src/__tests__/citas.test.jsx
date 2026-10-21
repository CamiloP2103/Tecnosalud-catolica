import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ServiciosSalud from '../components/pages/ServiciosSalud/ServiciosSalud';

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo });
const FRANJA = {
  fecha: '2026-10-19', hora: '07:30', medico: { id: 1, nombre: 'Dr. Alejandro Morales' }, especialidad: 'Medicina General', sede: { id: 1, nombre: 'Sede Principal - Chapinero' },
};
const CITA = { id: 5, fecha: '2026-10-19', hora: '07:30', estado: 'PROGRAMADA', medico: 'Dr. Alejandro Morales', especialidad: 'Medicina General', sede: 'Sede Principal - Chapinero' };

function simular({ reservar = respuesta(201, CITA), citas = [] } = {}) {
  return vi.fn(async (url, opciones = {}) => {
    const ruta = new URL(url).pathname;
    if (opciones.method === 'POST') return reservar;
    if (opciones.method === 'PATCH') return respuesta(200, { ...CITA, estado: 'CANCELADA' });
    if (ruta.endsWith('/especialidades')) return respuesta(200, { especialidades: [{ id: 1, nombre: 'Medicina General', medicos: 4 }] });
    if (ruta.endsWith('/sedes')) return respuesta(200, { sedes: [{ id: 1, nombre: 'Sede Principal - Chapinero' }] });
    if (ruta.endsWith('/disponibilidad')) return respuesta(200, { franjas: [FRANJA] });
    if (ruta.endsWith('/citas')) return respuesta(200, { citas });
    return respuesta(404, {});
  });
}

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: vi.fn(() => 'token-de-prueba'), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('Citas en Servicios Clínicos (citas-service)', () => {
  it('muestra los horarios libres agrupados por día y reserva el elegido con la sesión', async () => {
    const fetch = simular();
    vi.stubGlobal('fetch', fetch);
    render(<ServiciosSalud />);

    fireEvent.change(await screen.findByLabelText(/Especialidad Médica/), { target: { value: '1' } });
    expect(await screen.findByText(/lunes, 19 de octubre|lunes 19 de octubre/)).toBeInTheDocument();
    expect(screen.getByRole('button', { pressed: false, name: /Dr. Alejandro Morales/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dr. Alejandro Morales/ }));
    expect(screen.getByText(/Tu cita:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Agendamiento' }));

    await waitFor(() => expect(fetch.mock.calls.some(([, o]) => o && o.method === 'POST')).toBe(true));
    const [url, opciones] = fetch.mock.calls.find(([, o]) => o && o.method === 'POST');
    expect(url).toBe('http://localhost:3007/api/citas/citas');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(JSON.parse(opciones.body)).toMatchObject({ medicoId: 1, fecha: '2026-10-19', hora: '07:30' });
    expect(await screen.findByText(/Cita programada: Medicina General con Dr. Alejandro Morales/)).toBeInTheDocument();
  });

  it('muestra el error cuando otra persona tomó el horario', async () => {
    vi.stubGlobal('fetch', simular({ reservar: respuesta(409, { error: 'Ese horario acaba de ser reservado por otra persona. Elige otro.' }) }));
    render(<ServiciosSalud />);
    fireEvent.change(await screen.findByLabelText(/Especialidad Médica/), { target: { value: '1' } });
    fireEvent.click(await screen.findByRole('button', { name: /Dr. Alejandro Morales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Agendamiento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('reservado por otra persona');
  });

  it('lista las citas guardadas y permite cancelar las programadas', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const fetch = simular({ citas: [CITA, { ...CITA, id: 6, estado: 'ATENDIDA' }] });
    vi.stubGlobal('fetch', fetch);
    render(<ServiciosSalud />);

    fireEvent.click(await screen.findByRole('button', { name: /Consultar Citas \(1\)/ }));
    expect(screen.getByText('Atendida')).toBeInTheDocument();
    const botones = screen.getAllByRole('button', { name: 'Cancelar' });
    expect(botones).toHaveLength(1);
    fireEvent.click(botones[0]);
    await waitFor(() => expect(fetch.mock.calls.some(([u, o]) => o && o.method === 'PATCH' && u.endsWith('/citas/5/cancelar'))).toBe(true));
  });
});
