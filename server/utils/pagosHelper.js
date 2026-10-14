import Pago from '../models/Pago.js';
import Grupo from '../models/Grupo.js';
import { crearPagoId } from './pagos.js';

/**
 * Genera (o completa) los pagos mensuales de una inscripción.
 * - Usa `fechaInicioPago` como base (dato real de cobro).
 * - Fallback: si la inscripción vieja no tiene `fechaInicioPago`, usa `fechaInscripcion`.
 * - Genera desde esa fecha hasta esa fecha + `mesesFuturos` meses.
 * - NO sobreescribe pagos existentes (idempotente).
 */
export const generarPagosHistoricos = async (
  inscripcion,
  marcarComoPagado = true,
  mesesFuturos = 12
) => {
  try {
    const {
      idAlumno,
      grupoId,
      fechaInicioPago,
      fechaInscripcion,
      diaPago,
      nombreAlumno,
      montoMensualidad,
    } = inscripcion;

    if (!idAlumno || !grupoId) {
      console.warn('⚠️ [pagosHelper] Faltan idAlumno o grupoId');
      return [];
    }

    // Fallback para inscripciones legado sin fechaInicioPago
    const fechaBase = fechaInicioPago || fechaInscripcion;
    if (!fechaBase) {
      console.warn(
        '⚠️ [pagosHelper] Sin fechaInicioPago ni fechaInscripcion.'
      );
      return [];
    }

    const grupo = await Grupo.findOne({ IdGrupo: grupoId });
    if (!grupo) throw new Error(`Grupo ${grupoId} no encontrado`);

    let precioMensual = 0;
    if (montoMensualidad && montoMensualidad > 0) {
      precioMensual = montoMensualidad;
    } else if (grupo.precioMensualidad && grupo.precioMensualidad > 0) {
      precioMensual = grupo.precioMensualidad;
    } else {
      console.warn(`⚠️ [pagosHelper] Sin precio.`);
      return [];
    }

    const nombreCurso = grupo.nombreCurso || 'Curso sin nombre';
    const diaPagoAlumno = Math.min(Math.max(Number(diaPago) || 5, 1), 31);

    const base = new Date(fechaBase);
    if (isNaN(base.getTime())) {
      console.warn('⚠️ [pagosHelper] fechaBase inválida.');
      return [];
    }

    const ultimoDiaMesInicio = new Date(
      base.getFullYear(),
      base.getMonth() + 1,
      0
    ).getDate();
    const diaRealInicio = Math.min(diaPagoAlumno, ultimoDiaMesInicio);
    const fechaPrimerPago = new Date(
      base.getFullYear(),
      base.getMonth(),
      diaRealInicio,
      12,
      0,
      0,
      0
    );

    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);

    // Límite: base + mesesFuturos (no hoy)
    const limiteSuperior = new Date(
      base.getFullYear(),
      base.getMonth() + mesesFuturos,
      1
    );

    const pagosCreados = [];

    let cursor = new Date(
      fechaPrimerPago.getFullYear(),
      fechaPrimerPago.getMonth(),
      1
    );

    while (cursor <= limiteSuperior) {
      const ultimoDiaMes = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0
      ).getDate();
      const diaReal = Math.min(diaPagoAlumno, ultimoDiaMes);
      const fechaVencimiento = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        diaReal,
        12,
        0,
        0,
        0
      );

      const mesStr = `${fechaVencimiento.getFullYear()}-${String(
        fechaVencimiento.getMonth() + 1
      ).padStart(2, '0')}`;
      const pagoId = crearPagoId(idAlumno, grupoId, mesStr);

      const existente = await Pago.findOne({ pagoId });
      if (existente) {
        pagosCreados.push(existente);
      } else {
        const esMesPasado = fechaVencimiento < hoy;
        const estatus =
          esMesPasado && marcarComoPagado ? 'Pagado' : 'Pendiente';

        const pago = new Pago({
          pagoId,
          idAlumno: String(idAlumno).trim(),
          grupoId: String(grupoId).trim(),
          nombreAlumno: nombreAlumno || idAlumno,
          nombreCurso,
          diaPago: diaPagoAlumno,
          montoPago: precioMensual,
          fechaInicioPago: fechaVencimiento,
          activo: true,
          estatus,
          fechaPago: estatus === 'Pagado' ? fechaVencimiento : null,
          metodoPago: 'Efectivo',
          periodo: 'Mes',
          descuentoAplicado: 0,
          tipoPago: 'normal',
          notas: 'Generado automáticamente',
        });
        await pago.save();
        pagosCreados.push(pago);
      }

      cursor.setMonth(cursor.getMonth() + 1);
    }

    console.log(
      `📊 [pagosHelper] ${pagosCreados.length} pagos generados/verificados para ${idAlumno}-${grupoId}`
    );
    return pagosCreados;
  } catch (error) {
    console.error('❌ Error en generarPagosHistoricos:', error);
    throw error;
  }
};