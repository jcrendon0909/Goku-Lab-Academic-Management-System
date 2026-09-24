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

  // Agrupar TODOS los abonos por pagoId
  const abonos = await Abono.find({}).lean();
  const porPago = {};
  for (const a of abonos) {
    if (!porPago[a.pagoId]) porPago[a.pagoId] = [];
    porPago[a.pagoId].push(a);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('Casos: pagoId con al menos 1 abono $0 Y 1 abono > $0');
  console.log('(el $0 suele ser workaround del $1)');
  console.log('═══════════════════════════════════════════════════════\n');

  const sospechosos = [];

  for (const [pagoId, lista] of Object.entries(porPago)) {
    const ceros = lista.filter((a) => (a.montoAbono || 0) === 0);
    const positivos = lista.filter((a) => (a.montoAbono || 0) > 0);

    if (ceros.length === 0 || positivos.length === 0) continue;

    sospechosos.push({ pagoId, ceros, positivos });
  }

  console.log(`Encontrados: ${sospechosos.length}\n`);

  for (const { pagoId, ceros, positivos } of sospechosos) {
    console.log(`═══ ${pagoId} ═══`);
    console.log('  Positivos (>$0):');
    for (const p of positivos) {
      const fecha = new Date(p.fechaAbono).toISOString().slice(0, 10);
      console.log(`    ✅ ${p.abonoId} | ${fecha} | $${p.montoAbono}`);
    }
    console.log('  Ceros ($0):');
    for (const c of ceros) {
      const fecha = new Date(c.fechaAbono).toISOString().slice(0, 10);
      const nota = c.notas || '';
      const marca = nota.includes('[Corregido: era mes sin pago]')
        ? '❌ WORKAROUND'
        : nota.includes('Abono de $0 (sin pago)')
        ? '⚠️  LEGÍTIMO (revisar)'
        : '? DESCONOCIDO';
      console.log(`    ${marca} | ${c.abonoId} | ${fecha} | ${nota}`);
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