import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Abono duplicado a eliminar
// ═══════════════════════════════════════════════════════════
const ABONO_A_ELIMINAR = 'ABO217';
const ABONO_A_CONSERVAR = 'ABO216';
// ═══════════════════════════════════════════════════════════

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function limpiar() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('Eliminar abono duplicado');
  console.log('═══════════════════════════════════════════════════════\n');

  const aEliminar = await Abono.findOne({ abonoId: ABONO_A_ELIMINAR });
  const aConservar = await Abono.findOne({ abonoId: ABONO_A_CONSERVAR });

  if (!aEliminar) {
    console.log(`ℹ️  ${ABONO_A_ELIMINAR} no existe (ya fue eliminado).\n`);
    return;
  }

  console.log(`A ELIMINAR:`);
  console.log(`  ${aEliminar.abonoId}`);
  console.log(`  fecha:   ${new Date(aEliminar.fechaAbono).toISOString().slice(0, 10)}`);
  console.log(`  monto:   $${aEliminar.montoAbono}`);
  console.log(`  pagoId:  ${aEliminar.pagoId}`);
  console.log(`  createdAt: ${new Date(aEliminar.createdAt).toISOString()}\n`);

  if (aConservar) {
    console.log(`A CONSERVAR:`);
    console.log(`  ${aConservar.abonoId}`);
    console.log(`  fecha:   ${new Date(aConservar.fechaAbono).toISOString().slice(0, 10)}`);
    console.log(`  monto:   $${aConservar.montoAbono}`);
    console.log(`  createdAt: ${new Date(aConservar.createdAt).toISOString()}\n`);
  }

  if (!APPLY) {
    console.log('🔍 DRY RUN — se eliminaría 1 registro');
    console.log('👉 Aplicar: node server/scripts/eliminarAbonoDuplicadoChristian.js --apply');
    return;
  }

  await Abono.deleteOne({ _id: aEliminar._id });
  console.log('✅ ABO217 eliminado\n');
}

limpiar()
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