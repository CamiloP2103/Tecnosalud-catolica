import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';

const RUTA_SCRIPT = fileURLToPath(new URL('../../../Database/Script_Creacion_BasededatosAutenticacion.sql', import.meta.url));
const script = readFileSync(RUTA_SCRIPT, 'utf8');

// Claves de prueba documentadas en el script y en el README
const CLAVES = {
  'caenjiro@gmail.com': '123456',
  'carlos.jimenez@tecnosalud.com.co': 'admin2026',
  'maria.gomez@clinicaejemplo.com': 'maria2026',
  'soporte.tecnosalud@gmail.com': 'soporte123',
  'afiliados.bogota@redsalud.com': 'afiliados2026',
};

describe('script SQL de db_auth', () => {
  it.each(Object.entries(CLAVES))('el hash de %s corresponde a su clave documentada', (email, clave) => {
    const fila = script.match(new RegExp(`'${email.replace(/\./g, '\\.')}', '(\\$2[ab]\\$10\\$[^']+)'`));
    expect(fila, `no se encontró ${email} en el script`).not.toBeNull();
    expect(bcrypt.compareSync(clave, fila[1])).toBe(true);
  });
});
