import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Pago from '../models/Pago.js';
import Abono from '../models/Abono.js';
import { generarId } from '../utils/generarId.js';

const APPLY = process.argv.includes('--apply');

// ═══════════════════════════════════════════════════════════
// Configuración del caso Cesar (ALU034 / GRU033)
// ═══════════════════════════════════════════════════════════
const ID_ALUMNO = 'ALU034';
const GRUPO_ID = 'GRU033';
const NOMBRE_ALUMNO = 'Cesar González Carrillo';

// Fechas reales
const FECHA_JULIO = '2026-07-08';       // anticipo parcial $1000
const FECHA_SEP_P1 = '2026-09-02';      // primer pago de septiembre ($1000)
const FECHA_SEP_P2 = '2026-09-23';      // segundo pago de septiembre ($1500)

// Abonos existentes
const ABO311_ID = 'ABO311';             // $1000 julio (corregir fecha)
const ABO316_ID = 'ABO316';             // $2500 duplicado/incorrecto — eliminar
const DUPLICADOS_CERO = ['ABO312', 'ABO313', 'ABO314', 'ABO315'];

// Pagos
const PAGO_JULIO_ID = `${ID_ALUMNO}-${GRUPO_ID}-2026-07`;
const PAGO_AGOSTO_ID = `${ID_ALUMNO}-${GRUPO_ID}-2026-08`;
const PAGO_SEP_ID = `${ID_ALUMNO}-${GRUPO_ID}-2026-09`;

