import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';

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

async function categorizar() {
  await conectar();

  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const mesActualInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 12, 0, 0, 0);
  const mesActualFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 12, 0, 0, 0);

  console.log('🔍 Categorizando pagos "Pagado" sin abonos');
  console.log(`📅 Hoy: ${hoy.toISOString().slice(0, 10)}\n`);

  // Obtener todos los pagos Pagado sin abonos
  const pagos = await Pago.aggregate([
    { $match: { estatus: 'Pagado', activo: true, pagoId: { $regex: /-\d{4}-\d{2}$/ } } },
    {
      $lookup: {
        from: 'abonos',
        localField: 'pagoId',
        foreignField: 'pagoId',
        as: 'abonos',
      },
    },
    { $match: { abonos: { $size: 0 } } },
    {
      $project: {
        pagoId: 1,
        idAlumno: 1,
        grupoId: 1,
        nombreAlumno: 1,
        nombreCurso: 1,
        montoPago: 1,
        fechaInicioPago: 1,
        fechaPago: 1,
        tipoPago: 1,
        notas: 1,
      },
    },
    { $sort: { fechaInicioPago: 1 } },
  ]);

  console.log(`Total pagos "Pagado" sin abonos: ${pagos.length}\n`);

  // Categorizar
  const pasados = [];
  const mesActual = [];
  const futuros = [];

  for (const p of pagos) {
    const fecha = new Date(p.fechaInicioPago);
    fecha.setHours(12, 0, 0, 0);

    if (fecha < mesActualInicio) {
      pasados.push(p);
    } else if (fecha >= mesActualInicio && fecha <= mesActualFin) {
      mesActual.push(p);
    } else {
      futuros.push(p);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ MESES PASADOS (probablemente OK):  ${pasados.length}`);
  console.log(`⚠️  MES ACTUAL (revisar):             ${mesActual.length}`);
  console.log(`❌ MESES FUTUROS (bug, corregir):    ${futuros.length}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (pasados.length > 0) {
    console.log('✅ MESES PASADOS — muestra (10 primeros):');
    pasados.slice(0, 10).forEach((p) => {
      console.log(
        `  - ${p.pagoId} | ${p.nombreAlumno} | $${p.montoPago} | venc: ${new Date(p.fechaInicioPago).toISOString().slice(0, 10)}`
      );
    });
    console.log(`  ... y ${Math.max(0, pasados.length - 10)} más\n`);
  }

  if (mesActual.length > 0) {
    console.log('⚠️  MES ACTUAL — todos:');
    mesActual.forEach((p) => {
      console.log(
        `  - ${p.pagoId} | ${p.nombreAlumno} | $${p.montoPago} | venc: ${new Date(p.fechaInicioPago).toISOString().slice(0, 10)}`
      );
    });
    console.log('');
  }

  if (futuros.length > 0) {
    console.log('❌ MESES FUTUROS — muestra (20 primeros):');
    futuros.slice(0, 20).forEach((p) => {
      console.log(
        `  - ${p.pagoId} | ${p.nombreAlumno} | $${p.montoPago} | venc: ${new Date(p.fechaInicioPago).toISOString().slice(0, 10)}`
      );
    });
    console.log(`  ... y ${Math.max(0, futuros.length - 20)} más\n`);
  }

  // Agrupar futuros por alumno
  const porAlumno = {};
  for (const p of futuros) {
    const key = `${p.idAlumno}-${p.grupoId}`;
    if (!porAlumno[key]) porAlumno[key] = { nombre: p.nombreAlumno, count: 0, montoTotal: 0 };
    porAlumno[key].count++;
    porAlumno[key].montoTotal += p.montoPago || 0;
  }
  console.log('📊 Meses FUTUROS mal marcados por alumno:');
  Object.entries(porAlumno)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([key, v]) => {
      console.log(`  ${key} (${v.nombre}): ${v.count} meses | $${v.montoTotal}`);
    });

  console.log('\n✅ Categorización completada');
}

categorizar()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });