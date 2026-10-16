import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CitasMedicas from '../components/pages/ServiciosSalud/CitasMedicas';

const horas = ['08:00', '08:30', '09:00'];
let citasServidor;
let fetchMock;
let sesionActiva;

function respuestaJson(datos, ok = true) {
  return Promise.resolve({ ok, json: async () => datos });
}

beforeEach(() => {
  localStorage.getItem.mockImplementation((key) => {
    if (key === 'tecnosalud_token') return 'token-de-prueba';
    if (key === 'tecnosalud_sesion_activa') return JSON.stringify(sesionActiva);
    return null;
  });
  sesionActiva = { nombre: 'Paciente de prueba', rol: 'PACIENTE' };
  citasServidor = [];
  fetchMock = vi.fn((url, opciones = {}) => {
    const ruta = new URL(url);
    const metodo = opciones.method || 'GET';

    if (ruta.pathname === '/api/doctores') {
      return respuestaJson([{ id: 'doctor-1', nombre: 'Doctor 1' }]);
    }

    if (ruta.pathname === '/api/disponibilidad') {
      return respuestaJson({
        horarios: horas.map((hora) => ({
          hora,
          disponible: !citasServidor.some(
            (cita) =>
              cita.estado === 'programada' &&
              cita.doctorId === ruta.searchParams.get('doctorId') &&
              cita.fecha === ruta.searchParams.get('fecha') &&
              cita.hora === hora,
          ),
        })),
      });
    }

    if (ruta.pathname === '/api/citas' && metodo === 'GET') return respuestaJson(citasServidor);

    if (ruta.pathname === '/api/citas' && metodo === 'POST') {
      const datos = JSON.parse(opciones.body);
      const cita = {
        id: 1,
        ...datos,
        nombreDoctor: 'Doctor 1',
        estado: 'programada',
      };
      citasServidor.push(cita);
      return respuestaJson(cita);
    }

    const rutaCita = ruta.pathname.match(/^\/api\/citas\/(\d+)\/(cancelar|reprogramar)$/);
    if (rutaCita) {
      const cita = citasServidor.find((item) => item.id === Number(rutaCita[1]));
      if (rutaCita[2] === 'cancelar') cita.estado = 'cancelada';
      if (rutaCita[2] === 'reprogramar') Object.assign(cita, JSON.parse(opciones.body));
      return respuestaJson(cita);
    }

    return respuestaJson({ error: 'Ruta no simulada' }, false);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.getItem.mockReset();
});

describe('Agenda de citas en Servicios Clínicos', () => {
  it('permite agendar, reprogramar y cancelar desde la interfaz', async () => {
    render(<CitasMedicas />);

    const horarioInicial = await screen.findByRole('button', { name: '08:00' });
    fireEvent.click(horarioInicial);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    expect(await screen.findByText('La cita quedó asignada correctamente.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/citas'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-de-prueba' }),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }));
    await screen.findByRole('group', { name: 'Horarios para reprogramar cita 1' });
    const horarios = screen.getAllByRole('button', { name: '08:30' });
    fireEvent.click(horarios[horarios.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nuevo horario' }));

    expect(await screen.findByText('La cita fue reprogramada correctamente.')).toBeInTheDocument();
    await waitFor(() => expect(citasServidor[0].hora).toBe('08:30'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar', exact: true }));
    expect(await screen.findByText('La cita fue cancelada.')).toBeInTheDocument();
    expect(citasServidor[0].estado).toBe('cancelada');
  });

  it('muestra al médico sus citas asignadas en modo de solo lectura', async () => {
    sesionActiva = { nombre: 'Doctor de Prueba', rol: 'MEDICO' };
    citasServidor = [{
      id: 1,
      nombrePaciente: 'Ana Pérez',
      doctorId: 'doctor-1',
      nombreDoctor: 'Doctor de Prueba',
      fecha: '2026-10-20',
      hora: '08:00',
      estado: 'programada',
    }];

    render(<CitasMedicas />);

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Citas asignadas' })).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Agendar una cita' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/doctores'),
      expect.anything(),
    );
    expect(fetchMock.mock.calls.some(([url]) => new URL(url).pathname === '/api/citas')).toBe(true);
  });
});