// Montos
const MONTO_MENSUAL = 1500;
const MONTO_AGOSTO_DESCUENTO = 500;     // pago acordado con descuento
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

  // ═════════════════════════════════════════════════════════
  // PASO 1: Corregir ABO311 (julio): fecha 8/oct → 8/jul
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('1. Corregir ABO311 (fecha julio)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abo311 = await Abono.findOne({ abonoId: ABO311_ID });
  if (!abo311) {
    console.log(`❌ ${ABO311_ID} no encontrado\n`);
  } else {
    const fechaActual = new Date(abo311.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ANTES:   $${abo311.montoAbono} | fecha=${fechaActual}`);
    console.log(`  DESPUÉS: $${abo311.montoAbono} | fecha=${FECHA_JULIO}\n`);

    if (APPLY) {
      abo311.fechaAbono = parseFechaLocal(FECHA_JULIO);
      abo311.notas =
        (abo311.notas || '') + ` [Corregido: fecha ${fechaActual} → ${FECHA_JULIO}]`;
      await abo311.save();
      console.log('  ✅ ABO311 actualizado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 2: Eliminar duplicados $0 (ABO312, ABO313, ABO314, ABO315)
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('2. Eliminar abonos $0 duplicados');
  console.log('═══════════════════════════════════════════════════════\n');

  for (const abonoId of DUPLICADOS_CERO) {
    const dup = await Abono.findOne({ abonoId });
    if (!dup) {
      console.log(`  ℹ️  ${abonoId} ya no existe`);
      continue;
    }
    console.log(`  🗑️  ${dup.abonoId} | $${dup.montoAbono} | ${dup.pagoId}`);

    if (APPLY) {
      await Abono.deleteOne({ _id: dup._id });
    }
  }
  if (APPLY) console.log('  ✅ Duplicados eliminados\n');
  else console.log('');

  // ═════════════════════════════════════════════════════════
  // PASO 3: Eliminar ABO316 ($2500 con fecha futura)
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('3. Eliminar ABO316 ($2500 con fecha 23/oct)');
  console.log('═══════════════════════════════════════════════════════\n');

  const abo316 = await Abono.findOne({ abonoId: ABO316_ID });
  if (!abo316) {
    console.log(`  ℹ️  ${ABO316_ID} ya no existe\n`);
  } else {
    const fechaActual = new Date(abo316.fechaAbono).toISOString().slice(0, 10);
    console.log(`  ${abo316.abonoId} | $${abo316.montoAbono} | fecha=${fechaActual}\n`);

    if (APPLY) {
      await Abono.deleteOne({ _id: abo316._id });
      console.log('  ✅ ABO316 eliminado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 4: Crear 3 abonos nuevos (los 2 pagos reales de sep)
  //  - $500 el 2/sep → julio (completar)
  //  - $500 el 2/sep → agosto (pago con descuento)
  //  - $1500 el 23/sep → septiembre
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('4. Crear abonos nuevos');
  console.log('═══════════════════════════════════════════════════════\n');

  const NUEVOS_ABONOS = [
    {
      pagoId: PAGO_JULIO_ID,
      monto: 500,
      fecha: FECHA_SEP_P1,
      nota: 'Parte del pago del 2/sep para completar julio',
    },
    {
      pagoId: PAGO_AGOSTO_ID,
      monto: 500,
      fecha: FECHA_SEP_P1,
      nota: 'Pago agosto con descuento acordado (2/sep)',
    },
    {
      pagoId: PAGO_SEP_ID,
      monto: 1500,
      fecha: FECHA_SEP_P2,
      nota: 'Pago septiembre (23/sep)',
    },
  ];

  for (const nuevo of NUEVOS_ABONOS) {
    console.log(`  + ${nuevo.pagoId} | $${nuevo.monto} | fecha=${nuevo.fecha}`);

    if (APPLY) {
      const abono = new Abono({
        abonoId: await generarId('abono'),
        pagoId: nuevo.pagoId,
        idAlumno: ID_ALUMNO,
        grupoId: GRUPO_ID,
        nombreAlumno: NOMBRE_ALUMNO,
        montoAbono: nuevo.monto,
        metodoAbono: 'Efectivo',
        fechaAbono: parseFechaLocal(nuevo.fecha),
        numeroDeabono: '1',
        notas: nuevo.nota,
      });
      await abono.save();
      console.log(`     ✅ creado: ${abono.abonoId}`);
    }
  }
  console.log('');

  // ═════════════════════════════════════════════════════════
  // PASO 5: Actualizar Pago julio
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('5. Actualizar Pago julio');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoJulio = await Pago.findOne({ pagoId: PAGO_JULIO_ID });
  if (!pagoJulio) {
    console.log(`❌ ${PAGO_JULIO_ID} no encontrado\n`);
  } else {
    console.log(`  ANTES:   montoPago=$${pagoJulio.montoPago} | fechaPago=${pagoJulio.fechaPago ? new Date(pagoJulio.fechaPago).toISOString().slice(0, 10) : '-'} | estatus=${pagoJulio.estatus}`);
    console.log(`  DESPUÉS: montoPago=$${MONTO_MENSUAL} | fechaPago=${FECHA_JULIO} | estatus=Pagado\n`);

    if (APPLY) {
      pagoJulio.montoPago = MONTO_MENSUAL;
      pagoJulio.fechaPago = parseFechaLocal(FECHA_JULIO);
      pagoJulio.estatus = 'Pagado';
      pagoJulio.tipoPago = 'normal';
      pagoJulio.notas = 'Pago julio: $1000 anticipo (8/jul) + $500 (2/sep)';
      await pagoJulio.save();
      console.log('  ✅ Pago julio actualizado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 6: Actualizar Pago agosto (monto $500 con descuento)
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('6. Actualizar Pago agosto ($500 con descuento)');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoAgosto = await Pago.findOne({ pagoId: PAGO_AGOSTO_ID });
  if (!pagoAgosto) {
    console.log(`❌ ${PAGO_AGOSTO_ID} no encontrado\n`);
  } else {
    console.log(`  ANTES:   montoPago=$${pagoAgosto.montoPago} | estatus=${pagoAgosto.estatus}`);
    console.log(`  DESPUÉS: montoPago=$${MONTO_AGOSTO_DESCUENTO} | estatus=Pagado | fechaPago=${FECHA_SEP_P1}\n`);

    if (APPLY) {
      pagoAgosto.montoPago = MONTO_AGOSTO_DESCUENTO;
      pagoAgosto.fechaPago = parseFechaLocal(FECHA_SEP_P1);
      pagoAgosto.estatus = 'Pagado';
      pagoAgosto.tipoPago = 'normal';
      pagoAgosto.notas = 'Pago agosto con descuento acordado (no cursó el mes completo)';
      await pagoAgosto.save();
      console.log('  ✅ Pago agosto actualizado\n');
    }
  }

  // ═════════════════════════════════════════════════════════
  // PASO 7: Actualizar Pago septiembre
  // ═════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('7. Actualizar Pago septiembre');
  console.log('═══════════════════════════════════════════════════════\n');

  const pagoSep = await Pago.findOne({ pagoId: PAGO_SEP_ID });
  if (!pagoSep) {
    console.log(`❌ ${PAGO_SEP_ID} no encontrado\n`);
  } else {
    const fechaActual = pagoSep.fechaPago ? new Date(pagoSep.fechaPago).toISOString().slice(0, 10) : '-';
    console.log(`  ANTES:   fechaPago=${fechaActual} | estatus=${pagoSep.estatus}`);
    console.log(`  DESPUÉS: fechaPago=${FECHA_SEP_P2} | estatus=Pagado\n`);

    if (APPLY) {
      pagoSep.fechaPago = parseFechaLocal(FECHA_SEP_P2);
      pagoSep.estatus = 'Pagado';
      await pagoSep.save();
      console.log('  ✅ Pago septiembre actualizado\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Proceso completado');
  console.log('═══════════════════════════════════════════════════════');
  if (!APPLY) {
    console.log('\n👉 Aplicar: node server/scripts/corregirCesar.js --apply');
  }
}

corregir()
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