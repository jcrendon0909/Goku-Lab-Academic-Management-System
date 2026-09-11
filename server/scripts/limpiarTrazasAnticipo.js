import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';
import Pago from '../models/Pago.js';

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

  console.log('═══════════════════════════════════════════════════════');
  console.log('Buscando abonos $0 cuya Pago asociada es tipoPago=adelantado');
  console.log('(esos son trazas redundantes, no son pagos reales)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonosCero = await Abono.find({ montoAbono: 0 }).lean();
  console.log(`Total abonos con monto $0: ${abonosCero.length}\n`);

  const trazas = [];
  const legitimos = [];

  for (const a of abonosCero) {
    const pago = await Pago.findOne({ pagoId: a.pagoId }).lean();
    if (pago && pago.tipoPago === 'adelantado') {
      trazas.push({ abono: a, pago });
    } else {
      legitimos.push({ abono: a, pago });
    }
  }

  console.log(`🔍 Trazas de anticipo (a eliminar): ${trazas.length}`);
  trazas.forEach(({ abono, pago }) => {
    const fecha = new Date(abono.fechaAbono).toISOString().slice(0, 10);
    console.log(
      `  - ${abono.abonoId} | ${fecha} | ${abono.pagoId} | Pago: tipo=${pago.tipoPago}, estatus=${pago.estatus}`
    );
  });

  console.log(`\n✅ Abonos $0 legítimos (mes sin pago, se conservan): ${legitimos.length}`);
  legitimos.forEach(({ abono, pago }) => {
    const fecha = new Date(abono.fechaAbono).toISOString().slice(0, 10);
    console.log(
      `  - ${abono.abonoId} | ${fecha} | ${abono.pagoId} | Pago: tipo=${pago?.tipoPago || 'N/A'}`
    );
  });

  if (!APPLY) {
    console.log(
      `\n🔍 DRY RUN — se eliminarían ${trazas.length} abonos traza`
    );
    console.log(
      '👉 Aplicar: node server/scripts/limpiarTrazasAnticipo.js --apply'
    );
    return;
  }

  if (trazas.length === 0) {
    console.log('\n✅ Nada que eliminar');
    return;
  }

  const ids = trazas.map((t) => t.abono._id);
  const result = await Abono.deleteMany({ _id: { $in: ids } });
  console.log(`\n✅ ${result.deletedCount} trazas eliminadas`);
}

limpiar()
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