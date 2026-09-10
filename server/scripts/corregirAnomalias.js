import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

// ============================================================
// Modo de ejecución
//   node corregirAnomalias.js                        → dry-run completo
//   node corregirAnomalias.js --apply                → aplica todo
//   node corregirAnomalias.js --apply --solo=abonos  → solo abonos $1
//   node corregirAnomalias.js --apply --solo=huerfanos
//   node corregirAnomalias.js --apply --solo=futuros
//   node corregirAnomalias.js --apply --solo=mes-actual
// ============================================================
const APPLY = process.argv.includes('--apply');
const SOLO_ARG = process.argv.find((a) => a.startsWith('--solo='));
const SOLO = SOLO_ARG ? SOLO_ARG.split('=')[1] : 'todos';

async function conectar() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definido en .env');
  console.log('⏳ Conectando a MongoDB...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

// ============================================================
// 1. Abonos de $1 → $0
// ============================================================
async function corregirAbonosDeUno() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Corregir abonos de $1 → $0');
  console.log('═══════════════════════════════════════════════════════');

  const abonos = await Abono.find({ montoAbono: 1 }).lean();
  console.log(`Encontrados: ${abonos.length}\n`);

  for (const a of abonos) {
    console.log(
      `  - ${a.abonoId} | ${a.pagoId} | $1 → $0 | ${new Date(a.fechaAbono).toISOString().slice(0, 10)}`
    );
  }

  if (APPLY && abonos.length > 0) {
    const ids = abonos.map((a) => a._id);
    const result = await Abono.updateMany(
      { _id: { $in: ids } },
      {
        $set: { montoAbono: 0 },
        $currentDate: { updatedAt: true },
      }
    );
    // Agregar nota sin sobreescribir
    for (const a of abonos) {
      const prev = a.notas || '';
      await Abono.updateOne(
        { _id: a._id },
        { $set: { notas: `${prev} [Corregido: era mes sin pago]`.trim() } }
      );
    }
    console.log(`\n✅ ${result.modifiedCount} abonos corregidos a $0`);
  }
  console.log('');
}

// ============================================================
// 2. Pagos base huérfanos (sin sufijo de mes) → archivar
// ============================================================
async function corregirPagosBaseHuerfanos() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. Archivar pagos base huérfanos (sin mes)');
  console.log('═══════════════════════════════════════════════════════');

  const pagos = await Pago.find({
    pagoId: { $not: /-\d{4}-\d{2}$/ },
  }).lean();

  console.log(`Encontrados: ${pagos.length}\n`);
  for (const p of pagos) {
    console.log(`  - ${p.pagoId} | ${p.nombreAlumno} | ${p.estatus}`);
  }

  if (APPLY && pagos.length > 0) {
    const result = await Pago.updateMany(
      { _id: { $in: pagos.map((p) => p._id) } },
      {
        $set: {
          activo: false,
          estatus: 'Cancelado',
          fechaBaja: new Date(),
          notas: 'Pago base huérfano (sin mes) — archivado por script',
        },
      }
    );
    console.log(`\n✅ ${result.modifiedCount} pagos base archivados`);
  }
  console.log('');
}

// ============================================================
// 3. Abono huérfano ABO112 (pagoId "PAG401") → corregir
// ============================================================
async function corregirAbonoHuerfano() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('3. Corregir abono huérfano ABO112 (pagoId: PAG401)');
  console.log('═══════════════════════════════════════════════════════');

  const abono = await Abono.findOne({ abonoId: 'ABO112' }).lean();
  if (!abono) {
    console.log('No encontrado (ya corregido o no existe)\n');
    return;
  }

  console.log(`  abonoId: ${abono.abonoId}`);
  console.log(`  pagoId actual: ${abono.pagoId} (no existe en Pago)`);
  console.log(`  idAlumno: ${abono.idAlumno} | grupoId: ${abono.grupoId}`);
  console.log(`  monto: $${abono.montoAbono} | fecha: ${new Date(abono.fechaAbono).toISOString().slice(0, 10)}`);

  // Buscar el pago correcto del mismo alumno/grupo y mismo mes
  const fechaAbono = new Date(abono.fechaAbono);
  const mesStr = `${fechaAbono.getFullYear()}-${String(fechaAbono.getMonth() + 1).padStart(2, '0')}`;
  const pagoIdCorrecto = `ALU042-GRU030-${mesStr}`;
  const pagoCorrecto = await Pago.findOne({ pagoId: pagoIdCorrecto }).lean();

  console.log(`  → pagoId candidato: ${pagoIdCorrecto}`);
  console.log(`  → Pago existe: ${pagoCorrecto ? 'SÍ' : 'NO'}`);

  if (pagoCorrecto && APPLY) {
    await Abono.updateOne(
      { _id: abono._id },
      {
        $set: {
          pagoId: pagoIdCorrecto,
          notas: (abono.notas || '') + ' [Corregido: pagoId inválido PAG401]',
        },
      }
    );
    console.log(`\n✅ ABO112 reapuntado a ${pagoIdCorrecto}`);
  } else if (pagoCorrecto) {
    console.log(`\n🔍 DRY RUN: se reapuntaría a ${pagoIdCorrecto}`);
  }
  console.log('');
}

