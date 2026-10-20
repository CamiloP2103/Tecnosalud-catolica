// Catálogos del formulario de afiliación (antes estaban escritos en el front).
// Para agregar o quitar una opción, se edita este archivo; el front no cambia.

const DEPARTAMENTOS = [
  {
    id: 1,
    nombre: 'Cundinamarca / D.C.',
    ciudades: [
      { id: 1, nombre: 'Bogotá D.C.' },
      { id: 2, nombre: 'Soacha' },
      { id: 3, nombre: 'Chía' },
      { id: 4, nombre: 'Zipaquirá' },
      { id: 5, nombre: 'Facatativá' },
      { id: 6, nombre: 'Girardot' },
    ],
  },
  {
    id: 2,
    nombre: 'Antioquia',
    ciudades: [
      { id: 7, nombre: 'Medellín' },
      { id: 8, nombre: 'Bello' },
      { id: 9, nombre: 'Itagüí' },
      { id: 10, nombre: 'Envigado' },
      { id: 11, nombre: 'Rionegro' },
      { id: 12, nombre: 'Apartadó' },
    ],
  },
  {
    id: 3,
    nombre: 'Valle del Cauca',
    ciudades: [
      { id: 13, nombre: 'Cali' },
      { id: 14, nombre: 'Palmira' },
      { id: 15, nombre: 'Buenaventura' },
      { id: 16, nombre: 'Tuluá' },
      { id: 17, nombre: 'Cartago' },
      { id: 18, nombre: 'Buga' },
    ],
  },
  {
    id: 4,
    nombre: 'Atlántico',
    ciudades: [
      { id: 19, nombre: 'Barranquilla' },
      { id: 20, nombre: 'Soledad' },
      { id: 21, nombre: 'Malambo' },
      { id: 22, nombre: 'Sabanalarga' },
      { id: 23, nombre: 'Puerto Colombia' },
    ],
  },
  {
    id: 5,
    nombre: 'Santander',
    ciudades: [
      { id: 24, nombre: 'Bucaramanga' },
      { id: 25, nombre: 'Floridablanca' },
      { id: 26, nombre: 'Girón' },
      { id: 27, nombre: 'Piedecuesta' },
      { id: 28, nombre: 'Barrancabermeja' },
    ],
  },
  {
    id: 6,
    nombre: 'Bolívar',
    ciudades: [
      { id: 29, nombre: 'Cartagena' },
      { id: 30, nombre: 'Magangué' },
      { id: 31, nombre: 'Turbaco' },
      { id: 32, nombre: 'Arjona' },
      { id: 33, nombre: 'El Carmen de Bolívar' },
    ],
  },
  {
    id: 7,
    nombre: 'Eje Cafetero',
    ciudades: [
      { id: 34, nombre: 'Pereira' },
      { id: 35, nombre: 'Manizales' },
      { id: 36, nombre: 'Armenia' },
      { id: 37, nombre: 'Dosquebradas' },
      { id: 38, nombre: 'Santa Rosa de Cabal' },
    ],
  },
  {
    id: 8,
    nombre: 'Tolima y Huila',
    ciudades: [
      { id: 39, nombre: 'Ibagué' },
      { id: 40, nombre: 'Neiva' },
      { id: 41, nombre: 'Espinal' },
      { id: 42, nombre: 'Pitalito' },
      { id: 43, nombre: 'Melgar' },
    ],
  },
  {
    id: 9,
    nombre: 'Nariño y Cauca',
    ciudades: [
      { id: 44, nombre: 'Pasto' },
      { id: 45, nombre: 'Popayán' },
      { id: 46, nombre: 'Ipiales' },
      { id: 47, nombre: 'Tumaco' },
      { id: 48, nombre: 'Santander de Quilichao' },
    ],
  },
  {
    id: 10,
    nombre: 'Norte de Santander',
    ciudades: [
      { id: 49, nombre: 'Cúcuta' },
      { id: 50, nombre: 'Ocaña' },
      { id: 51, nombre: 'Villa del Rosario' },
      { id: 52, nombre: 'Los Patios' },
      { id: 53, nombre: 'Pamplona' },
    ],
  },
  {
    id: 11,
    nombre: 'Costa Caribe (Otras)',
    ciudades: [
      { id: 54, nombre: 'Santa Marta' },
      { id: 55, nombre: 'Valledupar' },
      { id: 56, nombre: 'Montería' },
      { id: 57, nombre: 'Sincelejo' },
      { id: 58, nombre: 'Riohacha' },
    ],
  },
  {
    id: 12,
    nombre: 'Llanos y Amazonía/Orinoquía',
    ciudades: [
      { id: 59, nombre: 'Villavicencio' },
      { id: 60, nombre: 'Yopal' },
      { id: 61, nombre: 'Florencia' },
      { id: 62, nombre: 'Arauca' },
      { id: 63, nombre: 'Leticia' },
      { id: 64, nombre: 'San José del Guaviare' },
    ],
  },
  {
    id: 13,
    nombre: 'Otros',
    ciudades: [
      { id: 65, nombre: 'Otro Municipio' },
    ],
  },
];

const EPS = [
  { id: 1, nombre: 'Nueva EPS' },
  { id: 2, nombre: 'Sanitas' },
  { id: 3, nombre: 'EPS Sura' },
  { id: 4, nombre: 'Salud Total' },
  { id: 5, nombre: 'Compensar' },
  { id: 6, nombre: 'Famisanar' },
  { id: 7, nombre: 'Coosalud' },
  { id: 8, nombre: 'Mutual Ser' },
  { id: 9, nombre: 'Capital Salud' },
  { id: 10, nombre: 'Savia Salud' },
  { id: 11, nombre: 'Asmet Salud' },
  { id: 12, nombre: 'Emssanar' },
  { id: 13, nombre: 'Cajacopi Atlántico' },
  { id: 14, nombre: 'Aliansalud' },
  { id: 15, nombre: 'Salud Mía' },
  { id: 16, nombre: 'Servicio Occidental de Salud (SOS)' },
  { id: 17, nombre: 'Otra entidad / Régimen de excepción' },
];

// Para validar lo que llega del formulario
const CIUDADES_VALIDAS = new Set(DEPARTAMENTOS.flatMap((d) => d.ciudades.map((c) => c.nombre)));
const EPS_VALIDAS = new Set(EPS.map((e) => e.nombre));

module.exports = { DEPARTAMENTOS, EPS, CIUDADES_VALIDAS, EPS_VALIDAS };
