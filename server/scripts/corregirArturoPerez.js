import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración del caso Arturo Isaac Pérez (ALU033 / GRU029)
// ═══════════════════════════════════════════════════════════
const ID_ALUMNO = 'ALU033';
const GRUPO_ID = 'GRU029';

// Abonos
const ABO172_ID = 'ABO172'; // $700, se reasigna de marzo a mayo
const ABO304_ID = 'ABO304'; // $0 mayo, duplicado — eliminar
const ABO306_ID = 'ABO306'; // $0 julio, debe ser $1250

// Pagos
const PAGO_MARZO_ID = `${ID_ALUMNO}-${GRUPO_ID}-2026-03`;
const PAGO_MAYO_ID = `${ID_ALUMNO}-${GRUPO_ID}-2026-05`;

// Valores para julio
const JULIO_MONTO = 1250;
const JULIO_FECHA = '2026-07-22';
const JULIO_METODO = 'Transferencia';

// Valor correcto del monto mensual
const MONTO_MENSUAL = 1250;
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

  // ═════════════════════════════════════════════════════════
  // PASO 1: Reasignar ABO172 ($700) de marzo → mayo
  // (fechaAbono se mantiene en 2026-03-02 para rentabilidad)
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Reasignar ABO172 de marzo → mayo');
  console.log('═══════════════════════════════════════════════════════\n');

  const abo172 = await Abono.findOne({ abonoId: ABO172_ID });
  if (!abo172) {
    console.log(`❌ ${ABO172_ID} no encontrado\n`);
  } else {
    const fechaAbono = new Date(abo172.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ANTES:   pagoId=${abo172.pagoId} | $${abo172.montoAbono} | fechaAbono=${fechaAbono}`);
    console.log(`  DESPUÉS: pagoId=${PAGO_MAYO_ID} | $${abo172.montoAbono} | fechaAbono=${fechaAbono} (sin cambio)\n`);
    console.log(`  ℹ️  La fecha 2026-03-02 se mantiene → ingreso contable de marzo\n`);

    if (APPLY) {
      abo172.pagoId = PAGO_MAYO_ID;
      abo172.notas =
        (abo172.notas || '') +
        ` [Reasignado de ${PAGO_MARZO_ID} a ${PAGO_MAYO_ID} (ingreso marzo, aplica mayo)]`;
      await abo172.save();
      console.log('  ✅ ABO172 reasignado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 2: Eliminar ABO304 ($0 duplicado de mayo)
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. Eliminar ABO304 ($0 duplicado de mayo)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abo304 = await Abono.findOne({ abonoId: ABO304_ID });
  if (!abo304) {
    console.log(`ℹ️  ${ABO304_ID} ya no existe\n`);
  } else {
    console.log(`  ${abo304.abonoId} | $${abo304.montoAbono} | ${abo304.pagoId}`);
    console.log(`  notas: ${abo304.notas || '-'}\n`);

    if (APPLY) {
      await Abono.deleteOne({ _id: abo304._id });
      console.log('  ✅ ABO304 eliminado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 3: Corregir ABO306 (julio): $0 → $1250, fecha 22/07
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('3. Corregir ABO306 (julio)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abo306 = await Abono.findOne({ abonoId: ABO306_ID });
  if (!abo306) {
    console.log(`❌ ${ABO306_ID} no encontrado\n`);
  } else {
    const fechaActual = new Date(abo306.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ANTES:   $${abo306.montoAbono} | fecha=${fechaActual} | ${abo306.metodoAbono}`);
    console.log(`  DESPUÉS: $${JULIO_MONTO} | fecha=${JULIO_FECHA} | ${JULIO_METODO}\n`);

    if (APPLY) {
      abo306.montoAbono = JULIO_MONTO;
      abo306.fechaAbono = parseFechaLocal(JULIO_FECHA);
      abo306.metodoAbono = JULIO_METODO;
      abo306.notas =
        (abo306.notas || '') +
        ` [Corregido: era $0, pagó $${JULIO_MONTO} el ${JULIO_FECHA}]`;
      await abo306.save();
      console.log('  ✅ ABO306 actualizado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 4: Corregir Pago marzo
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('4. Corregir Pago marzo');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoMarzo = await Pago.findOne({ pagoId: PAGO_MARZO_ID });
  if (!pagoMarzo) {
    console.log(`❌ Pago ${PAGO_MARZO_ID} no encontrado\n`);
  } else {
    console.log(`  ANTES:   montoPago=$${pagoMarzo.montoPago} | estatus=${pagoMarzo.estatus} | tipoPago=${pagoMarzo.tipoPago || 'normal'}`);
    console.log(`  DESPUÉS: montoPago=$${MONTO_MENSUAL} | estatus=Pagado | tipoPago=adelantado | fechaPago=2026-01-11\n`);

    if (APPLY) {
      pagoMarzo.montoPago = MONTO_MENSUAL;
      pagoMarzo.estatus = 'Pagado';
      pagoMarzo.fechaPago = parseFechaLocal('2026-01-11');
      pagoMarzo.tipoPago = 'adelantado';
      pagoMarzo.notas = 'Cubierto por anticipo de enero (ABO078 $3400)';
      await pagoMarzo.save();
      console.log('  ✅ Pago marzo actualizado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 5: Recalcular Pago mayo (con ABO172 y ABO303)
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('5. Recalcular Pago mayo');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoMayo = await Pago.findOne({ pagoId: PAGO_MAYO_ID });
  if (!pagoMayo) {
    console.log(`❌ Pago ${PAGO_MAYO_ID} no encontrado\n`);
  } else {
    // Nota: después de los cambios anteriores, hay que refetch de abonos
    let abonosMayo;
    if (APPLY) {
      abonosMayo = await Abono.find({ pagoId: PAGO_MAYO_ID }).lean();
    } else {
      // Simular el estado final
      abonosMayo = [
        { montoAbono: 550, abonoId: 'ABO303' },
        { montoAbono: 700, abonoId: 'ABO172 (simulado)' },
      ];
    }
    const totalAbonado = abonosMayo.reduce((s, a) => s + (a.montoAbono || 0), 0);

    console.log(`  Abonos en mayo:`);
    abonosMayo.forEach((a) => console.log(`    ${a.abonoId}: $${a.montoAbono}`));
    console.log(`  Total abonado: $${totalAbonado}\n`);

    const nuevoEstatus = totalAbonado >= pagoMayo.montoPago ? 'Pagado' : 'Parcial';
    console.log(`  ANTES:   estatus=${pagoMayo.estatus}`);
    console.log(`  DESPUÉS: estatus=${nuevoEstatus}\n`);

    if (APPLY) {
      pagoMayo.estatus = nuevoEstatus;
      if (nuevoEstatus === 'Pagado') {
        pagoMayo.fechaPago = parseFechaLocal('2026-05-31'); // última fecha de abono
      }
      await pagoMayo.save();
      console.log('  ✅ Pago mayo actualizado\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirArturoPerez.js --apply');
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