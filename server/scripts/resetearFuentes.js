import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Alumno from '../models/Alumno.js';
import Inscripcion from '../models/Inscripcion.js';
import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Grupo from '../models/Grupo.js';
import { generarId } from '../utils/generarId.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración
// ═══════════════════════════════════════════════════════════
const ALUMNO_A_ELIMINAR = 'ALU015'; // duplicado de Ramses (ya eliminado, script lo detecta)

const CASOS = [
  {
    idAlumno: 'ALU017',
    grupoId: 'GRU020',
    nombreAlumno: 'Ramses Fuentes Garfias',
    montoMensualidad: 1400,
    diaPago: 11,
    fechaInicioPago: '2026-03-11',
    metodo: 'Tarjeta',
    abonos: [
      { mes: '2026-03', fecha: '2026-03-11', monto: 1400 },
      { mes: '2026-04', fecha: '2026-04-22', monto: 1400 },
      { mes: '2026-05', fecha: '2026-05-09', monto: 1400 },
      { mes: '2026-06', fecha: '2026-06-20', monto: 1400 },
    ],
  },
  {
    idAlumno: 'ALU016',
    grupoId: 'GRU039',
    nombreAlumno: 'Axel Fuentes Garfias',
    montoMensualidad: 1500,
    diaPago: 11,
    fechaInicioPago: '2026-03-11',
    metodo: 'Tarjeta',
    abonos: [
      { mes: '2026-03', fecha: '2026-03-11', monto: 1500 },
      { mes: '2026-04', fecha: '2026-04-22', monto: 1500 },
      { mes: '2026-05', fecha: '2026-05-09', monto: 1500 },
      { mes: '2026-06', fecha: '2026-06-20', monto: 1500 },
    ],
  },
];

const MESES_A_GENERAR = 12;
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

// ─────────────────────────────────────────────────────────────
// PASO 1: Eliminar ALU015 (duplicado) — idempotente
// ─────────────────────────────────────────────────────────────
async function eliminarAlu015() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`PASO 1: Eliminar ${ALUMNO_A_ELIMINAR} (duplicado)`);
  console.log('═══════════════════════════════════════════════════════\n');

  const alumno = await Alumno.findOne({ idAlumno: ALUMNO_A_ELIMINAR });
  if (!alumno) {
    console.log(`ℹ️  ${ALUMNO_A_ELIMINAR} ya no existe. Nada que eliminar.\n`);
    return;
  }

  const inscripciones = await Inscripcion.find({ idAlumno: ALUMNO_A_ELIMINAR });
  const pagos = await Pago.find({ idAlumno: ALUMNO_A_ELIMINAR });
  const abonos = await Abono.find({ idAlumno: ALUMNO_A_ELIMINAR });

  console.log(`Alumno: ${alumno.nombreAlumno}`);
  console.log(`Inscripciones: ${inscripciones.length}`);
  console.log(`Pagos: ${pagos.length}`);
  console.log(`Abonos: ${abonos.length}\n`);

  if (!APPLY) return;

  await Alumno.deleteMany({ idAlumno: ALUMNO_A_ELIMINAR });
  await Inscripcion.deleteMany({ idAlumno: ALUMNO_A_ELIMINAR });
  await Pago.deleteMany({ idAlumno: ALUMNO_A_ELIMINAR });
  await Abono.deleteMany({ idAlumno: ALUMNO_A_ELIMINAR });

  console.log('✅ ALU015 eliminado por completo\n');
}

