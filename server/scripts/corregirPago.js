import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// 📋 EDITA AQUÍ las correcciones (una por cada caso)
// ═══════════════════════════════════════════════════════════
const CORRECCIONES = [
  {
    pagoId: 'ALU042-GRU030-2026-03',
    nuevoMontoPago: 1750,
    nuevoMontoAbono: 1750, // si el abono también está mal; null para no tocar
    nota: 'Corregido: $1900 → $1750 (monto real marzo)',
  },
];
// ═══════════════════════════════════════════════════════════

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

  for (const c of CORRECCIONES) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Caso: ${c.pagoId}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const pago = await Pago.findOne({ pagoId: c.pagoId });
    if (!pago) {
      console.log(`❌ Pago ${c.pagoId} no encontrado\n`);
      continue;
    }

    console.log('Pago ANTES:');
    console.log(`  montoPago: $${pago.montoPago}`);
    console.log(`  estatus: ${pago.estatus}\n`);

    const abonos = await Abono.find({ pagoId: c.pagoId }).lean();
    console.log(`Abonos existentes (${abonos.length}):`);
    abonos.forEach((a) => console.log(`  ${a.abonoId} | $${a.montoAbono}`));
    console.log('');

    // Aplicar cambios
    if (APPLY) {
      const updatePago = {
        montoPago: c.nuevoMontoPago,
        notas: (pago.notas || '') + ` [${c.nota}]`,
      };
      await Pago.updateOne({ _id: pago._id }, { $set: updatePago });

      if (c.nuevoMontoAbono !== null && abonos.length > 0) {
        for (const a of abonos) {
          await Abono.updateOne(
            { _id: a._id },
            {
              $set: {
                montoAbono: c.nuevoMontoAbono,
                notas: (a.notas || '') + ` [${c.nota}]`,
              },
            }
          );
        }
      }
      console.log('✅ Correcciones aplicadas');

      // Recalcular estatus
      const totalAbonado = abonos.reduce(
        (s, a) => s + (c.nuevoMontoAbono ?? a.montoAbono ?? 0),
        0
      );
      let nuevoEstatus;
      if (totalAbonado >= c.nuevoMontoPago) nuevoEstatus = 'Pagado';
      else if (totalAbonado > 0) nuevoEstatus = 'Parcial';
      else nuevoEstatus = 'Pendiente';

      await Pago.updateOne({ _id: pago._id }, { $set: { estatus: nuevoEstatus } });
      console.log(`✅ Estatus recalculado: ${nuevoEstatus}\n`);
    } else {
      console.log(`🔍 DRY RUN:`);
      console.log(`  montoPago: $${pago.montoPago} → $${c.nuevoMontoPago}`);
      if (c.nuevoMontoAbono !== null) {
        abonos.forEach((a) =>
          console.log(`  ${a.abonoId}: $${a.montoAbono} → $${c.nuevoMontoAbono}`)
        );
      }
      console.log('');
    }
  }

  console.log('✅ Proceso completado');
  if (!APPLY) console.log('\n👉 Aplicar: node server/scripts/corregirPago.js --apply');
}

corregir()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });