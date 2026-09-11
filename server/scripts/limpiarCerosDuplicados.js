import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

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
  console.log('Eliminando $0 duplicados (manteniendo el bueno)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Identifica pagoIds con 2+ abonos $0
  const ceros = await Abono.find({ montoAbono: 0 }).lean();
  const porPago = {};
  for (const a of ceros) {
    if (!porPago[a.pagoId]) porPago[a.pagoId] = [];
    porPago[a.pagoId].push(a);
  }

  const aBorrar = [];

  for (const [pagoId, lista] of Object.entries(porPago)) {
    if (lista.length < 2) continue;

    // Prioridad 1: el que tiene "Abono de $0 (sin pago)" es el bueno
    const bueno = lista.find((a) =>
      (a.notas || '').includes('Abono de $0 (sin pago)')
    );

    // Prioridad 2: si no hay bueno, el que NO tenga "[Corregido: era mes sin pago]"
    const buenoAlt = bueno || lista.find(
      (a) => !(a.notas || '').includes('[Corregido: era mes sin pago]')
    );

    // Los demás se borran
    for (const a of lista) {
      if (buenoAlt && a._id.toString() === buenoAlt._id.toString()) continue;
      aBorrar.push({ pagoId, abono: a, bueno: buenoAlt });
    }
  }

  console.log(`Abonos $0 a eliminar: ${aBorrar.length}\n`);

  for (const { pagoId, abono, bueno } of aBorrar) {
    const fecha = new Date(abono.fechaAbono).toISOString().slice(0, 10);
    console.log(`  🗑️  ${abono.abonoId} | ${fecha} | ${pagoId}`);
    console.log(`     notas: ${abono.notas}`);
    if (bueno) {
      console.log(`     ✅ se conserva: ${bueno.abonoId}`);
    } else {
      console.log(`     ⚠️  sin candidato claro para conservar`);
    }
    console.log('');
  }

  if (!APPLY) {
    console.log(`🔍 DRY RUN — se eliminarían ${aBorrar.length} abonos`);
    console.log('👉 Aplicar: node server/scripts/limpiarCerosDuplicados.js --apply');
    return;
  }

  if (aBorrar.length === 0) {
    console.log('✅ Nada que eliminar');
    return;
  }

  const ids = aBorrar.map((x) => x.abono._id);
  const result = await Abono.deleteMany({ _id: { $in: ids } });
  console.log(`✅ ${result.deletedCount} abonos $0 duplicados eliminados`);
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