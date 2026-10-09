import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración del caso Liliana (ALU082 / GRU026)
// ═══════════════════════════════════════════════════════════
const ID_ALUMNO = 'ALU082';
const GRUPO_ID = 'GRU026';

const FECHA_MARZO = '2026-03-10'; // fecha real del pago de marzo
const FECHA_ABRIL = '2026-04-11'; // día de pago (mes sin pago)

const ABONO_MARZO_A_CORREGIR = 'ABO252';
const ABONO_ABRIL_ACTUAL = 'ABO253';     // se queda
const ABONO_ABRIL_DUPLICADO = 'ABO254';  // se borra
// ═══════════════════════════════════════════════════════════

function parseFechaLocal(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Conectado\n');
}

async function corregir() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  const fechaMarzo = parseFechaLocal(FECHA_MARZO);
  const fechaAbril = parseFechaLocal(FECHA_ABRIL);

  const pagoMarzoId = `${ID_ALUMNO}-${GRUPO_ID}-2026-03`;
  const pagoAbrilId = `${ID_ALUMNO}-${GRUPO_ID}-2026-04`;

  // ─────────────────────────────────────────────────────
  // 1. Corregir abono marzo (fecha)
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Corregir abono marzo (ABO252)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonoMarzo = await Abono.findOne({ abonoId: ABONO_MARZO_A_CORREGIR });
  if (!abonoMarzo) {
    console.log(`❌ ${ABONO_MARZO_A_CORREGIR} no encontrado\n`);
  } else {
    const fechaActual = new Date(abonoMarzo.fechaAbono).toISOString().slice(0, 10);
    console.log(`ANTES:  fechaAbono=${fechaActual}`);
    console.log(`DESPUÉS: fechaAbono=${FECHA_MARZO}\n`);

    if (APPLY) {
      abonoMarzo.fechaAbono = fechaMarzo;
      abonoMarzo.notas =
        (abonoMarzo.notas || '') + ` [Corregido: fecha ${fechaActual} → ${FECHA_MARZO}]`;
      await abonoMarzo.save();
      console.log('✅ Abono marzo actualizado\n');
    }
  }

  // ─────────────────────────────────────────────────────
  // 2. Corregir abono abril (fecha), conservar ABO253
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. Corregir abono abril (ABO253)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonoAbril = await Abono.findOne({ abonoId: ABONO_ABRIL_ACTUAL });
  if (!abonoAbril) {
    console.log(`❌ ${ABONO_ABRIL_ACTUAL} no encontrado\n`);
  } else {
    const fechaActual = new Date(abonoAbril.fechaAbono).toISOString().slice(0, 10);
    console.log(`ANTES:  fechaAbono=${fechaActual}, monto=$${abonoAbril.montoAbono}`);
    console.log(`DESPUÉS: fechaAbono=${FECHA_ABRIL}, monto=$0\n`);

    if (APPLY) {
      abonoAbril.fechaAbono = fechaAbril;
      abonoAbril.notas =
        (abonoAbril.notas || '') + ` [Corregido: fecha ${fechaActual} → ${FECHA_ABRIL}]`;
      await abonoAbril.save();
      console.log('✅ Abono abril actualizado\n');
    }
  }

  // ─────────────────────────────────────────────────────
  // 3. Eliminar abono duplicado de abril (ABO254)
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('3. Eliminar duplicado de abril (ABO254)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonoDuplicado = await Abono.findOne({ abonoId: ABONO_ABRIL_DUPLICADO });
  if (!abonoDuplicado) {
    console.log(`ℹ️  ${ABONO_ABRIL_DUPLICADO} no existe (ya fue eliminado)\n`);
  } else {
    console.log(`ANTES:  ${abonoDuplicado.abonoId} | $${abonoDuplicado.montoAbono} | ${abonoDuplicado.pagoId}`);
    console.log(`DESPUÉS: eliminado\n`);

    if (APPLY) {
      await Abono.deleteOne({ _id: abonoDuplicado._id });
      console.log('✅ Duplicado eliminado\n');
    }
  }

  // ─────────────────────────────────────────────────────
  // 4. Corregir fechaPago del Pago de marzo
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('4. Corregir fechaPago del Pago marzo');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoMarzo = await Pago.findOne({ pagoId: pagoMarzoId });
  if (!pagoMarzo) {
    console.log(`❌ Pago ${pagoMarzoId} no encontrado\n`);
  } else {
    const fechaActual = pagoMarzo.fechaPago
      ? new Date(pagoMarzo.fechaPago).toISOString().slice(0, 10)
      : '-';
    console.log(`ANTES:  fechaPago=${fechaActual}`);
    console.log(`DESPUÉS: fechaPago=${FECHA_MARZO}\n`);

    if (APPLY) {
      pagoMarzo.fechaPago = fechaMarzo;
      await pagoMarzo.save();
      console.log('✅ Pago marzo actualizado\n');
    }
  }

  // ─────────────────────────────────────────────────────
  // 5. Corregir fechaPago del Pago de abril
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('5. Corregir fechaPago del Pago abril');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoAbril = await Pago.findOne({ pagoId: pagoAbrilId });
  if (!pagoAbril) {
    console.log(`❌ Pago ${pagoAbrilId} no encontrado\n`);
  } else {
    const fechaActual = pagoAbril.fechaPago
      ? new Date(pagoAbril.fechaPago).toISOString().slice(0, 10)
      : '-';
    console.log(`ANTES:  fechaPago=${fechaActual}`);
    console.log(`DESPUÉS: fechaPago=${FECHA_ABRIL}\n`);

    if (APPLY) {
      pagoAbril.fechaPago = fechaAbril;
      await pagoAbril.save();
      console.log('✅ Pago abril actualizado\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirLiliana.js --apply');
  }
}

corregir()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  });