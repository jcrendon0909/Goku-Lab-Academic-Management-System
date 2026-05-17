import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";

export function parseFechaLocal(valor) {
  if (!valor) return null;

  const texto = String(valor).trim();
  const matchFecha = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const fecha = matchFecha
    ? new Date(
        Number(matchFecha[1]),
        Number(matchFecha[2]) - 1,
        Number(matchFecha[3])
      )
    : new Date(valor);

  if (Number.isNaN(fecha.getTime())) return null;
  return fecha;
}

export function hayDatosPago(datosPago = {}) {
  return [
    datosPago.montoMensualidad,
    datosPago.montoPago,
    datosPago.fechaPago,
    datosPago.diaPagoFijo,
    datosPago.comentarios,
    datosPago.comentariosPago,
  ].some((valor) => valor !== undefined && valor !== null && String(valor).trim() !== "");
}

export function normalizarDatosPago(datosPago = {}) {
  if (!hayDatosPago(datosPago)) return null;

  const montoRaw =
    datosPago.montoMensualidad !== undefined &&
    datosPago.montoMensualidad !== null &&
    String(datosPago.montoMensualidad).trim() !== ""
      ? datosPago.montoMensualidad
      : datosPago.montoPago;

  const monto = Number(montoRaw);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("Captura un monto de mensualidad valido");
  }

  let fechaPago = parseFechaLocal(datosPago.fechaPago);

  if (!fechaPago && datosPago.diaPagoFijo) {
    const dia = Number(datosPago.diaPagoFijo);
    if (Number.isInteger(dia) && dia >= 1 && dia <= 31) {
      const hoy = new Date();
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
      fechaPago = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(dia, ultimoDia));
    }
  }

  if (!fechaPago) {
    throw new Error("Captura una fecha de pago valida");
  }

  const diaPagoFijo = fechaPago.getDate();

  return {
    montoMensualidad: monto,
    fechaPago,
    diaPagoFijo,
    comentarios: String(datosPago.comentarios ?? datosPago.comentariosPago ?? "").trim(),
  };
}

export function crearPagoId(idAlumno, grupoId) {
  return `${String(idAlumno).trim()}-${String(grupoId).trim()}`.toUpperCase();
}

function obtenerUltimoDiaDelMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate();
}

function obtenerNombreMes(fecha) {
  return fecha.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

export function obtenerPeriodoPagoExigible(diaPagoFijo, hoy = new Date()) {
  const diaPago = Number(diaPagoFijo) || 1;
  const diaPagoSeguro = Math.min(Math.max(diaPago, 1), 31);
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();
  const ultimoDiaMesActual = obtenerUltimoDiaDelMes(anioActual, mesActual);
  const diaVencimientoActual = Math.min(diaPagoSeguro, ultimoDiaMesActual);

  const mesExigible =
    hoy.getDate() >= diaVencimientoActual ? mesActual : mesActual - 1;
  const inicio = new Date(anioActual, mesExigible, 1, 0, 0, 0, 0);
  const fin = new Date(hoy);
  fin.setHours(23, 59, 59, 999);
  const vencimiento = new Date(
    inicio.getFullYear(),
    inicio.getMonth(),
    Math.min(
      diaPagoSeguro,
      obtenerUltimoDiaDelMes(inicio.getFullYear(), inicio.getMonth())
    ),
    23,
    59,
    59,
    999
  );

  return {
    inicio,
    fin,
    vencimiento,
    nombreMes: obtenerNombreMes(inicio),
  };
}

export async function validarPagoAlCorrienteParaBaja({
  idAlumno,
  grupoId,
  fechaInicioCobro,
  hoy = new Date(),
}) {
  const pagoIdEsperado = crearPagoId(idAlumno, grupoId);
  const pago = await Pago.findOne({
    $or: [
      { pagoId: pagoIdEsperado },
      {
        idAlumno: String(idAlumno).trim(),
        grupoId: String(grupoId).trim(),
      },
    ],
  }).lean();

  if (!pago) {
    return {
      ok: true,
      pago: null,
      pagoId: pagoIdEsperado,
      motivo: "Sin registro activo de pagos",
    };
  }

  const periodo = obtenerPeriodoPagoExigible(pago.diaPagoFijo, hoy);
  const inicioCobro = parseFechaLocal(fechaInicioCobro || pago.fechaPago);

  if (inicioCobro && periodo.vencimiento < inicioCobro) {
    return {
      ok: true,
      pago,
      pagoId: pago.pagoId,
      periodo,
      motivo: "No hay meses vencidos desde el alta del alumno",
      inicioCobro,
      montoRequerido: Number(pago.montoPago || 0),
      totalPagadoPeriodo: 0,
      saldoPeriodo: 0,
    };
  }

  const abonos = await Abono.find({ pagoId: pago.pagoId }).lean();
  const totalPagadoPeriodo = abonos.reduce((total, abono) => {
    const fechaAbono = parseFechaLocal(abono.fechaAbono);
    if (!fechaAbono) return total;

    if (fechaAbono >= periodo.inicio && fechaAbono <= periodo.fin) {
      return total + Number(abono.montoAbono || 0);
    }

    return total;
  }, 0);

  const montoRequerido = Number(pago.montoPago || 0);
  const ok = montoRequerido <= 0 || totalPagadoPeriodo >= montoRequerido;

  return {
    ok,
    pago,
    pagoId: pago.pagoId,
    periodo,
    montoRequerido,
    totalPagadoPeriodo,
    saldoPeriodo: Math.max(montoRequerido - totalPagadoPeriodo, 0),
  };
}

export async function crearOActualizarPagoDeInscripcion({
  idAlumno,
  nombreAlumno,
  grupoId,
  nombreCurso,
  datosPago,
}) {
  if (!datosPago) return null;

  const pagoId = crearPagoId(idAlumno, grupoId);

  return Pago.findOneAndUpdate(
    { pagoId },
    {
      $set: {
        pagoId,
        idAlumno: String(idAlumno).trim(),
        grupoId: String(grupoId).trim(),
        nombreAlumno: String(nombreAlumno || "").trim(),
        nombreCurso: String(nombreCurso || "Curso sin nombre").trim(),
        diaPagoFijo: datosPago.diaPagoFijo,
        montoPago: datosPago.montoMensualidad,
        fechaPago: datosPago.fechaPago,
        activo: true,
        fechaBaja: null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}
