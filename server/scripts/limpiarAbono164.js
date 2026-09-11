import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function limpiar() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  const abono = await Abono.findOne({ abonoId: 'ABO164' });
  if (!abono) {
    console.log('ABO164 no existe (ya limpio o nunca existió)');
    return;
  }

  console.log('ABO164 encontrado:');
  console.log(`  pagoId: ${abono.pagoId}`);
  console.log(`  monto: $${abono.montoAbono}`);
  console.log(`  fecha: ${new Date(abono.fechaAbono).toISOString().slice(0, 10)}`);
  console.log(`  notas: ${abono.notas}`);

  // Verificar que exista otro abono legítimo para el mismo pagoId
  const otros = await Abono.find({
    pagoId: abono.pagoId,
    _id: { $ne: abono._id },
  }).lean();

  console.log(`\nOtros abonos para el mismo pagoId: ${otros.length}`);
  otros.forEach((o) =>
    console.log(`  - ${o.abonoId} | $${o.montoAbono} | ${new Date(o.fechaAbono).toISOString().slice(0, 10)}`)
  );

  if (otros.length === 0) {
    console.log('\n⚠️  No hay otros abonos. NO borrar (perdería trazabilidad).');
    return;
  }

  if (!APPLY) {
    console.log('\n🔍 DRY RUN — se borraría ABO164');
    console.log('👉 Aplicar: node server/scripts/limpiarAbono164.js --apply');
    return;
  }

  const result = await Abono.deleteOne({ _id: abono._id });
  console.log(`\n✅ ABO164 eliminado (${result.deletedCount} registro)`);
}

limpiar()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });