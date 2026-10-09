import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Inscripcion from '../models/Inscripcion.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
const ID_ALUMNO = 'ALU054';
// ═══════════════════════════════════════════════════════════

function parseFechaLocal(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

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

  // ═════════════════════════════════════════════════════════
  // 1. GRU047: cambiar montoPago a $1600 desde marzo
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. GRU047: cambiar montoPago a $1600 desde marzo');
  console.log('═══════════════════════════════════════════════════════\n');

  const mesesDesdeMarzo = [
    '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09', '2026-10',
    '2026-11', '2026-12',
  ];

  for (const mes of mesesDesdeMarzo) {
    const pagoId = `${ID_ALUMNO}-GRU047-${mes}`;
    const pago = await Pago.findOne({ pagoId });
    if (!pago) {
      console.log(`  ⚠️  ${pagoId} no existe`);
      continue;
    }
    const montoActual = pago.montoPago;
    console.log(`  ${pagoId} | $${montoActual} → $1600${montoActual !== 1600 ? ' ⬅️ CAMBIO' : ' (ya ok)'}`);

    if (APPLY && montoActual !== 1600) {
      pago.montoPago = 1600;
      pago.notas = (pago.notas || '') + ` [Monto actualizado de $${montoActual} a $1600 por cambio de tarifa]`;
      await pago.save();
    }
  }
  console.log('');

  // ═════════════════════════════════════════════════════════
  // 2. GRU056: cerrar inscripción y pagos desde febrero
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. GRU056: cerrar inscripción y pagos desde febrero');
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripcion = await Inscripcion.findOne({
    idAlumno: ID_ALUMNO,
    grupoId: 'GRU056',
  });

  if (inscripcion) {
    console.log(`  Inscripción ANTES: estatus=${inscripcion.estatus}, fechaFin=${inscripcion.fechaFin ? new Date(inscripcion.fechaFin).toISOString().slice(0, 10) : '-'}`);
    console.log(`  Inscripción DESPUÉS: estatus=Finalizada, fechaFin=2026-02-28`);
    console.log(`  comentarios: agregar nota "Dado de baja 28/02/2026"\n`);

    if (APPLY) {
      inscripcion.estatus = 'Finalizada';
      inscripcion.fechaFin = parseFechaLocal('2026-02-28');
      inscripcion.comentarios = (inscripcion.comentarios || '') + ' [Dado de baja 28/02/2026 — dejó de tomar regularización]';
      await inscripcion.save();
    }
  } else {
    console.log('  ⚠️  Inscripción GRU056 no encontrada\n');
  }

  // Marcar pagos feb–dic como inactivos
  const mesesInactivos = [
    '2026-02', '2026-03', '2026-04', '2026-05',
    '2026-06', '2026-07', '2026-08', '2026-09',
    '2026-10', '2026-11', '2026-12',
  ];

  for (const mes of mesesInactivos) {
    const pagoId = `${ID_ALUMNO}-GRU056-${mes}`;
    const pago = await Pago.findOne({ pagoId });
    if (!pago) {
      console.log(`  ⚠️  ${pagoId} no existe`);
      continue;
    }
    console.log(`  ${pagoId} | activo=${pago.activo} | estatus=${pago.estatus} → inactivo, Inactivo`);

    if (APPLY) {
      pago.activo = false;
      pago.estatus = 'Inactivo';
      pago.fechaBaja = parseFechaLocal('2026-02-28');
      pago.notas = 'Curso dado de baja 28/02/2026';
      await pago.save();
    }
  }
  console.log('');

  // ═════════════════════════════════════════════════════════
  // 3. GRU039 abril: recalcular estatus
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('3. GRU039 abril: recalcular estatus');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoAbrilId = `${ID_ALUMNO}-GRU039-2026-04`;
  const pagoAbril = await Pago.findOne({ pagoId: pagoAbrilId });

  if (pagoAbril) {
    const abonos = await Abono.find({ pagoId: pagoAbrilId }).lean();
    const total = abonos.reduce((s, a) => s + (a.montoAbono || 0), 0);

    console.log(`  Abonos en abril:`);
    abonos.forEach((a) => console.log(`    ${a.abonoId} | $${a.montoAbono} | ${new Date(a.fechaAbono).toISOString().slice(0, 10)}`));
    console.log(`  Total abonado: $${total}`);
    console.log(`  montoPago esperado: $${pagoAbril.montoPago}`);
    console.log(`  Estatus ANTES: ${pagoAbril.estatus}`);

    let nuevoEstatus;
    if (total >= pagoAbril.montoPago) nuevoEstatus = 'Pagado';
    else if (total > 0) nuevoEstatus = 'Parcial';
    else nuevoEstatus = 'Pendiente';

    console.log(`  Estatus DESPUÉS: ${nuevoEstatus}\n`);

    if (APPLY && pagoAbril.estatus !== nuevoEstatus) {
      pagoAbril.estatus = nuevoEstatus;
      if (nuevoEstatus === 'Pagado') {
        pagoAbril.fechaPago = abonos[abonos.length - 1].fechaAbono;
      }
      await pagoAbril.save();
    }
  } else {
    console.log(`  ⚠️  ${pagoAbrilId} no existe\n`);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirFeliciano.js --apply');
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