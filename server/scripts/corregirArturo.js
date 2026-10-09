import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración del caso Arturo Aragonés (ALU032 / GRU014)
// ═══════════════════════════════════════════════════════════
const PAGO_FEBRERO_ID = 'ALU032-GRU014-2026-02';
const MONTO_REAL_FEBRERO = 700;
const FECHA_PAGO_FEBRERO = '2026-02-26'; // fecha real del pago (ABO066)

const ABONO_CERO_FEBRERO = 'ABO296';  // $0 erróneo — eliminar
const ABONO_CERO_MARZO = 'ABO297';    // $0 en mes inactivo — eliminar
// (ABO066 $700 y ABO032 $1500 se conservan)
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

  // ─────────────────────────────────────────────────────
  // 1. Corregir Pago de febrero
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Corregir Pago febrero');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoFeb = await Pago.findOne({ pagoId: PAGO_FEBRERO_ID });

  if (!pagoFeb) {
    console.log(`❌ Pago ${PAGO_FEBRERO_ID} no encontrado\n`);
  } else {
    const fechaActual = pagoFeb.fechaPago
      ? new Date(pagoFeb.fechaPago).toISOString().slice(0, 10)
      : '-';

    console.log(`ANTES:`);
    console.log(`  montoPago: $${pagoFeb.montoPago}`);
    console.log(`  fechaPago: ${fechaActual}`);
    console.log(`  estatus:   ${pagoFeb.estatus}`);
    console.log(`  notas:     ${pagoFeb.notas || '-'}`);
    console.log('');
    console.log(`DESPUÉS:`);
    console.log(`  montoPago: $${MONTO_REAL_FEBRERO}`);
    console.log(`  fechaPago: ${FECHA_PAGO_FEBRERO}`);
    console.log(`  estatus:   Pagado`);
    console.log(`  notas:     limpiada\n`);

    if (APPLY) {
  const montoOriginal = pagoFeb.montoPago;
  const fechaOriginal = pagoFeb.fechaPago
    ? new Date(pagoFeb.fechaPago).toISOString().slice(0, 10)
    : '-';

  pagoFeb.montoPago = MONTO_REAL_FEBRERO;
  pagoFeb.fechaPago = parseFechaLocal(FECHA_PAGO_FEBRERO);
  pagoFeb.estatus = 'Pagado';
  pagoFeb.tipoPago = 'normal';
  pagoFeb.notas = `[Corregido: $${montoOriginal} (${fechaOriginal}) → $${MONTO_REAL_FEBRERO} (${FECHA_PAGO_FEBRERO}), era pago total de febrero]`;
  await pagoFeb.save();
  console.log('✅ Pago febrero actualizado\n');
}
  }

  // ─────────────────────────────────────────────────────
  // 2. Eliminar ABO296 ($0 erróneo)
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log(`2. Eliminar ${ABONO_CERO_FEBRERO} ($0 erróneo de febrero)`);
  console.log('═══════════════════════════════════════════════════════\n');

  const abono296 = await Abono.findOne({ abonoId: ABONO_CERO_FEBRERO });
  if (!abono296) {
    console.log(`ℹ️  ${ABONO_CERO_FEBRERO} ya no existe\n`);
  } else {
    console.log(`  ${abono296.abonoId} | $${abono296.montoAbono} | ${abono296.pagoId}`);
    console.log(`  notas: ${abono296.notas || '-'}\n`);

    if (APPLY) {
      await Abono.deleteOne({ _id: abono296._id });
      console.log(`✅ ${ABONO_CERO_FEBRERO} eliminado\n`);
    }
  }

  // ─────────────────────────────────────────────────────
  // 3. Eliminar ABO297 ($0 de marzo inactivo)
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log(`3. Eliminar ${ABONO_CERO_MARZO} ($0 de marzo inactivo)`);
  console.log('═══════════════════════════════════════════════════════\n');

  const abono297 = await Abono.findOne({ abonoId: ABONO_CERO_MARZO });
  if (!abono297) {
    console.log(`ℹ️  ${ABONO_CERO_MARZO} ya no existe\n`);
  } else {
    console.log(`  ${abono297.abonoId} | $${abono297.montoAbono} | ${abono297.pagoId}`);
    console.log(`  notas: ${abono297.notas || '-'}\n`);

    if (APPLY) {
      await Abono.deleteOne({ _id: abono297._id });
      console.log(`✅ ${ABONO_CERO_MARZO} eliminado\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirArturo.js --apply');
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