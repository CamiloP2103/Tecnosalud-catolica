// Reabastece el inventario a mano: npm run inventario:reabastecer
// Solo funciona los lunes (hora de Bogotá) y una vez por semana; el servicio también lo hace solo.
require('dotenv').config();
const pool = require('../src/config/db');
const { crearReabastecedor } = require('../src/reabastecimiento');

const reabastecedor = crearReabastecedor({ pool, objetivo: Number(process.env.REABASTECIMIENTO_OBJETIVO) || 60 });

reabastecedor.reabastecer({ origen: 'MANUAL' })
  .then((r) => {
    console.log(`Reabastecimiento ${r.semana} (${r.fecha}): ${r.unidadesAgregadas} unidades agregadas en ${r.filasActualizadas} productos (objetivo ${r.objetivo} por producto).`);
  })
  .catch((error) => {
    console.error(error.codigo ? error.message : `ERROR: ${error.code || error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
