import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'vitest';
import jwt from 'jsonwebtoken';
import { createApp, encryptContents, decryptContents } from '../src/app.js';

// Limpieza de servidores y carpetas temporales creados por cada prueba
const limpiezas = [];
afterEach(async () => {
  while (limpiezas.length > 0) await limpiezas.pop()();
});

const JWT_SECRET = 'secret-for-tests-only';
const ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef');
const PACIENTE = { doc: '72000607', rol: 'PACIENTE' };
const MEDICO = { doc: '52148963', rol: 'MEDICO' };

async function createFixture(pool) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'documentos-service-'));
  const server = http.createServer(createApp({
    pool,
    jwtSecret: JWT_SECRET,
    encryptionKey: ENCRYPTION_KEY,
    storageDir,
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  limpiezas.push(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  return {
    url: `http://127.0.0.1:${server.address().port}`,
    storageDir,
    token: (user) => jwt.sign(user, JWT_SECRET, { expiresIn: '1h' }),
  };
}

test('health es público y reporta el servicio activo', async () => {
  const fixture = await createFixture({ execute: async () => [[], []] });
  const response = await fetch(`${fixture.url}/api/documentos/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).servicio, 'documentos-service');
});

test('cifra archivos almacenados y detecta modificaciones', () => {
  const plaintext = Buffer.from('contenido médico privado');
  const encrypted = encryptContents(plaintext, ENCRYPTION_KEY);
  assert.notDeepEqual(encrypted, plaintext);
  assert.deepEqual(decryptContents(encrypted, ENCRYPTION_KEY), plaintext);

  encrypted[encrypted.length - 1] ^= 1;
  assert.throws(() => decryptContents(encrypted, ENCRYPTION_KEY));
});

test('rechaza consultas sin JWT y no consulta datos clínicos', async () => {
  let queries = 0;
  const fixture = await createFixture({
    execute: async () => {
      queries += 1;
      return [[], []];
    },
  });
  const response = await fetch(`${fixture.url}/api/documentos?documentoPaciente=${PACIENTE.doc}`);
  assert.equal(response.status, 401);
  assert.equal(queries, 0);
});

test('responde con un error de validación cuando la solicitud de carga no tiene formulario', async () => {
  const fixture = await createFixture({ execute: async () => [[], []] });
  const response = await fetch(`${fixture.url}/api/documentos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${fixture.token(PACIENTE)}` },
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /identificación de paciente válida/);
});

test('limita al paciente a su propia historia clínica', async () => {
  let queries = 0;
  const fixture = await createFixture({
    execute: async () => {
      queries += 1;
      return [[], []];
    },
  });
  const response = await fetch(`${fixture.url}/api/documentos?documentoPaciente=12345678`, {
    headers: { Authorization: `Bearer ${fixture.token(PACIENTE)}` },
  });
  assert.equal(response.status, 403);
  assert.equal(queries, 0);
});

test('rechaza la generación de documentos por usuarios que no sean personal clínico', async () => {
  let queries = 0;
  const fixture = await createFixture({
    execute: async () => {
      queries += 1;
      return [[], []];
    },
  });
  const response = await fetch(`${fixture.url}/api/documentos/generar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fixture.token(PACIENTE)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentoPaciente: PACIENTE.doc,
      titulo: 'Resumen',
      contenido: 'Contenido clínico de prueba',
    }),
  });
  assert.equal(response.status, 403);
  assert.equal(queries, 0);
});

