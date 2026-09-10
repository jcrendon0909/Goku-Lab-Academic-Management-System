import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

// ============================================================
// Conexión directa (evita depender de db.js)
// ============================================================
async function conectar() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI no está definido en .env');
  }

  console.log('⏳ Conectando a MongoDB...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });
  console.log('✅ Conectado a MongoDB\n');
}

async function diagnosticar() {
  await conectar();

  console.log('🔍 Diagnóstico de anomalías en pagos/abonos\n');
  console.log(`📚 Colecciones: ${Pago.collection.name} / ${Abono.collection.name}\n`);

  // ============================================
  // 1. Abonos con monto $1 (falsos pagados)
  // ============================================
  const abonosDeUno = await Abono.find({ montoAbono: 1 }).lean();
  console.log(`\n📌 Abonos con monto $1: ${abonosDeUno.length}`);

  const agrupadosPorAlumno = {};
  for (const a of abonosDeUno) {
    const key = `${a.idAlumno}-${a.grupoId}`;
    if (!agrupadosPorAlumno[key]) agrupadosPorAlumno[key] = [];
    agrupadosPorAlumno[key].push({
      abonoId: a.abonoId,
      pagoId: a.pagoId,
      fecha: a.fechaAbono,
      notas: a.notas,
    });
  }
  for (const [key, lista] of Object.entries(agrupadosPorAlumno)) {
    console.log(`  ${key}: ${lista.length} abonos de $1`);
    lista.forEach((x) =>
      console.log(
        `    - ${x.pagoId} (${x.fecha ? new Date(x.fecha).toISOString().slice(0, 10) : 'sin fecha'}) ${x.notas || ''}`
      )
    );
  }

  // ============================================
  // 2. Pagos con pagoId sin mes (base huérfano)
  // ============================================
  const pagosSinMes = await Pago.find({
    pagoId: { $not: /-\d{4}-\d{2}$/ },
  }).lean();
  console.log(`\n📌 Pagos base sin mes (pagoId huérfano): ${pagosSinMes.length}`);
  pagosSinMes.forEach((p) =>
    console.log(`  - ${p.pagoId} | ${p.nombreAlumno} | estatus: ${p.estatus}`)
  );

  // ============================================
  // 3. Duplicados exactos por pagoId
  // ============================================
  const dup = await Pago.aggregate([
    { $match: { pagoId: { $regex: /-\d{4}-\d{2}$/ } } },
    {
      $group: {
        _id: { pagoId: '$pagoId' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);
  console.log(`\n📌 Duplicados exactos de pagoId: ${dup.length}`);
  dup.forEach((d) => console.log(`  - ${d._id.pagoId} x${d.count}`));

  // ============================================
  // 4. Pagos marcados como Pagado sin abonos reales
  // ============================================
  const pagadosSinAbono = await Pago.aggregate([
    { $match: { estatus: 'Pagado', activo: true } },
    {
      $lookup: {
        from: 'abonos',
        localField: 'pagoId',
        foreignField: 'pagoId',
        as: 'abonos',
      },
    },
    { $match: { abonos: { $size: 0 } } },
    { $project: { pagoId: 1, nombreAlumno: 1, montoPago: 1, estatus: 1 } },
  ]);
  console.log(`\n📌 Pagos "Pagado" sin abonos registrados: ${pagadosSinAbono.length}`);
  pagadosSinAbono
    .slice(0, 20)
    .forEach((p) =>
      console.log(`  - ${p.pagoId} | ${p.nombreAlumno} | $${p.montoPago}`)
    );
  if (pagadosSinAbono.length > 20)
    console.log(`  ... y ${pagadosSinAbono.length - 20} más`);

  // ============================================
  // 5. Abonos huérfanos (pagoId que no existe en Pago)
  // ============================================
  const abonosHuerfanos = await Abono.aggregate([
    {
      $lookup: {
        from: 'pago',
        localField: 'pagoId',
        foreignField: 'pagoId',
        as: 'pago',
      },
    },
    { $match: { pago: { $size: 0 } } },
    { $project: { abonoId: 1, pagoId: 1, idAlumno: 1, montoAbono: 1 } },
  ]);
  console.log(`\n📌 Abonos huérfanos (sin Pago asociado): ${abonosHuerfanos.length}`);
  abonosHuerfanos
    .slice(0, 20)
    .forEach((a) =>
      console.log(`  - ${a.abonoId} → ${a.pagoId} | $${a.montoAbono}`)
    );
  if (abonosHuerfanos.length > 20)
    console.log(`  ... y ${abonosHuerfanos.length - 20} más`);

  // ============================================
  // 6. Resumen por alumno afectado
  // ============================================
  const alumnosAfectados = new Set();
  abonosDeUno.forEach((a) => alumnosAfectados.add(a.idAlumno));
  pagosSinMes.forEach((p) => alumnosAfectados.add(p.idAlumno));
  pagadosSinAbono.forEach((p) => alumnosAfectados.add(p.idAlumno));
  abonosHuerfanos.forEach((a) => alumnosAfectados.add(a.idAlumno));

  console.log(`\n📊 Alumnos únicos afectados: ${alumnosAfectados.size}`);
  console.log([...alumnosAfectados].sort().join(', '));

  console.log('\n✅ Diagnóstico completado');
}

diagnosticar()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error diagnóstico:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  });