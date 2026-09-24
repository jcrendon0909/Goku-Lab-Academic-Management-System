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

async function listar() {
  await conectar();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hace3 = new Date(hoy);
  hace3.setDate(hace3.getDate() - 3);

  console.log(`Buscando abonos desde ${hace3.toISOString().slice(0, 10)}\n`);

  const abonos = await Abono.find({
    fechaAbono: { $gte: hace3 },
    montoAbono: { $gt: 0 },
  })
    .sort({ fechaAbono: -1 })
    .lean();

  console.log(`Encontrados: ${abonos.length}\n`);

  for (const a of abonos) {
    const fecha = new Date(a.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ${a.abonoId} | ${fecha} | $${a.montoAbono}`);
    console.log(`    Alumno: ${a.idAlumno} | Grupo: ${a.grupoId}`);
    console.log(`    pagoId: ${a.pagoId}`);
    console.log(`    Método: ${a.metodoAbono} | Notas: ${a.notas || '-'}\n`);
  }

  console.log('✅ Listado completado');
}

listar()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });