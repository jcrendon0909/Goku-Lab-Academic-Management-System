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

  const idAlumno = 'ALU082';
  const grupoId = 'GRU026';

  console.log('═══════════════════════════════════════════════════════');
  console.log(`INSCRIPCIÓN: ${idAlumno} / ${grupoId}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripciones = await Inscripcion.find({ idAlumno, grupoId }).lean();
  for (const i of inscripciones) {
    console.log(`  _id: ${i._id}`);
    console.log(`  nombre: ${i.nombreAlumno}`);
    console.log(`  montoMensualidad: $${i.montoMensualidad}`);
    console.log(`  diaPago: ${i.diaPago}`);
    console.log(
      `  fechaInicioPago: ${i.fechaInicioPago ? new Date(i.fechaInicioPago).toISOString().slice(0, 10) : '-'}`
    );
    console.log(`  estatus: ${i.estatus}`);
    console.log(`  comentarios: ${i.comentarios || '-'}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`PAGOS de ${idAlumno} / ${grupoId}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const pagos = await Pago.find({ idAlumno, grupoId })
    .sort({ fechaInicioPago: 1 })
    .lean();

  for (const p of pagos) {
    const fecha = p.fechaInicioPago
      ? new Date(p.fechaInicioPago).toISOString().slice(0, 10)
      : '-';
    const fechaPago = p.fechaPago
      ? new Date(p.fechaPago).toISOString().slice(0, 10)
      : '-';
    console.log(`📍 ${p.pagoId}`);
    console.log(`   fechaInicioPago: ${fecha}`);
    console.log(`   fechaPago:       ${fechaPago}`);
    console.log(`   montoPago:       $${p.montoPago}`);
    console.log(`   descuentoAplicado: ${p.descuentoAplicado || 0}%`);
    console.log(`   estatus:         ${p.estatus}`);
    console.log(`   tipoPago:        ${p.tipoPago || 'normal'}`);
    console.log(`   activo:          ${p.activo}`);
    console.log(`   notas:           ${p.notas || '-'}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`ABONOS de ${idAlumno} / ${grupoId}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const abonos = await Abono.find({ idAlumno, grupoId })
    .sort({ fechaAbono: 1, createdAt: 1 })
    .lean();

  console.log(`Total: ${abonos.length}\n`);

  for (const a of abonos) {
    const fechaAbono = a.fechaAbono
      ? new Date(a.fechaAbono).toISOString().slice(0, 19)
      : '-';
    const fechaCreacion = a.createdAt
      ? new Date(a.createdAt).toISOString().slice(0, 19)
      : '-';
    console.log(`📍 ${a.abonoId}`);
    console.log(`   fechaAbono:      ${fechaAbono}`);
    console.log(`   createdAt:       ${fechaCreacion}`);
    console.log(`   montoAbono:      $${a.montoAbono}`);
    console.log(`   metodoAbono:     ${a.metodoAbono}`);
    console.log(`   pagoId:          ${a.pagoId}`);
    console.log(`   esDescuento:     ${a.esDescuento || false}`);
    console.log(`   descuentoPorcentaje: ${a.descuentoPorcentaje || 0}%`);
    console.log(`   notas:           ${a.notas || '-'}`);
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