import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Inscripcion from '../models/Inscripcion.js';
import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración del caso Arturo Aragonés / GRU032
// ═══════════════════════════════════════════════════════════
const ID_ALUMNO = 'ALU032';
const GRUPO_ID = 'GRU032';

const ABONO_DUPLICADO_SEP = 'ABO301'; // duplicado a eliminar

// Meses con abonos reales (el resto quedan Pendiente)
const MESES_PAGADOS = {
  '2026-07': { monto: 1600, fecha: '2026-07-08' },
  '2026-08': { monto: 0,    fecha: '2026-08-31' }, // mes sin pago
  '2026-09': { monto: 1600, fecha: '2026-09-23' },
};
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
  // 1. Reactivar inscripción GRU032
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Reactivar inscripción GRU032');
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripcion = await Inscripcion.findOne({
    idAlumno: ID_ALUMNO,
    grupoId: GRUPO_ID,
  });

  if (!inscripcion) {
    console.log(`❌ Inscripción ${GRUPO_ID} no encontrada\n`);
    return;
  }

  console.log(`ANTES:`);
  console.log(`  estatus: ${inscripcion.estatus}`);
  console.log(`  fechaFin: ${inscripcion.fechaFin ? new Date(inscripcion.fechaFin).toISOString().slice(0, 10) : '-'}`);
  console.log(`  montoMensualidad: $${inscripcion.montoMensualidad}`);
  console.log('');
  console.log(`DESPUÉS:`);
  console.log(`  estatus: Activa`);
  console.log(`  fechaFin: null\n`);

  if (APPLY) {
    inscripcion.estatus = 'Activa';
    inscripcion.fechaFin = null;
    await inscripcion.save();
    console.log('✅ Inscripción reactivada\n');
  }

  // ═════════════════════════════════════════════════════════
  // 2. Reactivar pagos de GRU032
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. Reactivar pagos de GRU032');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagos = await Pago.find({ idAlumno: ID_ALUMNO, grupoId: GRUPO_ID })
    .sort({ fechaInicioPago: 1 })
    .lean();

  console.log(`Total: ${pagos.length}\n`);

  if (APPLY) {
    const result = await Pago.updateMany(
      { idAlumno: ID_ALUMNO, grupoId: GRUPO_ID, activo: false },
      {
        $set: {
          activo: true,
          fechaBaja: null,
          estatus: 'Pendiente',
          notas: '',
        },
      }
    );
    console.log(`✅ ${result.modifiedCount} pagos reactivados a Pendiente\n`);
  } else {
    const inactivos = pagos.filter((p) => !p.activo);
    console.log(`Pagos inactivos a reactivar: ${inactivos.length}\n`);
  }

  // ═════════════════════════════════════════════════════════
  // 3. Marcar meses pagados
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('3. Marcar meses pagados');
  console.log('═══════════════════════════════════════════════════════\n');

  for (const [mes, info] of Object.entries(MESES_PAGADOS)) {
    const pagoId = `${ID_ALUMNO}-${GRUPO_ID}-${mes}`;
    const pago = await Pago.findOne({ pagoId });
    if (!pago) {
      console.log(`⚠️  Pago ${pagoId} no existe. Saltando.\n`);
      continue;
    }

    console.log(`📍 ${pagoId}`);
    console.log(`   ANTES:  estatus=${pago.estatus}, fechaPago=${pago.fechaPago ? new Date(pago.fechaPago).toISOString().slice(0, 10) : '-'}`);
    console.log(`   DESPUÉS: estatus=Pagado, fechaPago=${info.fecha}, monto=$${info.monto}\n`);

    if (APPLY) {
      pago.montoPago = info.monto;
      pago.estatus = 'Pagado';
      pago.fechaPago = parseFechaLocal(info.fecha);
      pago.activo = true;
      if (info.monto === 0) {
        pago.notas = 'Mes sin pago (abonado en $0)';
      }
      await pago.save();
    }
  }

  if (APPLY) console.log('✅ Meses pagados actualizados\n');

  // ═════════════════════════════════════════════════════════
  // 4. Eliminar abono duplicado de septiembre
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log(`4. Eliminar abono duplicado ${ABONO_DUPLICADO_SEP}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const duplicado = await Abono.findOne({ abonoId: ABONO_DUPLICADO_SEP });
  if (!duplicado) {
    console.log(`ℹ️  ${ABONO_DUPLICADO_SEP} ya no existe\n`);
  } else {
    console.log(`  ${duplicado.abonoId} | $${duplicado.montoAbono} | ${duplicado.pagoId}`);
    console.log(`  fecha: ${new Date(duplicado.fechaAbono).toISOString().slice(0, 10)}`);
    console.log(`  createdAt: ${new Date(duplicado.createdAt).toISOString()}\n`);

    if (APPLY) {
      await Abono.deleteOne({ _id: duplicado._id });
      console.log(`✅ ${ABONO_DUPLICADO_SEP} eliminado\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirArturoGRU032.js --apply');
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