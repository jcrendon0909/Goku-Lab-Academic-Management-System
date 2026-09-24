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
  console.log('Eliminando $0 workaround cuando existe pago real > $0');
  console.log('═══════════════════════════════════════════════════════\n');

  const abonos = await Abono.find({}).lean();
  const porPago = {};
  for (const a of abonos) {
    if (!porPago[a.pagoId]) porPago[a.pagoId] = [];
    porPago[a.pagoId].push(a);
  }

  const aBorrar = [];

  for (const [pagoId, lista] of Object.entries(porPago)) {
    const ceros = lista.filter((a) => (a.montoAbono || 0) === 0);
    const positivos = lista.filter((a) => (a.montoAbono || 0) > 0);

    if (ceros.length === 0 || positivos.length === 0) continue;

    for (const cero of ceros) {
      const nota = cero.notas || '';

      // Regla 1: si tiene "[Corregido: era mes sin pago]" → workaround, borrar
      if (nota.includes('[Corregido: era mes sin pago]')) {
        aBorrar.push({ pagoId, abono: cero, motivo: 'Workaround $1→$0' });
        continue;
      }

      // Regla 2: "Abono de $0 (sin pago)" + pago real en el mismo mes → conflicto
      if (nota.includes('Abono de $0 (sin pago)')) {
        aBorrar.push({
          pagoId,
          abono: cero,
          motivo: 'Conflicto: mes marcado sin pago Y con pago real',
        });
        continue;
      }

      // Regla 3: otro caso → revisar manualmente
      console.log(`⚠️  Caso ambiguo: ${cero.abonoId} en ${pagoId}`);
      console.log(`   notas: ${nota}`);
    }
  }

  console.log(`Abonos $0 a eliminar: ${aBorrar.length}\n`);

  for (const { pagoId, abono, motivo } of aBorrar) {
    const fecha = new Date(abono.fechaAbono).toISOString().slice(0, 10);
    console.log(`  🗑️  ${abono.abonoId} | ${fecha} | ${pagoId}`);
    console.log(`     motivo: ${motivo}`);
    console.log(`     notas: ${abono.notas}\n`);
  }

  if (!APPLY) {
    console.log(`🔍 DRY RUN — se eliminarían ${aBorrar.length} abonos`);
    console.log('👉 Aplicar: node server/scripts/limpiarCerosConPago.js --apply');
    return;
  }

  if (aBorrar.length === 0) {
    console.log('✅ Nada que eliminar');
    return;
  }

  const ids = aBorrar.map((x) => x.abono._id);
  const result = await Abono.deleteMany({ _id: { $in: ids } });
  console.log(`✅ ${result.deletedCount} abonos $0 eliminados`);
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