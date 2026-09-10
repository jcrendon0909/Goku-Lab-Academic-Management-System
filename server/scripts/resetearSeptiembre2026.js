import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';

const APPLY = process.argv.includes('--apply');

async function conectar() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definido en .env');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });
}

async function reset() {
  await conectar();
  console.log('🔧 Reset Septiembre 2026 (los 19 restantes)\n');

  const inicio = new Date(2026, 8, 1, 12, 0, 0, 0); // Sept 1
  const fin = new Date(2026, 8, 30, 23, 59, 59, 999); // Sept 30

  const pagos = await Pago.find({
    estatus: 'Pagado',
    activo: true,
    pagoId: { $regex: /-\d{4}-\d{2}$/ },
    fechaInicioPago: { $gte: inicio, $lte: fin },
  }).lean();

  console.log(`Encontrados: ${pagos.length}\n`);
  pagos.forEach((p) =>
    console.log(
      `  - ${p.pagoId} | ${p.nombreAlumno} | venc: ${new Date(p.fechaInicioPago).toISOString().slice(0, 10)}`
    )
  );

  if (!APPLY) {
    console.log('\n🔍 DRY RUN — agrega --apply para ejecutar');
    return;
  }

  const result = await Pago.updateMany(
    { _id: { $in: pagos.map((p) => p._id) } },
    {
      $set: {
        estatus: 'Pendiente',
        fechaPago: null,
        notas: 'Reset: pago no confirmado en Excel (Sept 2026)',
      },
    }
  );
  console.log(`\n✅ ${result.modifiedCount} pagos reseteados a Pendiente`);
}

reset()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });