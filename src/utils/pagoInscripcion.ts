/** Vincula inscripciones con registros de pago (pagoId = ALUMNO-GRUPO). */

export function crearPagoId(idAlumno: string, grupoId: string) {
  return `${String(idAlumno).trim()}-${String(grupoId).trim()}`.toUpperCase();
}

function normalizarClave(valor: string) {
  return String(valor || "").trim().toUpperCase();
}

export type PagoVinculado = {
  id?: string;
  idAlumno?: string;
  grupoId?: string;
  montoTotal?: number;
  montoPagado?: number;
  saldo?: number;
  status?: string;
  fechaPago?: string;
  diaPagoFijo?: number;
  activo?: boolean;
  periodosMensuales?: Array<{
    nombreMes?: string;
    saldo?: number;
    monto?: number;
    status?: string;
    vencimiento?: string;
  }>;
  cobroProgramado?: boolean;
  historialAbonos?: unknown[];
};

export function buildPagosMap(pagos: PagoVinculado[]) {
  const map = new Map<string, PagoVinculado>();

  for (const pago of pagos) {
    if (pago?.id) {
      map.set(normalizarClave(pago.id), pago);
    }
    if (pago?.idAlumno && pago?.grupoId) {
      map.set(
        normalizarClave(crearPagoId(pago.idAlumno, pago.grupoId)),
        pago
      );
    }
  }

  return map;
}

/** Si no hay pago en BD, arma vista mínima desde la inscripción. */
export function pagoDesdeInscripcion(
  inscripcion: {
    idAlumno: string;
    grupoId: string;
    montoMensualidad?: number;
    diaPago?: number;
    fechaInicioPago?: string;
    estatus?: string;
  },
  nombreCurso?: string
): PagoVinculado | undefined {
  const monto = Number(inscripcion.montoMensualidad || 0);
  if (monto <= 0) return undefined;
  if (String(inscripcion.estatus || "").toLowerCase() === "baja") {
    return undefined;
  }

  const id = crearPagoId(inscripcion.idAlumno, inscripcion.grupoId);

  return {
    id,
    idAlumno: inscripcion.idAlumno,
    grupoId: inscripcion.grupoId,
    montoTotal: monto,
    montoPagado: 0,
    saldo: monto,
    status: "Pendiente",
    fechaPago: inscripcion.fechaInicioPago,
    diaPagoFijo: inscripcion.diaPago,
    activo: true,
    historialAbonos: [],
    periodosMensuales: [],
  };
}

export function resolverPagoParaInscripcion(
  pagosMap: Map<string, PagoVinculado>,
  inscripcion: {
    idAlumno: string;
    grupoId: string;
    montoMensualidad?: number;
    diaPago?: number;
    fechaInicioPago?: string;
    estatus?: string;
  },
  nombreCurso?: string
): PagoVinculado | undefined {
  const pagoId = crearPagoId(inscripcion.idAlumno, inscripcion.grupoId);
  const desdeMapa = pagosMap.get(normalizarClave(pagoId));
  if (desdeMapa) return desdeMapa;

  return pagoDesdeInscripcion(inscripcion, nombreCurso);
}

/** Saldo a mostrar en UI (incluye cobro programado / primer mes). */
export function saldoVisiblePago(
  pago?: PagoVinculado,
  montoMensualidadFallback = 0
) {
  if (!pago) {
    return Number(montoMensualidadFallback) || 0;
  }

  if (pago.status === "Programado" || pago.cobroProgramado) {
    const primerPeriodo = pago.periodosMensuales?.[0];
    return Number(
      primerPeriodo?.saldo ?? primerPeriodo?.monto ?? pago.montoTotal ?? 0
    );
  }

  const saldo = Number(pago.saldo ?? 0);
  if (saldo > 0) return saldo;

  if (pago.status === "Pendiente" || pago.status === "Parcial") {
    return Number(pago.montoTotal ?? montoMensualidadFallback ?? 0);
  }

  return saldo;
}
