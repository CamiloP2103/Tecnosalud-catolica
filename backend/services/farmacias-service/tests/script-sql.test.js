import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = readFileSync(
  fileURLToPath(new URL('../database/Script_Creacion_BasedeDatosFarmacias.sql', import.meta.url)),
  'utf8'
);

// ('MED-001', 'Nombre', 'Concentración', 'Forma', 'Presentación', 'Categoría', requiere_formula, control_especial, precio, 'Uso')
const medicamentos = [...script.matchAll(/\('(MED-\d{3})', '([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)', (TRUE|FALSE), (TRUE|FALSE), (\d+), '([^']+)'\)/g)]
  .map((m) => ({
    codigo: m[1], nombre: m[2], concentracion: m[3], forma: m[4], categoria: m[6],
    requiereFormula: m[7] === 'TRUE', controlEspecial: m[8] === 'TRUE', precio: Number(m[9]),
  }));
const farmacias = [...script.matchAll(/\('(FAR-\d{2})', '([^']+)', '([^']+)', '([^']+)', (NULL|'[^']+'), '([^']+)'/g)]
  .map((m) => ({ codigo: m[1], nombre: m[2], cadena: m[3], direccion: m[4], municipio: m[6] }));

describe('script SQL de db_farmacias', () => {
  it('crea las cinco tablas del servicio', () => {
    for (const tabla of ['medicamentos', 'farmacias', 'inventario', 'solicitudes', 'solicitud_items']) {
      expect(script).toContain(`CREATE TABLE IF NOT EXISTS ${tabla}`);
    }
  });

  it('carga 100 medicamentos sin repetir código ni presentación', () => {
    expect(medicamentos).toHaveLength(100);
    expect(new Set(medicamentos.map((m) => m.codigo)).size).toBe(100);
    expect(new Set(medicamentos.map((m) => `${m.nombre}|${m.concentracion}|${m.forma}`)).size).toBe(100);
    expect(medicamentos.every((m) => m.precio > 0)).toBe(true);
  });

  it('marca correctamente cuáles requieren fórmula', () => {
    expect(medicamentos.filter((m) => m.categoria === 'Antibióticos').every((m) => m.requiereFormula)).toBe(true);
    expect(medicamentos.filter((m) => m.controlEspecial).every((m) => m.requiereFormula)).toBe(true);
    expect(medicamentos.some((m) => !m.requiereFormula)).toBe(true);
  });

  it('carga 8 farmacias de Bogotá y municipios cercanos', () => {
    expect(farmacias).toHaveLength(8);
    const municipios = new Set(farmacias.map((f) => f.municipio));
    expect(municipios.has('Bogotá D.C.')).toBe(true);
    expect([...municipios].filter((m) => m !== 'Bogotá D.C.').length).toBeGreaterThanOrEqual(2);
  });

  it('genera inventario para cada farmacia sin duplicar al re-ejecutar', () => {
    expect(script).toMatch(/INSERT IGNORE INTO inventario[\s\S]+CROSS JOIN medicamentos/);
  });
});
