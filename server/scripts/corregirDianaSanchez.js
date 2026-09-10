import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

const APPLY = process.argv.includes('--apply');

async function conectar() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definido en .env');
  console.log('⏳ Conectando a MongoDB...');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });
  console.log('✅ Conectado\n');
}

async function corregirDiana() {
  await conectar();

  console.log('═══════════════════════════════════════════════════════');
  console.log('Corrección específica: Diana Sánchez (ALU042 / GRU030)');
  console.log('═══════════════════════════════════════════════════════\n');

  const idAlumno = 'ALU042';
  const grupoId = 'GRU030';
  const mesFaltante = '2026-02';
  const pagoIdFaltante = `${idAlumno}-${grupoId}-${mesFaltante}`;

  // ── 1. Verificar si el Pago de febrero existe ──
  const pagoExistente = await Pago.findOne({ pagoId: pagoIdFaltante });
  if (pagoExistente) {
    console.log(`ℹ️  Pago ${pagoIdFaltante} YA existe. Nada que crear.`);
    console.log(`   _id: ${pagoExistente._id}`);
    console.log(`   montoPago: $${pagoExistente.montoPago}`);
    console.log(`   estatus: ${pagoExistente.estatus}\n`);
    return;
  }

  // ── 2. Verificar el abono huérfano ABO112 ──
  const abonoHuerfano = await Abono.findOne({ abonoId: 'ABO112' });
  if (!abonoHuerfano) {
    console.log(`❌ No se encontró ABO112. Nada que hacer.\n`);
    return;
  }

  console.log('Abono huérfano encontrado:');
  console.log(`  abonoId: ${abonoHuerfano.abonoId}`);
  console.log(`  pagoId actual: ${abonoHuerfano.pagoId} (inválido)`);
  console.log(`  monto: $${abonoHuerfano.montoAbono}`);
  console.log(
    `  fecha: ${new Date(abonoHuerfano.fechaAbono).toISOString().slice(0, 10)}`
  );
  console.log(`  idAlumno: ${abonoHuerfano.idAlumno}`);
  console.log(`  grupoId: ${abonoHuerfano.grupoId}\n`);

  // ── 3. Construir el nuevo Pago de febrero ──
  const diaPago = 18;
  const fechaVencimiento = new Date(2026, 1, diaPago, 12, 0, 0, 0); // 2026-02-18
  const montoFebrero = abonoHuerfano.montoAbono || 1750;

  const nuevoPago = {
    pagoId: pagoIdFaltante,
    idAlumno,
    grupoId,
    nombreAlumno: 'Diana Sánchez Carrillo',
    nombreCurso: 'Emprendimiento',
    diaPago,
    montoPago: montoFebrero,
    fechaInicioPago: fechaVencimiento,
    activo: true,
    fechaBaja: null,
    periodo: 'Mes',
    estatus: 'Pagado',
    fechaPago: abonoHuerfano.fechaAbono,
    metodoPago: abonoHuerfano.metodoAbono || 'Efectivo',
    tipoPago: 'normal',
    descuentoAplicado: 0,
    notas: 'Reconstruido: pago faltante de febrero + relink ABO112',
  };

  console.log('📋 Plan:');
  console.log(`  1. Crear Pago: ${pagoIdFaltante}`);
  console.log(
    `     monto: $${montoFebrero} | vencimiento: ${fechaVencimiento
      .toISOString()
      .slice(0, 10)}`
  );
  console.log(
    `     estatus: Pagado | fechaPago: ${new Date(abonoHuerfano.fechaAbono)
      .toISOString()
      .slice(0, 10)}`
  );
  console.log(`  2. Relinkear ABO112 → pagoId: ${pagoIdFaltante}\n`);

  if (!APPLY) {
    console.log('🔍 DRY RUN — nada escrito. Agrega --apply para ejecutar.');
    return;
  }

  // ── 4. Crear el Pago ──
  const pagoCreado = await Pago.create(nuevoPago);
  console.log(`✅ Pago creado: ${pagoCreado.pagoId} (_id: ${pagoCreado._id})`);

  // ── 5. Relinkear el abono ──
  abonoHuerfano.pagoId = pagoIdFaltante;
  abonoHuerfano.notas =
    (abonoHuerfano.notas || '') + ' [Corregido: reapuntado desde PAG401]';
  await abonoHuerfano.save();
  console.log(`✅ ABO112 reapuntado a ${pagoIdFaltante}`);

  // ── 6. Verificación ──
  const verificacion = await Pago.findOne({ pagoId: pagoIdFaltante }).lean();
  const abonosVerificacion = await Abono.find({
    pagoId: pagoIdFaltante,
  }).lean();
  console.log('\n📊 Verificación:');
  console.log(
    `  Pago: ${verificacion.pagoId} | $${verificacion.montoPago} | ${verificacion.estatus}`
  );
  console.log(`  Abonos vinculados: ${abonosVerificacion.length}`);
  abonosVerificacion.forEach((a) =>
    console.log(`    - ${a.abonoId}: $${a.montoAbono}`)
  );

  console.log('\n✅ Corrección de Diana completada');
}

corregirDiana()
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