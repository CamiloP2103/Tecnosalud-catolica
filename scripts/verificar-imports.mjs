// Verifica que cada import/require relativo apunte a un archivo que existe con las MISMAS mayúsculas.
// En Windows "./Utils/x" y "./utils/x" funcionan igual, pero en Linux (GitHub Actions, servidores)
// solo funciona el nombre exacto. Uso: npm run verificar:imports
import fs from 'node:fs';
import path from 'node:path';

const IGNORAR = new Set(['node_modules', 'dist', '.git', 'storage', 'coverage']);
const EXTENSIONES = ['', '.js', '.jsx', '.mjs', '.cjs', '/index.js', '/index.jsx'];
const PATRON = /(?:from\s*|import\s*\(\s*|require\(\s*|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g;

function listar(directorio, archivos = []) {
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) listar(ruta, archivos);
    else if (/\.(jsx?|mjs|cjs)$/.test(entrada.name)) archivos.push(ruta);
  }
  return archivos;
}

// true si cada segmento de la ruta existe con exactamente esas mayúsculas
function existeConMayusculasExactas(ruta) {
  const partes = path.resolve(ruta).split(path.sep);
  let actual = partes[0] + path.sep;
  for (const parte of partes.slice(1)) {
    if (!fs.readdirSync(actual).includes(parte)) return false;
    actual = path.join(actual, parte);
  }
  return true;
}

const errores = [];
const archivos = listar(process.cwd());
for (const archivo of archivos) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  for (const [, especificador] of contenido.matchAll(PATRON)) {
    const base = path.resolve(path.dirname(archivo), especificador);
    const destino = EXTENSIONES.map((ext) => base + ext).find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    const relativo = path.relative(process.cwd(), archivo);
    if (!destino) errores.push(`${relativo}: no existe "${especificador}"`);
    else if (!existeConMayusculasExactas(destino)) errores.push(`${relativo}: "${especificador}" no coincide en mayúsculas con el archivo real`);
  }
}

if (errores.length > 0) {
  console.error(`Imports con problemas (${errores.length}):\n  - ${errores.join('\n  - ')}`);
  process.exit(1);
}
console.log(`Imports correctos en ${archivos.length} archivos.`);
