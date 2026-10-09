import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Inscripcion from '../models/Inscripcion.js';
import { generarId } from '../utils/generarId.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración
// ═══════════════════════════════════════════════════════════
const CASOS = [
  {
    idAlumno: 'ALU017',
    grupoId: 'GRU020',
    nombreAlumno: 'Ramses Fuentes Garfias',
    montoMensual: 1400,
    metodo: 'Tarjeta',
    diaVencimiento: 11,
    fechaAbonoEnero: '2026-01-14',
  },
  {
    idAlumno: 'ALU016',
    grupoId: 'GRU039',
    nombreAlumno: 'Axel Fuentes Garfias',
    montoMensual: 1500,
    metodo: 'Tarjeta',
    diaVencimiento: 11,
    fechaAbonoEnero: '2026-01-14',
  },
];
// ═══════════════════════════════════════════════════════════

function parseFechaLocal(str) {
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

async function agregarEneroFebrero(caso) {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`${caso.nombreAlumno} (${caso.idAlumno} / ${caso.grupoId})`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Buscar inscripción
  const inscripcion = await Inscripcion.findOne({
    idAlumno: caso.idAlumno,
    grupoId: caso.grupoId,
  });
  if (!inscripcion) {
    console.log(`❌ Inscripción no encontrada. Saltando.\n`);
    return;
  }

  console.log(`Inscripción actual:`);
  console.log(`  fechaInicioPago: ${new Date(inscripcion.fechaInicioPago).toISOString().slice(0, 10)}`);
  console.log(`  diaPago: ${inscripcion.diaPago}\n`);

  // Verificar que no existan ya
  const pagoEneroId = `${caso.idAlumno}-${caso.grupoId}-2026-01`;
  const pagoFebId = `${caso.idAlumno}-${caso.grupoId}-2026-02`;

  const existenteEnero = await Pago.findOne({ pagoId: pagoEneroId });
  const existenteFeb = await Pago.findOne({ pagoId: pagoFebId });

  if (existenteEnero || existenteFeb) {
    console.log(`⚠️  Ya existen pagos:`);
    console.log(`   Enero: ${existenteEnero ? 'SÍ' : 'no'}`);
    console.log(`   Febrero: ${existenteFeb ? 'SÍ' : 'no'}`);
    console.log(`   Saltando para no duplicar.\n`);
    return;
  }

  const fechaVencEnero = parseFechaLocal(`2026-01-${caso.diaVencimiento}`);
  const fechaAbonoEnero = parseFechaLocal(caso.fechaAbonoEnero);
  const fechaVencFeb = parseFechaLocal(`2026-02-${caso.diaVencimiento}`);

  console.log('📋 Plan:');
  console.log('');
  console.log(`1. Actualizar inscripción:`);
  console.log(`   fechaInicioPago: ${new Date(inscripcion.fechaInicioPago).toISOString().slice(0, 10)} → 2026-01-${caso.diaVencimiento}`);
  console.log('');
  console.log(`2. Crear Pago ENERO:`);
  console.log(`   pagoId: ${pagoEneroId}`);
  console.log(`   vencimiento: 2026-01-${caso.diaVencimiento} | monto: $${caso.montoMensual} | Pagado`);
  console.log(`   fechaPago: ${caso.fechaAbonoEnero}`);
  console.log('');
  console.log(`3. Crear Abono ENERO:`);
  console.log(`   monto: $${caso.montoMensual} | fecha: ${caso.fechaAbonoEnero} | ${caso.metodo}`);
  console.log('');
  console.log(`4. Crear Pago FEBRERO:`);
  console.log(`   pagoId: ${pagoFebId}`);
  console.log(`   vencimiento: 2026-02-${caso.diaVencimiento} | monto: $${caso.montoMensual} | Pagado`);
  console.log(`   notas: Mes sin pago`);
  console.log('');
  console.log(`5. Crear Abono FEBRERO ($0):`);
  console.log(`   monto: $0 | fecha: 2026-02-${caso.diaVencimiento} | ${caso.metodo}`);
  console.log('');

  if (!APPLY) return;

  // ── Actualizar inscripción
  inscripcion.fechaInicioPago = fechaVencEnero;
  await inscripcion.save();
  console.log('✅ Inscripción actualizada');

  // ── Crear Pago enero
  await Pago.create({
    pagoId: pagoEneroId,
    idAlumno: caso.idAlumno,
    grupoId: caso.grupoId,
    nombreAlumno: caso.nombreAlumno,
    nombreCurso: inscripcion.nombreCurso || 'Curso',
    diaPago: caso.diaVencimiento,
    montoPago: caso.montoMensual,
    fechaInicioPago: fechaVencEnero,
    fechaPago: fechaAbonoEnero,
    activo: true,
    periodo: 'Mes',
    estatus: 'Pagado',
    descuentoAplicado: 0,
    tipoPago: 'normal',
    metodoPago: caso.metodo,
    notas: 'Pago enero (agregado retroactivamente)',
  });
  console.log('✅ Pago enero creado');

  // ── Crear Abono enero
  await Abono.create({
    abonoId: await generarId('abono'),
    pagoId: pagoEneroId,
    idAlumno: caso.idAlumno,
    grupoId: caso.grupoId,
    nombreAlumno: caso.nombreAlumno,
    montoAbono: caso.montoMensual,
    metodoAbono: caso.metodo,
    fechaAbono: fechaAbonoEnero,
    numeroDeabono: '1',
    notas: 'Pago enero (agregado retroactivamente)',
  });
  console.log('✅ Abono enero creado');

  // ── Crear Pago febrero (sin pago)
  await Pago.create({
    pagoId: pagoFebId,
    idAlumno: caso.idAlumno,
    grupoId: caso.grupoId,
    nombreAlumno: caso.nombreAlumno,
    nombreCurso: inscripcion.nombreCurso || 'Curso',
    diaPago: caso.diaVencimiento,
    montoPago: caso.montoMensual,
    fechaInicioPago: fechaVencFeb,
    fechaPago: fechaVencFeb,
    activo: true,
    periodo: 'Mes',
    estatus: 'Pagado',
    descuentoAplicado: 0,
    tipoPago: 'normal',
    metodoPago: caso.metodo,
    notas: 'Mes sin pago (abonado en $0)',
  });
  console.log('✅ Pago febrero creado');

  // ── Crear Abono febrero ($0)
  await Abono.create({
    abonoId: await generarId('abono'),
    pagoId: pagoFebId,
    idAlumno: caso.idAlumno,
    grupoId: caso.grupoId,
    nombreAlumno: caso.nombreAlumno,
    montoAbono: 0,
    metodoAbono: caso.metodo,
    fechaAbono: fechaVencFeb,
    numeroDeabono: '1',
    notas: 'Abono de $0 (mes sin pago)',
  });
  console.log('✅ Abono febrero ($0) creado\n');
}

async function main() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  for (const caso of CASOS) {
    await agregarEneroFebrero(caso);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/agregarEneroFebreroFuentes.js --apply');
  }
}

main()
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