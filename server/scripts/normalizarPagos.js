import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import Inscripcion from '../models/Inscripcion.js';

const APPLY = process.argv.includes('--apply');
const FORCE_ALL = process.argv.includes('--force-all');

async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Conectado a MongoDB\n');
}

async function normalizar() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}`);
  console.log(`🔧 Force-all: ${FORCE_ALL ? 'SÍ (aplica también hacia abajo)' : 'NO'}\n`);

  // ══════════════════════════════════════════════════════════
  // FASE A: montoPago $1 → montoMensualidad real
  // ══════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('FASE A: Pagos con montoPago = $1 → monto real');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagosConUno = await Pago.find({
    montoPago: 1,
    pagoId: { $regex: /-\d{4}-\d{2}$/ },
  }).lean();

  console.log(`Encontrados: ${pagosConUno.length}\n`);

  let countA = 0;
  for (const p of pagosConUno) {
    const inscripcion = await Inscripcion.findOne({
      idAlumno: p.idAlumno,
      grupoId: p.grupoId,
    }).lean();
    const montoReal = inscripcion?.montoMensualidad || null;

    console.log(
      `  - ${p.pagoId} | $1 → $${montoReal || '??? (sin inscripción)'}`
    );

    if (APPLY && montoReal) {
      await Pago.updateOne(
        { _id: p._id },
        {
          $set: {
            montoPago: montoReal,
            descuentoAplicado: 0,
            notas: (p.notas || '') + ' [Corregido: monto $1 → real]',
          },
        }
      );
      countA++;
    }
  }
  if (APPLY) console.log(`\n✅ ${countA} montos corregidos`);

  // ══════════════════════════════════════════════════════════
  // FASE B: Recalcular estatus
  // ══════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('FASE B: Recalcular estatus');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagos = await Pago.find({
    pagoId: { $regex: /-\d{4}-\d{2}$/ },
    activo: true,
  }).lean();

  console.log(`Analizando ${pagos.length} pagos...\n`);

  const cambios = [];
  const bloqueados = [];

  for (const p of pagos) {
    const abonos = await Abono.find({ pagoId: p.pagoId }).lean();
    const tieneAbonos = abonos.length > 0;
    const totalAbonado = abonos.reduce(
      (s, a) => s + (a.montoAbono || 0),
      0
    );

    let nuevoEstatus;
    let razon;

    if (p.tipoPago === 'adelantado' && p.montoPago === 0) {
      nuevoEstatus = 'Pagado';
      razon = 'Cubierto por anticipo';
    } else if (!tieneAbonos) {
      nuevoEstatus = 'Pendiente';
      razon = 'Sin abonos (bug remanente)';
    } else if (totalAbonado >= p.montoPago) {
      nuevoEstatus = 'Pagado';
      razon = `Abonado $${totalAbonado} >= monto $${p.montoPago}`;
    } else if (totalAbonado > 0) {
      nuevoEstatus = 'Parcial';
      razon = `Abonado $${totalAbonado} < monto $${p.montoPago}`;
    } else {
      nuevoEstatus = 'Pagado';
      razon = 'Abono $0 (mes sin pago)';
    }

    if (p.estatus === nuevoEstatus) continue;

    const esHaciaAbajo = p.estatus === 'Pagado' && nuevoEstatus !== 'Pagado';

    if (esHaciaAbajo && !FORCE_ALL) {
      bloqueados.push({
        pagoId: p.pagoId,
        antes: p.estatus,
        intento: nuevoEstatus,
        razon,
      });
      continue;
    }

    cambios.push({
      pagoId: p.pagoId,
      antes: p.estatus,
      despues: nuevoEstatus,
      razon,
      esHaciaAbajo,
      _id: p._id,
    });
  }

  console.log(`Cambios a aplicar: ${cambios.length}\n`);
  cambios.forEach((c) =>
    console.log(
      `  - ${c.pagoId} | ${c.antes} → ${c.despues}${c.esHaciaAbajo ? ' ⚠️' : ''} | ${c.razon}`
    )
  );

  if (bloqueados.length > 0) {
    console.log(
      `\n⏸️  Transiciones bloqueadas (usa --force-all para aplicarlas): ${bloqueados.length}\n`
    );
    bloqueados.forEach((b) =>
      console.log(`  - ${b.pagoId} | ${b.antes} → (${b.intento}) | ${b.razon}`)
    );
  }

  if (APPLY && cambios.length > 0) {
    for (const c of cambios) {
      await Pago.updateOne({ _id: c._id }, { $set: { estatus: c.despues } });
    }
    console.log(`\n✅ ${cambios.length} estatus actualizados`);
  }

  console.log('\n✅ Normalización completada');
  if (!APPLY) {
    console.log(
      '\n👉 Para aplicar: node server/scripts/normalizarPagos.js --apply --force-all'
    );
  }
}

normalizar()
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