test('permite a un paciente cargar un PDF únicamente en su propio expediente', async () => {
  let registro;
  const fixture = await createFixture({
    execute: async (query, values) => {
      if (query.includes('INSERT INTO documentos')) {
        registro = values;
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Consulta no esperada: ${query}`);
    },
  });
  const form = new FormData();
  form.append('documentoPaciente', PACIENTE.doc);
  form.append('titulo', 'Resultado de laboratorio');
  form.append('descripcion', 'Examen de control');
  form.append('archivo', new Blob(['%PDF-1.7\nprueba'], { type: 'application/pdf' }), 'resultado.pdf');

  const response = await fetch(`${fixture.url}/api/documentos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${fixture.token(PACIENTE)}` },
    body: form,
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).documento.nombreOriginal, 'resultado.pdf');
  assert.equal(registro[1], PACIENTE.doc);
  const ciphertext = await fs.readFile(path.join(fixture.storageDir, registro[5]));
  assert.equal(decryptContents(ciphertext, ENCRYPTION_KEY).toString(), '%PDF-1.7\nprueba');
});

test('permite al personal clínico generar un documento de texto', async () => {
  let registro;
  const fixture = await createFixture({
    execute: async (query, values) => {
      if (query.includes('INSERT INTO documentos')) {
        registro = values;
        return [{ affectedRows: 1 }, []];
      }
      throw new Error(`Consulta no esperada: ${query}`);
    },
  });
  const response = await fetch(`${fixture.url}/api/documentos/generar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fixture.token(MEDICO)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentoPaciente: PACIENTE.doc,
      titulo: 'Resumen clínico',
      contenido: 'Control médico de seguimiento.',
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(registro[1], PACIENTE.doc);
  assert.equal(registro[7], 'text/plain');
  const ciphertext = await fs.readFile(path.join(fixture.storageDir, registro[5]));
  const texto = decryptContents(ciphertext, ENCRYPTION_KEY).toString();
  assert.match(texto, /Resumen clínico/);
  assert.match(texto, /Control médico de seguimiento\./);
});

test('descarga y registra acceso solo al confirmar la identificación del JWT', async () => {
  const id = crypto.randomUUID();
  const nombreGuardado = `${id}.enc`;
  const fixture = await createFixture({
    execute: async (query) => {
      if (query.includes('FROM documentos WHERE id = ?')) {
        return [[{
          id,
          pacienteDoc: PACIENTE.doc,
          nombreOriginal: 'historia.pdf',
          nombreGuardado,
          contentType: 'application/pdf',
        }], []];
      }
      if (query.includes('INSERT INTO bitacora_descargas')) return [{ affectedRows: 1 }, []];
      throw new Error(`Consulta no esperada: ${query}`);
    },
  });
  const contenidoOriginal = Buffer.from('%PDF-contenido de prueba');
  await fs.writeFile(
    path.join(fixture.storageDir, nombreGuardado),
    encryptContents(contenidoOriginal, ENCRYPTION_KEY)
  );

  const response = await fetch(`${fixture.url}/api/documentos/${id}/descargar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fixture.token(PACIENTE)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentoAcceso: PACIENTE.doc }),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /attachment/);
  assert.equal(await response.text(), contenidoOriginal.toString());

  const denied = await fetch(`${fixture.url}/api/documentos/${id}/descargar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fixture.token(PACIENTE)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentoAcceso: '12345678' }),
  });
  assert.equal(denied.status, 403);
});

test('responde 503 con la causa cuando MySQL no está disponible', async () => {
  const fixture = await createFixture({
    execute: async () => {
      throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    },
  });
  const response = await fetch(`${fixture.url}/api/documentos?documentoPaciente=${PACIENTE.doc}`, {
    headers: { Authorization: `Bearer ${fixture.token(PACIENTE)}` },
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /MySQL no está corriendo/);
});

test('el resumen de administración exige rol ADMIN y entrega números', async () => {
  const ADMIN = { doc: '9000000001', rol: 'ADMIN' };
  const fixture = await createFixture({
    execute: async (query) => {
      if (query.includes('COUNT(DISTINCT paciente_doc)')) return [[{ total: 3, bytes: '2048', pacientes: 2, ultimos7Dias: '1' }], []];
      if (query.includes('GROUP BY content_type')) return [[{ tipo: 'application/pdf', total: 3 }], []];
      if (query.includes('FROM bitacora_descargas\'') || query.includes('ultimas24h')) return [[{ total: 5, ultimas24h: '2' }], []];
      return [[], []];
    },
  });
  const denegado = await fetch(`${fixture.url}/api/documentos/admin/resumen`, { headers: { Authorization: `Bearer ${fixture.token(PACIENTE)}` } });
  assert.equal(denegado.status, 403);
  const respuesta = await fetch(`${fixture.url}/api/documentos/admin/resumen`, { headers: { Authorization: `Bearer ${fixture.token(ADMIN)}` } });
  assert.equal(respuesta.status, 200);
  const cuerpo = await respuesta.json();
  assert.deepEqual(cuerpo.documentos, { total: 3, bytes: 2048, pacientes: 2, ultimos7Dias: 1 });
  assert.deepEqual(cuerpo.descargas, { total: 5, ultimas24h: 2 });
  assert.equal(cuerpo.porTipo[0].tipo, 'application/pdf');
});
