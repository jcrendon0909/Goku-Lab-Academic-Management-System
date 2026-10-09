import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Inscripcion from '../models/Inscripcion.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración del caso Ana (ALU029 / GRU044)
// ═══════════════════════════════════════════════════════════
const ID_ALUMNO = 'ALU029';
const GRUPO_ID = 'GRU044';
const MONTO_CORRECTO = 1400;
// ═══════════════════════════════════════════════════════════

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Conectado\n');
}

async function corregir() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  // ─────────────────────────────────────────────────────
  // 1. Corregir inscripción
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Corregir Inscripción');
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripcion = await Inscripcion.findOne({
    idAlumno: ID_ALUMNO,
    grupoId: GRUPO_ID,
  });

  if (!inscripcion) {
    console.log(`❌ Inscripción no encontrada\n`);
  } else {
    console.log(`ANTES:  montoMensualidad = $${inscripcion.montoMensualidad}`);
    console.log(`DESPUÉS: montoMensualidad = $${MONTO_CORRECTO}\n`);

    if (APPLY) {
      inscripcion.montoMensualidad = MONTO_CORRECTO;
      inscripcion.historialModificaciones = inscripcion.historialModificaciones || [];
      inscripcion.historialModificaciones.push({
        fecha: new Date(),
        usuario: 'admin',
        cambios: { montoMensualidad: { old: 1500, new: MONTO_CORRECTO } },
      });
      await inscripcion.save();
      console.log('✅ Inscripción actualizada\n');
    }
  }

  // ─────────────────────────────────────────────────────
  // 2. Corregir montoPago de TODOS los pagos
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. Corregir montoPago de todos los pagos');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagos = await Pago.find({ idAlumno: ID_ALUMNO, grupoId: GRUPO_ID })
    .sort({ fechaInicioPago: 1 })
    .lean();

  console.log(`Total pagos a revisar: ${pagos.length}\n`);

  for (const p of pagos) {
    console.log(`  ${p.pagoId} | $${p.montoPago} → $${MONTO_CORRECTO}`);
  }

  if (APPLY) {
    const result = await Pago.updateMany(
      { idAlumno: ID_ALUMNO, grupoId: GRUPO_ID },
      { $set: { montoPago: MONTO_CORRECTO } }
    );
    console.log(`\n✅ ${result.modifiedCount} pagos actualizados a $${MONTO_CORRECTO}\n`);
  } else {
    console.log('');
  }

  // ─────────────────────────────────────────────────────
  // 3. Recalcular estatus basado en abonos
  // ─────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('3. Recalcular estatus de cada pago');
  console.log('═══════════════════════════════════════════════════════\n');

  const Abono = (await import('../models/Abono.js')).default;

  // Refetch por si actualizamos montoPago
  const pagosActualizados = await Pago.find({ idAlumno: ID_ALUMNO, grupoId: GRUPO_ID })
    .sort({ fechaInicioPago: 1 })
    .lean();

  for (const p of pagosActualizados) {
    const abonos = await Abono.find({ pagoId: p.pagoId }).lean();
    const totalAbonado = abonos.reduce((s, a) => s + (a.montoAbono || 0), 0);
    const tieneAbonos = abonos.length > 0;

    let nuevoEstatus;
    if (tieneAbonos && totalAbonado >= MONTO_CORRECTO) {
      nuevoEstatus = 'Pagado';
    } else if (totalAbonado > 0) {
      nuevoEstatus = 'Parcial';
    } else if (tieneAbonos && totalAbonado === 0) {
      nuevoEstatus = 'Pagado'; // mes sin pago
    } else {
      nuevoEstatus = 'Pendiente';
    }

    const cambio = p.estatus !== nuevoEstatus;
    console.log(
      `  ${p.pagoId} | ${p.estatus}${cambio ? ` → ${nuevoEstatus}` : ' (sin cambio)'} | abonado: $${totalAbonado}`
    );

    if (APPLY && cambio) {
      await Pago.updateOne({ _id: p._id }, { $set: { estatus: nuevoEstatus } });
    }
  }

  // ─────────────────────────────────────────────────────
  // 4. Limpiar fechaPago huérfana en pagos Pendiente
  // ─────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('4. Limpiar fechaPago en pagos que no están Pagados');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagosConFechaHuerfana = await Pago.find({
    idAlumno: ID_ALUMNO,
    grupoId: GRUPO_ID,
    estatus: { $ne: 'Pagado' },
    fechaPago: { $ne: null },
  }).lean();

  console.log(`Pagos Pendiente/Parcial con fechaPago: ${pagosConFechaHuerfana.length}`);
  pagosConFechaHuerfana.forEach((p) => {
    const fecha = new Date(p.fechaPago).toISOString().slice(0, 10);
    console.log(`  ${p.pagoId} | estatus: ${p.estatus} | fechaPago: ${fecha}`);
  });

  if (APPLY && pagosConFechaHuerfana.length > 0) {
    const result = await Pago.updateMany(
      {
        _id: { $in: pagosConFechaHuerfana.map((p) => p._id) },
      },
      { $set: { fechaPago: null } }
    );
    console.log(`\n✅ ${result.modifiedCount} fechaPago limpiadas`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirAna.js --apply');
  }
}

corregir()
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