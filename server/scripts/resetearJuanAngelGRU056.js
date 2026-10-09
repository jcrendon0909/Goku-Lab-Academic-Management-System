import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Inscripcion from '../models/Inscripcion.js';
import Grupo from '../models/Grupo.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración
// ═══════════════════════════════════════════════════════════
const ID_ALUMNO = 'ALU054';
const NOMBRE_ALUMNO = 'Juan Ángel Feliciano Salinas';

const PATRON_MALO = 'GRU048';   // pagoId contiene esto → eliminar
const GRUPO_BUENO = 'GRU056';

const MONTO_MENSUAL = 1600;
const DIA_PAGO = 31;
const MESES_A_GENERAR = 12; // ene a dic 2026
// ═══════════════════════════════════════════════════════════

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Conectado\n');
}

async function resetear() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  // ═════════════════════════════════════════════════════════
  // PASO 1: Eliminar TODOS los pagos de ALU054 cuyo pagoId contenga GRU048
  //         (sin importar qué grupoId tengan)
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log(`PASO 1: Eliminar pagos malformados (pagoId contiene ${PATRON_MALO})`);
  console.log('═══════════════════════════════════════════════════════\n');

  const pagosMalos = await Pago.find({
    idAlumno: ID_ALUMNO,
    pagoId: { $regex: PATRON_MALO },
  })
    .sort({ fechaInicioPago: 1 })
    .lean();

  console.log(`Encontrados: ${pagosMalos.length}\n`);
  for (const p of pagosMalos) {
    const fecha = new Date(p.fechaInicioPago).toISOString().slice(0, 10);
    console.log(`  🗑️  ${p.pagoId} | grupoId: ${p.grupoId} | ${fecha} | $${p.montoPago}`);
  }

  if (APPLY && pagosMalos.length > 0) {
    const result = await Pago.deleteMany({
      idAlumno: ID_ALUMNO,
      pagoId: { $regex: PATRON_MALO },
    });
    console.log(`\n✅ ${result.deletedCount} pagos malformados eliminados\n`);
  } else {
    console.log('');
  }

  // ═════════════════════════════════════════════════════════
  // PASO 2: Verificar inscripción GRU056
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log(`PASO 2: Verificar inscripción ${GRUPO_BUENO}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const inscripcion = await Inscripcion.findOne({
    idAlumno: ID_ALUMNO,
    grupoId: GRUPO_BUENO,
  });

  if (!inscripcion) {
    console.log(`❌ Inscripción ${GRUPO_BUENO} no encontrada. Abortando.\n`);
    return;
  }

  const grupo = await Grupo.findOne({ IdGrupo: GRUPO_BUENO });
  const nombreCurso = grupo?.nombreCurso || 'Curso sin nombre';

  console.log(`  ✅ Inscripción existe:`);
  console.log(`     Grupo: ${GRUPO_BUENO} (${nombreCurso})`);
  console.log(`     montoMensualidad: $${inscripcion.montoMensualidad}`);
  console.log(`     diaPago: ${inscripcion.diaPago}`);
  console.log(`     fechaInicioPago: ${inscripcion.fechaInicioPago ? new Date(inscripcion.fechaInicioPago).toISOString().slice(0, 10) : '-'}`);
  console.log(`     estatus: ${inscripcion.estatus}\n`);

  // ═════════════════════════════════════════════════════════
  // PASO 3: Verificar / crear pagos correctos de GRU056
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log(`PASO 3: Generar pagos de ${GRUPO_BUENO} (ene–dic 2026)`);
  console.log('═══════════════════════════════════════════════════════\n');

  const pagosCreados = [];
  const pagosExistentes = [];

  for (let mes = 0; mes < MESES_A_GENERAR; mes++) {
    const anio = 2026;
    const mesNum = mes + 1;
    const mesStr = `${anio}-${String(mesNum).padStart(2, '0')}`;
    const pagoId = `${ID_ALUMNO}-${GRUPO_BUENO}-${mesStr}`;

    const ultimoDia = new Date(anio, mesNum, 0).getDate();
    const diaReal = Math.min(DIA_PAGO, ultimoDia);
    const fechaVenc = new Date(anio, mesNum - 1, diaReal, 12, 0, 0, 0);

    // Buscar por pagoId correcto
    const existente = await Pago.findOne({ pagoId });

    if (existente) {
      const fechaExistente = existente.fechaInicioPago
        ? new Date(existente.fechaInicioPago).toISOString().slice(0, 10)
        : '-';
      console.log(`  ℹ️  ${pagoId} | ya existe | ${fechaExistente} | $${existente.montoPago} | ${existente.estatus}`);
      pagosExistentes.push(existente);
      continue;
    }

    console.log(`  + ${pagoId} | ${fechaVenc.toISOString().slice(0, 10)} | $${MONTO_MENSUAL} | Pendiente`);
    pagosCreados.push({
      pagoId,
      idAlumno: ID_ALUMNO,
      grupoId: GRUPO_BUENO,
      nombreAlumno: NOMBRE_ALUMNO,
      nombreCurso,
      diaPago: DIA_PAGO,
      montoPago: MONTO_MENSUAL,
      fechaInicioPago: fechaVenc,
      activo: true,
      periodo: 'Mes',
      estatus: 'Pendiente',
      descuentoAplicado: 0,
      tipoPago: 'normal',
      notas: 'Generado automáticamente (reset admin)',
    });
  }

  console.log('');
  console.log(`  Total a crear: ${pagosCreados.length}`);
  console.log(`  Total ya existentes: ${pagosExistentes.length}\n`);

  if (APPLY && pagosCreados.length > 0) {
    await Pago.insertMany(pagosCreados);
    console.log(`✅ ${pagosCreados.length} pagos creados\n`);
  }

  // ═════════════════════════════════════════════════════════
  // RESUMEN
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/resetearJuanAngelGRU056.js --apply');
  } else {
    console.log('\n📋 Resultado final:');
    console.log(`   Pagos malformados eliminados: ${pagosMalos.length}`);
    console.log(`   Pagos nuevos creados: ${pagosCreados.length}`);
    console.log(`   Pagos ya existentes: ${pagosExistentes.length}`);
  }
}

resetear()
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