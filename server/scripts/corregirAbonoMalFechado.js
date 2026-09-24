import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';
import Pago from '../models/Pago.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// 📋 EDITAR AQUÍ si hay más casos
// ═══════════════════════════════════════════════════════════
const CORRECCIONES = [
  {
    abonoId: 'ABO196',
    nuevaFecha: '2026-04-28', // fecha real del pago de abril
    nuevoPagoId: 'ALU078-GRU049-2026-04', // mes real
    pagoIdActual: 'ALU078-GRU049-2026-03', // para recalcular su estatus
    nota: 'Corregido: fecha sept→abr, mes mar→abr',
  },
];
// ═══════════════════════════════════════════════════════════

function parseFechaLocal(str) {
  if (!str) return null;
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

  for (const c of CORRECCIONES) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Caso: ${c.abonoId}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const abono = await Abono.findOne({ abonoId: c.abonoId });
    if (!abono) {
      console.log(`❌ Abono ${c.abonoId} no encontrado\n`);
      continue;
    }

    const fechaVieja = new Date(abono.fechaAbono).toISOString().slice(0, 10);

    console.log('📊 ANTES:');
    console.log(`  Abono: ${abono.abonoId}`);
    console.log(`  fechaAbono: ${fechaVieja} → ${c.nuevaFecha}`);
    console.log(`  pagoId: ${abono.pagoId} → ${c.nuevoPagoId}`);
    console.log(`  monto: $${abono.montoAbono}\n`);

    // Verificar que el nuevo PagoId existe
    const pagoNuevo = await Pago.findOne({ pagoId: c.nuevoPagoId });
    if (!pagoNuevo) {
      console.log(`❌ Pago destino ${c.nuevoPagoId} NO existe. Abortando este caso.`);
      console.log(`   Solución: primero hay que crear el Pago de abril.\n`);
      continue;
    }
    console.log(`✅ Pago destino existe:`);
    console.log(`   montoPago actual: $${pagoNuevo.montoPago}`);
    console.log(`   estatus actual: ${pagoNuevo.estatus}\n`);

    const pagoViejo = await Pago.findOne({ pagoId: c.pagoIdActual });
    if (pagoViejo) {
      console.log(`✅ Pago origen existe (${c.pagoIdActual}):`);
      console.log(`   estatus actual: ${pagoViejo.estatus} → debería volver a Pendiente\n`);
    }

    if (!APPLY) continue;

    // ─────────────────────────────────────────────────────
    // 1. Actualizar abono
    // ─────────────────────────────────────────────────────
    const fechaNueva = parseFechaLocal(c.nuevaFecha);
    abono.fechaAbono = fechaNueva;
    abono.pagoId = c.nuevoPagoId;
    abono.notas =
      (abono.notas || '') +
      ` [${c.nota}] (era ${fechaVieja} | ${c.pagoIdActual})`;
    await abono.save();
    console.log(`✅ Abono actualizado`);

    // ─────────────────────────────────────────────────────
    // 2. Recalcular Pago destino (abril) — ahora tiene $630
    // ─────────────────────────────────────────────────────
    pagoNuevo.estatus = 'Pagado';
    pagoNuevo.fechaPago = fechaNueva;
    pagoNuevo.notas =
      (pagoNuevo.notas || '') + ' [Pagado por corrección ABO196]';
    await pagoNuevo.save();
    console.log(`✅ Pago abril marcado como Pagado`);

    // ─────────────────────────────────────────────────────
    // 3. Recalcular Pago origen (marzo) — ya no tiene abonos
    // ─────────────────────────────────────────────────────
    if (pagoViejo) {
      const abonosRestantes = await Abono.find({
        pagoId: c.pagoIdActual,
      }).lean();
      const totalAbonado = abonosRestantes.reduce(
        (s, a) => s + (a.montoAbono || 0),
        0
      );

      let nuevoEstatus;
      if (totalAbonado >= pagoViejo.montoPago) nuevoEstatus = 'Pagado';
      else if (totalAbonado > 0) nuevoEstatus = 'Parcial';
      else nuevoEstatus = 'Pendiente';

      pagoViejo.estatus = nuevoEstatus;
      pagoViejo.fechaPago = nuevoEstatus === 'Pagado' ? pagoViejo.fechaPago : null;
      await pagoViejo.save();
      console.log(`✅ Pago marzo recalculado a: ${nuevoEstatus}`);
    }

    console.log('');
  }

  console.log('✅ Proceso completado');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirAbonoMalFechado.js --apply');
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