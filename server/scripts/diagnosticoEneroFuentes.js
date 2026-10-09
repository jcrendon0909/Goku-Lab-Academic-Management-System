import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const CASOS = [
  { idAlumno: 'ALU017', grupoId: 'GRU020', nombre: 'Ramses' },
  { idAlumno: 'ALU016', grupoId: 'GRU039', nombre: 'Axel' },
];

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  for (const { idAlumno, grupoId, nombre } of CASOS) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`${nombre} (${idAlumno} / ${grupoId})`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Pagos de ene, feb y mar
    const pagos = await Pago.find({
      idAlumno,
      grupoId,
      pagoId: { $regex: /-2026-0[123]$/ },
    })
      .sort({ fechaInicioPago: 1 })
      .lean();

    console.log(`PAGOS ene–mar: ${pagos.length}`);
    for (const p of pagos) {
      const fecha = p.fechaInicioPago
        ? new Date(p.fechaInicioPago).toISOString().slice(0, 10)
        : '-';
      console.log(`  ${p.pagoId} | inicio: ${fecha} | $${p.montoPago} | ${p.estatus}`);
    }

    // Abonos de ene, feb y mar
    const abonos = await Abono.find({
      idAlumno,
      grupoId,
      pagoId: { $regex: /-2026-0[123]$/ },
    })
      .sort({ fechaAbono: 1 })
      .lean();

    console.log(`\nABONOS ene–mar: ${abonos.length}`);
    for (const a of abonos) {
      const fecha = a.fechaAbono
        ? new Date(a.fechaAbono).toISOString().slice(0, 10)
        : '-';
      console.log(`  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.metodoAbono} | ${a.pagoId}`);
    }
    console.log('\n');
  }

  console.log('✅ Diagnóstico completado');
}

diagnosticar()
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