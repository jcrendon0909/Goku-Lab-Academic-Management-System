import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Inscripcion from '../models/Inscripcion.js';
import Alumno from '../models/Alumno.js';
import Grupo from '../models/Grupo.js';

// Candidatos (por si hay más de uno)
const IDS_CANDIDATOS = ['ALU034'];

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  for (const idAlumno of IDS_CANDIDATOS) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`ALUMNO: ${idAlumno}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const alumno = await Alumno.findOne({ idAlumno }).lean();
    if (!alumno) {
      console.log('⚠️  Alumno no encontrado\n');
      continue;
    }
    console.log(`  Nombre: ${alumno.nombreAlumno}`);
    console.log(`  Estatus: ${alumno.estatus}`);
    console.log(`  Descuento: ${alumno.descuento || 0}%`);
    console.log('');

    // Inscripciones
    const inscripciones = await Inscripcion.find({ idAlumno }).lean();
    console.log(`INSCRIPCIONES: ${inscripciones.length}`);
    for (const i of inscripciones) {
      const grupo = await Grupo.findOne({ IdGrupo: i.grupoId }).lean();
      console.log(`  📍 ${i.grupoId} (${grupo?.nombreCurso || 'sin curso'})`);
      console.log(`     montoMensualidad: $${i.montoMensualidad} | diaPago: ${i.diaPago}`);
      console.log(`     fechaInicioPago: ${i.fechaInicioPago ? new Date(i.fechaInicioPago).toISOString().slice(0, 10) : '-'}`);
      console.log(`     fechaFin: ${i.fechaFin ? new Date(i.fechaFin).toISOString().slice(0, 10) : '-'}`);
      console.log(`     estatus: ${i.estatus}`);
      console.log('');
    }

    // Pagos agrupados
    console.log('═══════════════════════════════════════════════════════');
    console.log('PAGOS');
    console.log('═══════════════════════════════════════════════════════\n');

    const pagos = await Pago.find({ idAlumno })
      .sort({ grupoId: 1, fechaInicioPago: 1 })
      .lean();

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
        const fechaPago = p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0, 10) : '-';
        console.log(
          `  ${p.pagoId} | inicio: ${fecha} | fechaPago: ${fechaPago} | $${p.montoPago} | ${p.estatus} | activo: ${p.activo}`
        );
      }
      console.log('');
    }

    // Abonos agrupados
    console.log('═══════════════════════════════════════════════════════');
    console.log('ABONOS');
    console.log('═══════════════════════════════════════════════════════\n');

    const abonos = await Abono.find({ idAlumno })
      .sort({ grupoId: 1, fechaAbono: 1 })
      .lean();

    const abonosPorGrupo = {};
    for (const a of abonos) {
      const key = a.grupoId || '(sin grupo)';
      if (!abonosPorGrupo[key]) abonosPorGrupo[key] = [];
      abonosPorGrupo[key].push(a);
    }

    for (const [grupoId, lista] of Object.entries(abonosPorGrupo)) {
      console.log(`── ${grupoId} — ${lista.length} abonos ──`);
      for (const a of lista) {
        const fecha = a.fechaAbono ? new Date(a.fechaAbono).toISOString().slice(0, 19) : '-';
        const createdAt = a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 19) : '-';
        console.log(
          `  ${a.abonoId} | fecha: ${fecha} | createdAt: ${createdAt}`
        );
        console.log(
          `     $${a.montoAbono} | ${a.metodoAbono} | pagoId: ${a.pagoId}`
        );
        console.log(`     notas: ${a.notas || '-'}`);
      }
      console.log('');
    }
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