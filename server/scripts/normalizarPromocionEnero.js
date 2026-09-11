import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// 📋 Los 4 casos Castro (promo enero 2026)
// ═══════════════════════════════════════════════════════════
const CASOS = [
  {
    alumno: 'ALU078',
    grupo: 'GRU025',
    abonoEne: 'ABO-CORR-1787850705297-GRU025-2026-01',
    abonoFeb: 'ABO-CORR-1787850705612-GRU025-2026-02',
  },
  {
    alumno: 'ALU078',
    grupo: 'GRU049',
    abonoEne: 'ABO-CORR-1787850707151-GRU049-2026-01',
    abonoFeb: 'ABO-CORR-1787850707363-GRU049-2026-02',
  },
  {
    alumno: 'ALU079',
    grupo: 'GRU025',
    abonoEne: 'ABO-CORR-1787850709177-GRU025-2026-01',
    abonoFeb: 'ABO-CORR-1787850709460-GRU025-2026-02',
  },
  {
    alumno: 'ALU079',
    grupo: 'GRU049',
    abonoEne: 'ABO-CORR-1787850711009-GRU049-2026-01',
    abonoFeb: 'ABO-CORR-1787850711238-GRU049-2026-02',
  },
];

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Conectado\n');
}

async function normalizar() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  for (const caso of CASOS) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`${caso.alumno} / ${caso.grupo}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const pagoEneId = `${caso.alumno}-${caso.grupo}-2026-01`;
    const pagoFebId = `${caso.alumno}-${caso.grupo}-2026-02`;

    const abonoEne = await Abono.findOne({ abonoId: caso.abonoEne });
    const abonoFeb = await Abono.findOne({ abonoId: caso.abonoFeb });

    if (!abonoEne || !abonoFeb) {
      console.log(
        `⚠️  Falta abono. Ene: ${!!abonoEne} | Feb: ${!!abonoFeb}. Saltando.\n`
      );
      continue;
    }

    const montoTotal = (abonoEne.montoAbono || 0) + (abonoFeb.montoAbono || 0);
    const fechaConsolidada = abonoEne.fechaAbono;

    console.log(`📊 ANTES:`);
    console.log(`  ${pagoEneId} | montoPago=$630 | abono=${abonoEne.montoAbono}`);
    console.log(`  ${pagoFebId} | montoPago=$535.5 | abono=${abonoFeb.montoAbono}`);
    console.log(`\n📋 DESPUÉS:`);
    console.log(`  ${pagoEneId} | montoPago=$${montoTotal} | abono=$${montoTotal} | Pagado`);
    console.log(`  ${pagoFebId} | montoPago=$0 | abono=$0 | Pagado (adelantado)\n`);

    if (!APPLY) continue;

    // ─────────────────────────────────────────────────────
    // 1. Consolidar abono de enero
    // ─────────────────────────────────────────────────────
    abonoEne.montoAbono = montoTotal;
    abonoEne.notas =
      (abonoEne.notas || '') +
      ' [Consolidado: promoción enero 2026 (adelanto de febrero)]';
    await abonoEne.save();

    // ─────────────────────────────────────────────────────
    // 2. Convertir abono de febrero en traza ($0)
    // ─────────────────────────────────────────────────────
    abonoFeb.montoAbono = 0;
    abonoFeb.notas =
      (abonoFeb.notas || '') +
      ' [Cubierto por anticipo de enero — promoción 2026]';
    await abonoFeb.save();

    // ─────────────────────────────────────────────────────
    // 3. Actualizar Pago enero
    // ─────────────────────────────────────────────────────
    await Pago.updateOne(
      { pagoId: pagoEneId },
      {
        $set: {
          montoPago: montoTotal,
          estatus: 'Pagado',
          fechaPago: fechaConsolidada,
          tipoPago: 'normal',
          notas:
            'Promoción enero 2026: incluye adelanto de febrero (consolidado)',
        },
      }
    );

    // ─────────────────────────────────────────────────────
    // 4. Actualizar Pago febrero → cubierto por anticipo
    // ─────────────────────────────────────────────────────
    await Pago.updateOne(
      { pagoId: pagoFebId },
      {
        $set: {
          montoPago: 0,
          estatus: 'Pagado',
          fechaPago: fechaConsolidada,
          tipoPago: 'adelantado',
          notas: 'Cubierto por anticipo de enero (promoción 2026)',
        },
      }
    );

    console.log(`✅ ${caso.alumno}/${caso.grupo} normalizado\n`);
  }

  console.log('✅ Proceso completado');
  if (!APPLY) {
    console.log(
      '\n👉 Aplicar: node server/scripts/normalizarPromocionEnero.js --apply'
    );
  }
}

normalizar()
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