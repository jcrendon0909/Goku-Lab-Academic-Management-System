import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();

  const ceros = await Abono.find({ montoAbono: 0 }).lean();
  console.log(`Total abonos con monto $0: ${ceros.length}\n`);

  const porPago = {};
  for (const a of ceros) {
    if (!porPago[a.pagoId]) porPago[a.pagoId] = [];
    porPago[a.pagoId].push(a);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('Análisis por pagoId');
  console.log('═══════════════════════════════════════════════════════\n');

  const unicos = [];
  const duplicados = [];

  for (const [pagoId, lista] of Object.entries(porPago)) {
    if (lista.length === 1) {
      unicos.push({ pagoId, abono: lista[0] });
    } else {
      duplicados.push({ pagoId, lista });
    }
  }

  console.log(`📌 PagoIds con 1 solo abono $0 (legítimos): ${unicos.length}\n`);
  unicos.forEach(({ pagoId, abono }) => {
    const fecha = new Date(abono.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ${pagoId} | ${abono.abonoId} | ${fecha} | ${abono.notas}`);
  });

  console.log(`\n📌 PagoIds con 2+ abonos $0 (duplicados): ${duplicados.length}\n`);
  for (const { pagoId, lista } of duplicados) {
    console.log(`  ═══ ${pagoId} (${lista.length} abonos) ═══`);
    for (const a of lista) {
      const fecha = new Date(a.fechaAbono).toISOString().slice(0, 10);
      const marca = (a.notas || '').includes('Abono de $0 (sin pago)')
        ? '✅ BUENO'
        : '❌ BUG';
      console.log(`    ${a.abonoId} | ${fecha} | ${marca} | ${a.notas}`);
    }
    console.log('');
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