// ─────────────────────────────────────────────────────────────
// PASO 2: Resetear cada caso (pagos + abonos)
// ─────────────────────────────────────────────────────────────
async function resetearCaso(caso) {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`${caso.nombreAlumno} (${caso.idAlumno}/${caso.grupoId})`);
  console.log('═══════════════════════════════════════════════════════\n');

  // 2.1 Verificar inscripción
  const inscripcion = await Inscripcion.findOne({
    idAlumno: caso.idAlumno,
    grupoId: caso.grupoId,
  });
  if (!inscripcion) {
    console.log(`❌ Inscripción no encontrada. Saltando.\n`);
    return;
  }

  // 2.2 Obtener nombreCurso del Grupo
  const grupo = await Grupo.findOne({ IdGrupo: caso.grupoId });
  const nombreCurso =
    grupo?.nombreCurso || inscripcion.nombreCurso || 'Curso sin nombre';

  console.log(`📊 Estado actual:`);
  console.log(`   Alumno: ${caso.nombreAlumno}`);
  console.log(`   Curso: ${nombreCurso}`);
  console.log(`   Inscripción montoMensualidad: $${inscripcion.montoMensualidad}`);
  console.log(`   Inscripción diaPago: ${inscripcion.diaPago}`);
  console.log(`   Pagos actuales: ${await Pago.countDocuments({ idAlumno: caso.idAlumno, grupoId: caso.grupoId })}`);
  console.log(`   Abonos actuales: ${await Abono.countDocuments({ idAlumno: caso.idAlumno, grupoId: caso.grupoId })}\n`);

  console.log('📋 Cambios planificados:');
  console.log(`   Alumno descuento: → 0%`);
  console.log(`   Inscripción montoMensualidad: → $${caso.montoMensualidad}`);
  console.log(`   Inscripción diaPago: → ${caso.diaPago}`);
  console.log(`   Inscripción fechaInicioPago: → ${caso.fechaInicioPago}`);
  console.log(`   Eliminar pagos y abonos actuales`);
  console.log(`   Generar ${MESES_A_GENERAR} pagos nuevos desde ${caso.fechaInicioPago}`);
  console.log(`   Crear ${caso.abonos.length} abonos nuevos\n`);

  if (!APPLY) return;

  // 2.3 Actualizar alumno y inscripción
  await Alumno.updateOne(
    { idAlumno: caso.idAlumno },
    { $set: { descuento: 0 } }
  );

  inscripcion.montoMensualidad = caso.montoMensualidad;
  inscripcion.diaPago = caso.diaPago;
  inscripcion.fechaInicioPago = parseFechaLocal(caso.fechaInicioPago);
  inscripcion.historialModificaciones =
    inscripcion.historialModificaciones || [];
  inscripcion.historialModificaciones.push({
    fecha: new Date(),
    usuario: 'admin',
    cambios: {
      reset: 'Reset completo por solicitud admin',
      montoMensualidad: caso.montoMensualidad,
      diaPago: caso.diaPago,
      fechaInicioPago: caso.fechaInicioPago,
    },
  });
  await inscripcion.save();
  console.log(`✅ Alumno y Inscripción actualizados`);

  // 2.4 Eliminar pagos y abonos antiguos
  await Pago.deleteMany({ idAlumno: caso.idAlumno, grupoId: caso.grupoId });
  await Abono.deleteMany({ idAlumno: caso.idAlumno, grupoId: caso.grupoId });
  console.log(`✅ Pagos y abonos antiguos eliminados`);

  // 2.5 Generar 12 pagos nuevos desde la fecha de inicio
  const fechaInicio = parseFechaLocal(caso.fechaInicioPago);
  const nuevosPagos = [];

  for (let i = 0; i < MESES_A_GENERAR; i++) {
    const mes = new Date(fechaInicio);
    mes.setMonth(mes.getMonth() + i);
    const ultimoDia = new Date(
      mes.getFullYear(),
      mes.getMonth() + 1,
      0
    ).getDate();
    const diaReal = Math.min(caso.diaPago, ultimoDia);
    mes.setDate(diaReal);
    mes.setHours(12, 0, 0, 0);

    const mesStr = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, '0')}`;
    const pagoId = `${caso.idAlumno}-${caso.grupoId}-${mesStr}`;

    nuevosPagos.push({
      pagoId,
      idAlumno: caso.idAlumno,
      grupoId: caso.grupoId,
      nombreAlumno: caso.nombreAlumno,
      nombreCurso, // ✅ ahora sí tiene valor
      diaPago: caso.diaPago,
      montoPago: caso.montoMensualidad,
      fechaInicioPago: mes,
      activo: true,
      periodo: 'Mes',
      estatus: 'Pendiente',
      descuentoAplicado: 0,
      tipoPago: 'normal',
      notas: 'Generado automáticamente (reset admin)',
    });
  }

  await Pago.insertMany(nuevosPagos);
  console.log(`✅ ${nuevosPagos.length} pagos nuevos creados`);

  // 2.6 Crear abonos nuevos y marcar pagos correspondientes como Pagado
  for (const ab of caso.abonos) {
    const pagoId = `${caso.idAlumno}-${caso.grupoId}-${ab.mes}`;
    const pago = await Pago.findOne({ pagoId });
    if (!pago) {
      console.log(`⚠️  Pago ${pagoId} no existe, salto abono`);
      continue;
    }

    const nuevoAbono = new Abono({
      abonoId: await generarId('abono'),
      pagoId,
      idAlumno: caso.idAlumno,
      grupoId: caso.grupoId,
      nombreAlumno: caso.nombreAlumno,
      montoAbono: ab.monto,
      metodoAbono: caso.metodo,
      fechaAbono: parseFechaLocal(ab.fecha),
      numeroDeabono: '1',
      notas: `Reset admin: abono de ${ab.mes}`,
    });
    await nuevoAbono.save();

    pago.estatus = 'Pagado';
    pago.fechaPago = parseFechaLocal(ab.fecha);
    pago.metodoPago = caso.metodo;
    await pago.save();

    console.log(`✅ Abono ${ab.mes}: $${ab.monto} (${ab.fecha})`);
  }

  console.log(`\n✅ ${caso.nombreAlumno} reseteado\n`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  await eliminarAlu015();

  for (const caso of CASOS) {
    await resetearCaso(caso);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/resetearFuentes.js --apply');
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