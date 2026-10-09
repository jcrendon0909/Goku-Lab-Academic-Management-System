import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');
const ID_ALUMNO = 'ALU054';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function fix() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  // ═════════════════════════════════════════════════════════
  // 1. GRU056: normalizar estatus a 'Cancelado' y limpiar fechaPago
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. GRU056: normalizar estatus y limpiar fechaPago');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagosGRU056 = await Pago.find({
    idAlumno: ID_ALUMNO,
    grupoId: 'GRU056',
  }).sort({ fechaInicioPago: 1 }).lean();

  console.log(`  Total: ${pagosGRU056.length}\n`);
  for (const p of pagosGRU056) {
    const fechaPago = p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0, 10) : '-';
    console.log(`  ${p.pagoId} | estatus: ${p.estatus} → Cancelado | activo: ${p.activo} → false | fechaPago: ${fechaPago} → null`);
  }

  if (APPLY) {
    const result = await Pago.updateMany(
      { idAlumno: ID_ALUMNO, grupoId: 'GRU056' },
      {
        $set: {
          activo: false,
          estatus: 'Cancelado',
          fechaPago: null,
          fechaBaja: new Date(2026, 1, 28, 12, 0, 0, 0),
          notas: 'Curso dado de baja 28/02/2026',
        },
      }
    );
    console.log(`\n  ✅ ${result.modifiedCount} pagos actualizados\n`);
  }

  // ═════════════════════════════════════════════════════════
  // 2. GRU039 abril: recalcular
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. GRU039 abril: recalcular estatus');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoAbril = await Pago.findOne({ pagoId: `${ID_ALUMNO}-GRU039-2026-04` });
  if (pagoAbril) {
    const abonos = await Abono.find({ pagoId: pagoAbril.pagoId }).lean();
    const total = abonos.reduce((s, a) => s + (a.montoAbono || 0), 0);
    console.log(`  Abonos:`);
    abonos.forEach((a) => console.log(`    ${a.abonoId} | $${a.montoAbono} | ${new Date(a.fechaAbono).toISOString().slice(0, 10)}`));
    console.log(`  Total: $${total} | montoPago: $${pagoAbril.montoPago}`);
    console.log(`  Estatus ANTES: ${pagoAbril.estatus}`);

    const nuevo = total >= pagoAbril.montoPago ? 'Pagado' : total > 0 ? 'Parcial' : 'Pendiente';
    console.log(`  Estatus DESPUÉS: ${nuevo}\n`);

    if (APPLY && pagoAbril.estatus !== nuevo) {
      const ultimo = abonos.sort((a, b) => new Date(b.fechaAbono) - new Date(a.fechaAbono))[0];
      await Pago.updateOne(
        { pagoId: pagoAbril.pagoId },
        {
          $set: {
            estatus: nuevo,
            fechaPago: nuevo === 'Pagado' ? ultimo.fechaAbono : null,
          },
        }
      );
      console.log('  ✅ Actualizado\n');
    }
  } else {
    console.log('  ⚠️  Pago abril no encontrado\n');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) console.log('\n👉 Aplicar: node server/scripts/fixGRU056Feliciano.js --apply');
}

fix()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });