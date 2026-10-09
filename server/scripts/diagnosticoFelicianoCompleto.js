import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Inscripcion from '../models/Inscripcion.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  const idAlumno = 'ALU054';

  console.log('═══════════════════════════════════════════════════════');
  console.log('INSCRIPCIONES');
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripciones = await Inscripcion.find({ idAlumno }).lean();
  for (const i of inscripciones) {
    console.log(`📍 ${i.grupoId}`);
    console.log(`   montoMensualidad: $${i.montoMensualidad}`);
    console.log(`   diaPago: ${i.diaPago}`);
    console.log(`   fechaInicioPago: ${i.fechaInicioPago ? new Date(i.fechaInicioPago).toISOString().slice(0, 10) : '-'}`);
    console.log(`   fechaFin: ${i.fechaFin ? new Date(i.fechaFin).toISOString().slice(0, 10) : '-'}`);
    console.log(`   estatus: ${i.estatus}`);
    console.log('');
  }

  for (const grupoId of ['GRU039', 'GRU047', 'GRU056']) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`PAGOS ${grupoId}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const pagos = await Pago.find({ idAlumno, grupoId })
      .sort({ fechaInicioPago: 1 })
      .lean();

    for (const p of pagos) {
      const fecha = new Date(p.fechaInicioPago).toISOString().slice(0, 10);
      const fechaPago = p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0, 10) : '-';
      console.log(
        `  ${p.pagoId} | ${fecha} | $${p.montoPago} | ${p.estatus} | activo: ${p.activo} | fechaPago: ${fechaPago}`
      );
    }
    console.log('');
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