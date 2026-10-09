import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Inscripcion from '../models/Inscripcion.js';
import Alumno from '../models/Alumno.js';

const CASOS = [
  { idAlumno: 'ALU015', grupoId: 'GRU020', nota: 'Ramses (registro 1)' },
  { idAlumno: 'ALU017', grupoId: 'GRU020', nota: 'Ramses (registro 2)' },
  { idAlumno: 'ALU016', grupoId: 'GRU039', nota: 'Axel' },
];

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  for (const { idAlumno, grupoId, nota } of CASOS) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`${nota}: ${idAlumno} / ${grupoId}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Alumno
    const alumno = await Alumno.findOne({ idAlumno }).lean();
    if (alumno) {
      console.log(`  ALUMNO: ${alumno.nombreAlumno} | estatus: ${alumno.estatus} | descuento: ${alumno.descuento || 0}%`);
    } else {
      console.log(`  ⚠️  Alumno ${idAlumno} no encontrado`);
    }
    console.log('');

    // Inscripciones
    const inscripciones = await Inscripcion.find({ idAlumno, grupoId }).lean();
    console.log(`INSCRIPCIONES: ${inscripciones.length}`);
    for (const i of inscripciones) {
      console.log(`  _id: ${i._id}`);
      console.log(`  nombre: ${i.nombreAlumno}`);
      console.log(`  montoMensualidad: $${i.montoMensualidad}`);
      console.log(`  diaPago: ${i.diaPago}`);
      console.log(`  fechaInicioPago: ${i.fechaInicioPago ? new Date(i.fechaInicioPago).toISOString().slice(0, 10) : '-'}`);
      console.log(`  fechaInscripcion: ${i.fechaInscripcion ? new Date(i.fechaInscripcion).toISOString().slice(0, 10) : '-'}`);
      console.log(`  estatus: ${i.estatus}`);
      console.log('');
    }

    // Pagos
    const pagos = await Pago.find({ idAlumno, grupoId })
      .sort({ fechaInicioPago: 1 })
      .lean();
    console.log(`PAGOS: ${pagos.length}`);
    for (const p of pagos) {
      const fecha = p.fechaInicioPago ? new Date(p.fechaInicioPago).toISOString().slice(0, 10) : '-';
      const fechaPago = p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0, 10) : '-';
      console.log(
        `  ${p.pagoId} | inicio: ${fecha} | fechaPago: ${fechaPago} | $${p.montoPago} | ${p.estatus} | ${p.tipoPago || 'normal'}`
      );
    }

    // Abonos
    const abonos = await Abono.find({ idAlumno, grupoId })
      .sort({ fechaAbono: 1 })
      .lean();
    console.log(`\nABONOS: ${abonos.length}`);
    for (const a of abonos) {
      const fecha = a.fechaAbono ? new Date(a.fechaAbono).toISOString().slice(0, 10) : '-';
      console.log(
        `  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.metodoAbono} | pagoId: ${a.pagoId}`
      );
    }
    console.log('\n\n');
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