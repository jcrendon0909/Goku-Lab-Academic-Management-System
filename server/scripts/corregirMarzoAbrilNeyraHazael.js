import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import { generarId } from '../utils/generarId.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración del caso
// ═══════════════════════════════════════════════════════════
const MONTO = 1350;
const FECHA_MARZO = '2026-04-01'; // cuándo pagaron realmente marzo
const FECHA_ABRIL = '2026-04-22'; // cuándo pagaron abril
const METODO_MARZO = 'Tarjeta';
const METODO_ABRIL = 'Tarjeta';

const CASOS = [
  {
    idAlumno: 'ALU176',
    grupoId: 'GRU030',
    nombreAlumno: 'Neyra Sánchez',
    abonoMarzoId: 'ABO166', // el abono $0 actual de marzo
  },
  {
    idAlumno: 'ALU177',
    grupoId: 'GRU030',
    nombreAlumno: 'Hazael Bernal',
    abonoMarzoId: 'ABO157', // el abono $0 actual de marzo
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

async function corregir() {
  await conectar();
  console.log(`🔧 Modo: ${APPLY ? '✍️ APPLY' : '🔍 DRY RUN'}\n`);

  const fechaMarzo = parseFechaLocal(FECHA_MARZO);
  const fechaAbril = parseFechaLocal(FECHA_ABRIL);

  for (const caso of CASOS) {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`${caso.nombreAlumno} (${caso.idAlumno}/${caso.grupoId})`);
    console.log('═══════════════════════════════════════════════════════\n');

    const pagoIdMarzo = `${caso.idAlumno}-${caso.grupoId}-2026-03`;
    const pagoIdAbril = `${caso.idAlumno}-${caso.grupoId}-2026-04`;

    const abonoMarzo = await Abono.findOne({ abonoId: caso.abonoMarzoId });
    const pagoMarzo = await Pago.findOne({ pagoId: pagoIdMarzo });
    const pagoAbril = await Pago.findOne({ pagoId: pagoIdAbril });

    if (!abonoMarzo) {
      console.log(`❌ Abono ${caso.abonoMarzoId} no encontrado. Saltando.\n`);
      continue;
    }
    if (!pagoMarzo || !pagoAbril) {
      console.log(
        `❌ Pago no encontrado. Marzo: ${!!pagoMarzo} | Abril: ${!!pagoAbril}. Saltando.\n`
      );
      continue;
    }

    // Verificar si ya existe abono de abril
    const abonoAbrilExistente = await Abono.findOne({
      pagoId: pagoIdAbril,
      montoAbono: { $gt: 0 },
    });

    console.log('ANTES:');
    console.log(
      `  Abono marzo (${abonoMarzo.abonoId}): $${abonoMarzo.montoAbono} (${new Date(abonoMarzo.fechaAbono).toISOString().slice(0, 10)})`
    );
    console.log(`  Pago marzo: estatus=${pagoMarzo.estatus}, montoPago=$${pagoMarzo.montoPago}`);
    console.log(`  Pago abril: estatus=${pagoAbril.estatus}, montoPago=$${pagoAbril.montoPago}`);
    console.log(
      `  Abono abril existente: ${abonoAbrilExistente ? `$${abonoAbrilExistente.montoAbono}` : 'NO existe'}`
    );

    console.log('\nDESPUÉS:');
    console.log(
      `  Abono marzo (${abonoMarzo.abonoId}): $${MONTO}, fecha ${FECHA_MARZO}`
    );
    console.log(`  Pago marzo: Pagado, montoPago=$${MONTO}, fechaPago=${FECHA_MARZO}`);
    console.log(
      `  Abono abril: NUEVO $${MONTO}, fecha ${FECHA_ABRIL}`
    );
    console.log(`  Pago abril: Pagado, fechaPago=${FECHA_ABRIL}\n`);

    if (!APPLY) continue;

    // ─────────────────────────────────────────────────────
    // 1. Corregir abono de marzo ($0 → $1350, fecha 1/abr)
    // ─────────────────────────────────────────────────────
    abonoMarzo.montoAbono = MONTO;
    abonoMarzo.fechaAbono = fechaMarzo;
    abonoMarzo.metodoAbono = METODO_MARZO;
    abonoMarzo.notas =
      (abonoMarzo.notas || '') +
      ` [Corregido: pagado el ${FECHA_MARZO}, correspondiente a marzo]`;
    await abonoMarzo.save();
    console.log(`✅ Abono marzo actualizado`);

    // ─────────────────────────────────────────────────────
    // 2. Marcar Pago de marzo como Pagado
    // ─────────────────────────────────────────────────────
    pagoMarzo.montoPago = MONTO;
    pagoMarzo.estatus = 'Pagado';
    pagoMarzo.fechaPago = fechaMarzo;
    pagoMarzo.metodoPago = METODO_MARZO;
    pagoMarzo.notas =
      (pagoMarzo.notas || '') +
      ` [Pagado el ${FECHA_MARZO} (pago tardío)]`;
    await pagoMarzo.save();
    console.log(`✅ Pago marzo marcado como Pagado`);

    // ─────────────────────────────────────────────────────
    // 3. Crear abono de abril (si no existe)
    // ─────────────────────────────────────────────────────
    if (!abonoAbrilExistente) {
      const nuevoAbono = new Abono({
        abonoId: await generarId('abono'),
        pagoId: pagoIdAbril,
        idAlumno: caso.idAlumno,
        grupoId: caso.grupoId,
        nombreAlumno: caso.nombreAlumno,
        montoAbono: MONTO,
        metodoAbono: METODO_ABRIL,
        fechaAbono: fechaAbril,
        numeroDeabono: '1',
        notas: 'Pago de abril registrado desde corrección histórica',
      });
      await nuevoAbono.save();
      console.log(`✅ Abono abril creado: ${nuevoAbono.abonoId}`);
    } else {
      console.log(`ℹ️  Abono abril ya existía, no se recrea`);
    }

    // ─────────────────────────────────────────────────────
    // 4. Marcar Pago de abril como Pagado
    // ─────────────────────────────────────────────────────
    pagoAbril.estatus = 'Pagado';
    pagoAbril.fechaPago = fechaAbril;
    pagoAbril.metodoPago = METODO_ABRIL;
    pagoAbril.notas =
      (pagoAbril.notas || '') +
      ` [Pagado el ${FECHA_ABRIL}]`;
    await pagoAbril.save();
    console.log(`✅ Pago abril marcado como Pagado\n`);
  }

  console.log('✅ Proceso completado');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirMarzoAbrilNeyraHazael.js --apply');
  }
}

corregir()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });