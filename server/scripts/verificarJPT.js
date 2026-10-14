import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Inscripcion from '../models/Inscripcion.js';
import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const idAlumno = 'ALU081';

  console.log('═══════════════════════════════════════');
  console.log(`ALUMNO: ${idAlumno}`);
  console.log('═══════════════════════════════════════\n');

  const inscripciones = await Inscripcion.find({ idAlumno }).lean();
  console.log(`INSCRIPCIONES: ${inscripciones.length}`);
  inscripciones.forEach(i => {
    console.log(`  ${i.grupoId} | $${i.montoMensualidad} | inicio: ${new Date(i.fechaInicioPago).toISOString().slice(0,10)} | fin: ${i.fechaFin ? new Date(i.fechaFin).toISOString().slice(0,10) : '-'} | ${i.estatus}`);
  });

  const pagos = await Pago.find({ idAlumno }).sort({ fechaInicioPago: 1 }).lean();
  console.log(`\nPAGOS: ${pagos.length}`);
  pagos.forEach(p => {
    const fecha = new Date(p.fechaInicioPago).toISOString().slice(0,10);
    console.log(`  ${p.pagoId} | ${fecha} | $${p.montoPago} | ${p.estatus} | activo: ${p.activo}`);
  });

  const abonos = await Abono.find({ idAlumno }).lean();
  console.log(`\nABONOS: ${abonos.length}`);
  abonos.forEach(a => console.log(`  ${a.abonoId} | $${a.montoAbono} | ${a.pagoId}`));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});