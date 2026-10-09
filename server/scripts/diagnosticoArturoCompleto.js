import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Inscripcion from '../models/Inscripcion.js';
import Alumno from '../models/Alumno.js';
import Grupo from '../models/Grupo.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  const idAlumno = 'ALU032';

  // ═══════════════════════════════════════════════════════════
  // Alumno
  // ═══════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log(`ALUMNO: ${idAlumno}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const alumno = await Alumno.findOne({ idAlumno }).lean();
  if (alumno) {
    console.log(`  Nombre: ${alumno.nombreAlumno}`);
    console.log(`  Estatus: ${alumno.estatus}`);
    console.log(`  Descuento: ${alumno.descuento || 0}%`);
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════
  // Inscripciones (todas)
  // ═══════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('INSCRIPCIONES (todas)');
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripciones = await Inscripcion.find({ idAlumno }).lean();
  console.log(`Total: ${inscripciones.length}\n`);

  for (const i of inscripciones) {
    const grupo = await Grupo.findOne({ IdGrupo: i.grupoId }).lean();
    console.log(`📍 ${i.grupoId} | ${grupo?.nombreCurso || 'sin curso'}`);
    console.log(`   _id: ${i._id}`);
    console.log(`   montoMensualidad: $${i.montoMensualidad}`);
    console.log(`   diaPago: ${i.diaPago}`);
    console.log(`   fechaInicioPago: ${i.fechaInicioPago ? new Date(i.fechaInicioPago).toISOString().slice(0, 10) : '-'}`);
    console.log(`   fechaInscripcion: ${i.fechaInscripcion ? new Date(i.fechaInscripcion).toISOString().slice(0, 10) : '-'}`);
    console.log(`   fechaFin: ${i.fechaFin ? new Date(i.fechaFin).toISOString().slice(0, 10) : '-'}`);
    console.log(`   estatus: ${i.estatus}`);
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════
  // Pagos (todos, agrupados por grupo)
  // ═══════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('PAGOS (todos)');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagos = await Pago.find({ idAlumno })
    .sort({ grupoId: 1, fechaInicioPago: 1 })
    .lean();

  console.log(`Total: ${pagos.length}\n`);

  const pagosPorGrupo = {};
  for (const p of pagos) {
    if (!pagosPorGrupo[p.grupoId]) pagosPorGrupo[p.grupoId] = [];
    pagosPorGrupo[p.grupoId].push(p);
  }

  for (const [grupoId, lista] of Object.entries(pagosPorGrupo)) {
    const grupo = await Grupo.findOne({ IdGrupo: grupoId }).lean();
    console.log(`── Grupo ${grupoId} (${grupo?.nombreCurso || 'sin curso'}) — ${lista.length} pagos ──`);
    for (const p of lista) {
      const fecha = p.fechaInicioPago ? new Date(p.fechaInicioPago).toISOString().slice(0, 10) : '-';
      const fechaPago = p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0, 10) : '-';
      console.log(`  ${p.pagoId} | inicio: ${fecha} | fechaPago: ${fechaPago} | $${p.montoPago} | ${p.estatus} | ${p.tipoPago || 'normal'}`);
    }
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════
  // Abonos (todos, agrupados por grupo)
  // ═══════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('ABONOS (todos)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonos = await Abono.find({ idAlumno })
    .sort({ grupoId: 1, fechaAbono: 1 })
    .lean();

  console.log(`Total: ${abonos.length}\n`);

  const abonosPorGrupo = {};
  const abonosSinGrupo = [];
  for (const a of abonos) {
    if (!a.grupoId || a.grupoId === '') {
      abonosSinGrupo.push(a);
      continue;
    }
    if (!abonosPorGrupo[a.grupoId]) abonosPorGrupo[a.grupoId] = [];
    abonosPorGrupo[a.grupoId].push(a);
  }

  for (const [grupoId, lista] of Object.entries(abonosPorGrupo)) {
    console.log(`── Grupo ${grupoId} — ${lista.length} abonos ──`);
    for (const a of lista) {
      const fecha = a.fechaAbono ? new Date(a.fechaAbono).toISOString().slice(0, 10) : '-';
      console.log(`  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.metodoAbono} | pagoId: ${a.pagoId}`);
    }
    console.log('');
  }

  if (abonosSinGrupo.length > 0) {
    console.log(`── ⚠️  ABONOS SIN GRUPO — ${abonosSinGrupo.length} ──`);
    for (const a of abonosSinGrupo) {
      const fecha = a.fechaAbono ? new Date(a.fechaAbono).toISOString().slice(0, 10) : '-';
      console.log(`  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.metodoAbono}`);
      console.log(`      idAlumno: ${a.idAlumno} | grupoId: "${a.grupoId}" | pagoId: "${a.pagoId}"`);
      console.log(`      nombreAlumno: ${a.nombreAlumno} | notas: ${a.notas || '-'}`);
    }
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════
  // Info de GRU032
  // ═══════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('INFO de GRU032 (por si hay que asociar)');
  console.log('═══════════════════════════════════════════════════════\n');

  const grupo032 = await Grupo.findOne({ IdGrupo: 'GRU032' }).lean();
  if (grupo032) {
    console.log(`  ${grupo032.IdGrupo} | ${grupo032.nombreCurso}`);
    console.log(`  idCurso: ${grupo032.idCurso}`);
    console.log(`  precioMensualidad: $${grupo032.precioMensualidad}`);
    console.log(`  idProfesor: ${grupo032.idProfesor} | ${grupo032.nombreProfesor}`);
    console.log(`  diaClase: ${grupo032.diaClase} ${grupo032.horaClase}`);
    console.log(`  Estatus: ${grupo032.Estatus}`);
  } else {
    console.log('  ⚠️  GRU032 no encontrado');
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