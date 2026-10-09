import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Alumno from '../models/Alumno.js';
import Inscripcion from '../models/Inscripcion.js';
import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Grupo from '../models/Grupo.js';

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
  console.log(`ALUMNO: ${idAlumno}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const alumno = await Alumno.findOne({ idAlumno }).lean();
  if (alumno) {
    console.log(`  Nombre: ${alumno.nombreAlumno}`);
    console.log(`  Estatus: ${alumno.estatus}`);
    console.log(`  Descuento: ${alumno.descuento || 0}%`);
    console.log(`  _id: ${alumno._id}`);
  } else {
    console.log('  ⚠️  Alumno no encontrado');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('INSCRIPCIONES');
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripciones = await Inscripcion.find({ idAlumno }).lean();
  console.log(`Total: ${inscripciones.length}\n`);
  for (const i of inscripciones) {
    const grupo = await Grupo.findOne({ IdGrupo: i.grupoId }).lean();
    console.log(`📍 ${i.grupoId} (${grupo?.nombreCurso || 'sin curso'})`);
    console.log(`   _id: ${i._id}`);
    console.log(`   montoMensualidad: $${i.montoMensualidad}`);
    console.log(`   diaPago: ${i.diaPago}`);
    console.log(`   fechaInicioPago: ${i.fechaInicioPago ? new Date(i.fechaInicioPago).toISOString().slice(0, 10) : '-'}`);
    console.log(`   fechaFin: ${i.fechaFin ? new Date(i.fechaFin).toISOString().slice(0, 10) : '-'}`);
    console.log(`   estatus: ${i.estatus}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('PAGOS');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagos = await Pago.find({ idAlumno }).sort({ grupoId: 1, fechaInicioPago: 1 }).lean();
  console.log(`Total: ${pagos.length}\n`);

  const pagosPorGrupo = {};
  for (const p of pagos) {
    if (!pagosPorGrupo[p.grupoId]) pagosPorGrupo[p.grupoId] = [];
    pagosPorGrupo[p.grupoId].push(p);
  }

  for (const [grupoId, lista] of Object.entries(pagosPorGrupo)) {
    const grupo = await Grupo.findOne({ IdGrupo: grupoId }).lean();
    console.log(`── ${grupoId} (${grupo?.nombreCurso || 'sin curso'}) — ${lista.length} pagos ──`);
    for (const p of lista) {
      const fecha = p.fechaInicioPago ? new Date(p.fechaInicioPago).toISOString().slice(0, 10) : '-';
      console.log(`  ${p.pagoId} | ${fecha} | $${p.montoPago} | ${p.estatus} | activo: ${p.activo}`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('ABONOS');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonos = await Abono.find({ idAlumno }).sort({ grupoId: 1, fechaAbono: 1 }).lean();
  console.log(`Total: ${abonos.length}\n`);
  for (const a of abonos) {
    const fecha = a.fechaAbono ? new Date(a.fechaAbono).toISOString().slice(0, 10) : '-';
    console.log(`  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.metodoAbono} | ${a.pagoId}`);
  }

  console.log('\n✅ Diagnóstico completado');
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