// ============================================================
// 4. Pagos "Pagado" en meses FUTUROS → Pendiente
// ============================================================
async function corregirPagosFuturos() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('4. Pagos futuros mal marcados como "Pagado" → "Pendiente"');
  console.log('═══════════════════════════════════════════════════════');

  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const mesActualFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 12, 0, 0, 0);

  const pagos = await Pago.find({
    estatus: 'Pagado',
    activo: true,
    pagoId: { $regex: /-\d{4}-\d{2}$/ },
    fechaInicioPago: { $gt: mesActualFin },
  }).lean();

  console.log(`Encontrados: ${pagos.length}\n`);
  pagos.slice(0, 10).forEach((p) => {
    console.log(
      `  - ${p.pagoId} | ${p.nombreAlumno} | venc: ${new Date(p.fechaInicioPago).toISOString().slice(0, 10)}`
    );
  });
  if (pagos.length > 10) console.log(`  ... y ${pagos.length - 10} más`);

  if (APPLY && pagos.length > 0) {
    const result = await Pago.updateMany(
      { _id: { $in: pagos.map((p) => p._id) } },
      {
        $set: {
          estatus: 'Pendiente',
          fechaPago: null,
          notas: 'Corregido: no puede estar Pagado antes de vencer',
        },
      }
    );
    console.log(`\n✅ ${result.modifiedCount} pagos futuros corregidos a Pendiente`);
  }
  console.log('');
}

// ============================================================
// 5. Mes ACTUAL — separar vencidos vs no vencidos
// ============================================================
async function corregirMesActual() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('5. Mes ACTUAL (Sept 2026) mal marcados como "Pagado"');
  console.log('═══════════════════════════════════════════════════════');

  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const mesActualInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 12, 0, 0, 0);
  const mesActualFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 12, 0, 0, 0);

  const pagos = await Pago.find({
    estatus: 'Pagado',
    activo: true,
    pagoId: { $regex: /-\d{4}-\d{2}$/ },
    fechaInicioPago: { $gte: mesActualInicio, $lte: mesActualFin },
  }).lean();

  const vencidos = pagos.filter((p) => new Date(p.fechaInicioPago) <= hoy);
  const noVencidos = pagos.filter((p) => new Date(p.fechaInicioPago) > hoy);

  console.log(`Total: ${pagos.length}`);
  console.log(`  Vencidos (<= hoy, ${hoy.toISOString().slice(0, 10)}):  ${vencidos.length}  → NO SE TOCAN`);
  console.log(`  No vencidos (> hoy):             ${noVencidos.length}  → se corrigen a Pendiente\n`);

  if (vencidos.length > 0) {
    console.log('  Vencidos (revisar manualmente):');
    vencidos.forEach((p) =>
      console.log(`    - ${p.pagoId} | ${p.nombreAlumno} | venc: ${new Date(p.fechaInicioPago).toISOString().slice(0, 10)}`)
    );
    console.log('');
  }

  if (noVencidos.length > 0) {
    console.log('  No vencidos (se corregirán):');
    noVencidos.forEach((p) =>
      console.log(`    - ${p.pagoId} | ${p.nombreAlumno} | venc: ${new Date(p.fechaInicioPago).toISOString().slice(0, 10)}`)
    );

    if (APPLY) {
      const result = await Pago.updateMany(
        { _id: { $in: noVencidos.map((p) => p._id) } },
        {
          $set: {
            estatus: 'Pendiente',
            fechaPago: null,
            notas: 'Corregido: no puede estar Pagado antes de vencer',
          },
        }
      );
      console.log(`\n✅ ${result.modifiedCount} pagos del mes actual corregidos`);
    }
  }
  console.log('');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  await conectar();

  console.log(`🔧 Modo: ${APPLY ? '✍️  APPLY (escribe)' : '🔍 DRY RUN (no escribe)'}`);
  console.log(`📋 Alcance: ${SOLO}\n`);

  if (SOLO === 'todos' || SOLO === 'abonos')     await corregirAbonosDeUno();
  if (SOLO === 'todos' || SOLO === 'huerfanos')  await corregirPagosBaseHuerfanos();
  if (SOLO === 'todos' || SOLO === 'abono-huerfano') await corregirAbonoHuerfano();
  if (SOLO === 'todos' || SOLO === 'futuros')    await corregirPagosFuturos();
  if (SOLO === 'todos' || SOLO === 'mes-actual') await corregirMesActual();

  console.log('\n✅ Script terminado');
  if (!APPLY) console.log('\n👉 Para aplicar los cambios, agrega --apply al comando');
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });