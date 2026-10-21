import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Registro from '../components/pages/Registro/Registro';

const CATALOGOS = {
  tiposDocumento: [{ codigo: 'CC', nombre: 'Cédula de ciudadanía' }, { codigo: 'TI', nombre: 'Tarjeta de identidad' }],
  generos: [{ codigo: 'F', nombre: 'Femenino' }],
  departamentos: [
    { codigo: '11', nombre: 'Bogotá D.C.', municipios: [{ codigo: '11001', nombre: 'Bogotá D.C.' }] },
    { codigo: '25', nombre: 'Cundinamarca', municipios: [{ codigo: '25754', nombre: 'Soacha' }, { codigo: '25175', nombre: 'Chía' }] },
  ],
  eps: [{ codigo: 'SANITAS', nombre: 'EPS Sanitas' }],
  regimenes: [{ codigo: 'contributivo', nombre: 'Contributivo' }],
  tiposAfiliacion: [{ codigo: 'paciente', nombre: 'Paciente / Afiliado general' }],
  parentescos: [{ codigo: 'madre', nombre: 'Madre' }],
};

const respuesta = (status, cuerpo) => ({ ok: status < 400, status, json: async () => cuerpo });

function simular(crear = respuesta(201, { id: 6, email: 'ana@correo.com', nombre: 'Ana Pérez', estado: 'PENDIENTE' })) {
  return vi.fn(async (url, opciones = {}) => (opciones.method === 'POST' ? crear : respuesta(200, CATALOGOS)));
}

// Los campos se ubican por su atributo name para no depender de textos parecidos entre etiquetas
const campo = (nombre) => document.querySelector(`[name="${nombre}"]`);
const cambiar = (nombre, valor) => fireEvent.change(campo(nombre), { target: { value: valor } });

async function llenarFormulario() {
  await screen.findByRole('option', { name: 'EPS Sanitas' });
  const valores = {
    nombres: 'Ana', apellidos: 'Pérez', tipoDocumento: 'CC', documento: '1020304050',
    nacimientoDia: '15', nacimientoMes: '06', nacimientoAnio: '1990', genero: 'F',
    correo: 'ana@correo.com', telefono: '3001234567', direccion: 'Calle 1 # 2-3',
    departamento: '25', municipio: '25754', tipoAfiliacion: 'paciente', eps: 'SANITAS', regimen: 'contributivo',
    contactoEmergenciaNombre: 'Luis Pérez', contactoEmergenciaTelefono: '3007654321', contactoEmergenciaParentesco: 'madre',
  };
  for (const [nombre, valor] of Object.entries(valores)) cambiar(nombre, valor);
  fireEvent.click(screen.getByRole('checkbox'));
}

function resolverCaptcha() {
  const pregunta = screen.getByText(/¿Cuánto es \d+ \+ \d+\?/).textContent;
  const [, a, b] = pregunta.match(/(\d+) \+ (\d+)/);
  fireEvent.change(screen.getByPlaceholderText('Respuesta'), { target: { value: String(Number(a) + Number(b)) } });
}

beforeEach(() => {
  window.scrollTo = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

describe('Registro con catálogos de db_registro', () => {
  it('muestra un error al enviar el formulario vacío', async () => {
    vi.stubGlobal('fetch', simular());
    render(<Registro />);
    await screen.findByRole('option', { name: 'EPS Sanitas' });
    fireEvent.click(screen.getByRole('button', { name: 'Completar Afiliación' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Por favor completa el campo: Nombres');
  });

  it('carga los catálogos y filtra los municipios según el departamento', async () => {
    vi.stubGlobal('fetch', simular());
    render(<Registro />);
    await screen.findByRole('option', { name: 'Cédula de ciudadanía (CC)' });

    const municipio = campo('municipio');
    expect(municipio).toBeDisabled();
    cambiar('departamento', '25');
    expect(municipio).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Soacha' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bogotá D.C.', selected: false })).toBeInTheDocument();

    cambiar('municipio', '25754');
    cambiar('departamento', '11');
    expect(municipio).toHaveValue(''); // al cambiar de departamento se limpia el municipio
  });

  it('valida el teléfono colombiano antes de enviar', async () => {
    const fetch = simular();
    vi.stubGlobal('fetch', fetch);
    render(<Registro />);
    await llenarFormulario();
    cambiar('telefono', '1234567890');
    resolverCaptcha();
    fireEvent.click(screen.getByRole('button', { name: 'Completar Afiliación' }));
    expect(screen.getByRole('alert')).toHaveTextContent('celular colombiano');
    expect(fetch.mock.calls.some(([, o]) => o && o.method === 'POST')).toBe(false);
  });

  it('envía el código del municipio y de la EPS, sin el departamento', async () => {
    const fetch = simular();
    vi.stubGlobal('fetch', fetch);
    render(<Registro />);
    await llenarFormulario();
    resolverCaptcha();
    fireEvent.click(screen.getByRole('button', { name: 'Completar Afiliación' }));

    await waitFor(() => expect(fetch.mock.calls.some(([, o]) => o && o.method === 'POST')).toBe(true));
    const cuerpo = JSON.parse(fetch.mock.calls.find(([, o]) => o && o.method === 'POST')[1].body);
    expect(cuerpo).toMatchObject({ municipio: '25754', eps: 'SANITAS', contactoEmergenciaParentesco: 'madre', tipoDocumento: 'CC' });
    expect(cuerpo).not.toHaveProperty('departamento');
    expect(cuerpo).not.toHaveProperty('ciudad');
  });

  it('avisa si no se pueden cargar los catálogos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<Registro />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servicio de registro');
  });
});
