import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Abono from '../models/Abono.js';
import Pago from '../models/Pago.js';

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function diagnosticar() {
  await conectar();
  console.log('🔍 Detectando alumnos con promoción de enero\n');

  const inicioEnero = new Date(2026, 0, 1, 0, 0, 0);
  const finEnero = new Date(2026, 0, 31, 23, 59, 59);

  const abonosEnero = await Abono.find({
    fechaAbono: { $gte: inicioEnero, $lte: finEnero },
    montoAbono: { $gt: 0 },
  })
    .sort({ fechaAbono: 1 })
    .lean();

  console.log(`Abonos en enero 2026 (>$0): ${abonosEnero.length}\n`);

  // Agrupar por (idAlumno, grupoId)
  const porAlumno = {};
  for (const a of abonosEnero) {
    const key = `${a.idAlumno}-${a.grupoId}`;
    if (!porAlumno[key]) porAlumno[key] = [];
    porAlumno[key].push(a);
  }

  // Candidatos: 2+ abonos del mismo alumno/grupo en enero
  const candidatos = [];
  for (const [key, abonos] of Object.entries(porAlumno)) {
    if (abonos.length >= 2) candidatos.push({ key, abonos });
  }

  console.log(`📌 Grupos con 2+ abonos en enero: ${candidatos.length}\n`);

  for (const c of candidatos) {
    console.log(`════ ${c.key} ════`);
    for (const a of c.abonos) {
      const fecha = new Date(a.fechaAbono).toISOString().slice(0, 10);
      const pago = await Pago.findOne({ pagoId: a.pagoId }).lean();
      const info = pago
        ? `[montoPago=$${pago.montoPago}, estatus=${pago.estatus}, tipo=${pago.tipoPago || 'normal'}]`
        : '[pago NO existe]';
      console.log(
        `  ${a.abonoId} | ${fecha} | $${a.montoAbono} | ${a.pagoId} ${info}`
      );
    }
    console.log('');
  }

  console.log(`\n✅ Total candidatos: ${candidatos.length}`);
  console.log('\n📋 Alumnos únicos afectados:');
  const alumnos = new Set(candidatos.map((c) => c.key.split('-')[0]));
  console.log([...alumnos].sort().join(', '));
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