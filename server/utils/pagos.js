import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";

export function parseFechaLocal(valor) {
  if (!valor) return null;

  const texto = String(valor).trim();
  const matchMes = texto.match(/^(\d{4})-(\d{2})$/);
  if (matchMes) {
    return new Date(Number(matchMes[1]), Number(matchMes[2]) - 1, 1, 0, 0, 0, 0);
  }

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

export function validarMesPrimerCobro(fechaInscripcion, fechaInicioPago) {
  const mesClase = indiceMes(fechaInscripcion);
  const mesPago = indiceMes(fechaInicioPago);
  if (mesClase === null || mesPago === null) return null;
  if (mesPago < mesClase) {
    return "El primer mes de cobro no puede ser anterior al mes en que inicia clases";
  }
  return null;
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

export function resolverDiaPago(datosPago = {}) {
  const diaDirecto = Number(datosPago.diaPago ?? datosPago.diaPagoFijo);
  if (Number.isInteger(diaDirecto) && diaDirecto >= 1 && diaDirecto <= 31) {
    return diaDirecto;
  }

  const fechaReferencia = parseFechaLocal(
    datosPago.fechaInicioPago || datosPago.fechaPago
  );
  if (fechaReferencia && !Number.isNaN(fechaReferencia.getTime())) {
    return fechaReferencia.getDate();
  }

  return null;
}

export function normalizarDatosPago(datosPago = {}) {
  const monto = Number(datosPago.montoMensualidad);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("Captura un monto de mensualidad válido (mayor a 0)");
  }

  const dia = resolverDiaPago(datosPago);
  if (!dia) {
    throw new Error("Día de pago debe ser entre 1 y 31");
  }

  let fechaInicioPago = parseFechaLocal(
    datosPago.fechaInicioPago || datosPago.fechaPago
  );
  if (!fechaInicioPago || isNaN(fechaInicioPago.getTime())) {
    throw new Error(
      "Captura un primer mes de cobro válido (formato YYYY-MM o YYYY-MM-DD)"
    );
  }

  fechaInicioPago = new Date(
    fechaInicioPago.getFullYear(),
    fechaInicioPago.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  return {
    montoMensualidad: monto,
    diaPago: dia,
    fechaInicioPago,
    comentarios: String(datosPago.comentarios ?? "").trim(),
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

export function indiceMes(fecha) {
  if (!fecha) return null;
  const d = fecha instanceof Date ? fecha : parseFechaLocal(fecha) ?? new Date(fecha);
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.getFullYear() * 12 + d.getMonth();
}

/** true si aún no corresponde cobrar según fechaInicioPago (mes de inicio) */
export function cobroAunNoInicia(fechaInicioCobro, hoy = new Date()) {
  const inicio = parseFechaLocal(fechaInicioCobro);
  if (!inicio) return false;
  return indiceMes(hoy) < indiceMes(inicio);
}

export function construirPeriodosMensuales({
  fechaInicioCobro,
  diaPagoFijo,
  montoMensualidad,
  abonos = [],
  hoy = new Date(),
  mesesFuturosVisibles = 0,
}) {
  const inicio = parseFechaLocal(fechaInicioCobro);
  const monto = Number(montoMensualidad) || 0;
  if (!inicio || monto <= 0) return [];

  const diaPago = Math.min(Math.max(Number(diaPagoFijo) || 1, 1), 31);
  const mesInicio = indiceMes(inicio);
  const mesHoy = indiceMes(hoy);
  const mesFin = mesHoy + Math.max(Number(mesesFuturosVisibles) || 0, 0);
  const limiteSuperior = Math.max(mesFin, mesInicio);

  const periodos = [];

  // Sumamos todo lo que ha pagado históricamente
  let bolsaDeDinero = abonos.reduce(
    (total, abono) => total + Number(abono.montoAbono || 0),
    0
  );

  for (let indice = mesInicio; indice <= limiteSuperior; indice += 1) {
    const anio = Math.floor(indice / 12);
    const mes = indice % 12;
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    const diaVenc = Math.min(diaPago, ultimoDia);
    const inicioMes = new Date(anio, mes, 1, 0, 0, 0, 0);
    const finMes = new Date(anio, mes + 1, 0, 23, 59, 59, 999);
    const vencimiento = new Date(anio, mes, diaVenc, 23, 59, 59, 999);

    // REPARTIMOS EL DINERO CRONOLÓGICAMENTE 
    let pagadoMes = 0;
    if (bolsaDeDinero >= monto) {
      pagadoMes = monto;
      bolsaDeDinero -= monto; // Descontamos lo que costó este mes
    } else if (bolsaDeDinero > 0) {
      pagadoMes = bolsaDeDinero;
      bolsaDeDinero = 0; // Se acabó la bolsa en un pago parcial
    }

    const saldoMes = Math.max(monto - pagadoMes, 0);
    let status = "Pendiente";

    // ASIGNAMOS EL ESTATUS 
    if (indice < mesInicio) {
      status = "Programado";
    } else if (saldoMes < 0.01) {
      status = "Pagado"; 
    } else if (indice > mesHoy) {
      status = "Programado"; 
    } else if (pagadoMes > 0) {
      status = "Parcial";
    } else if (hoy > vencimiento) {
      status = "Pendiente";
    } else if (indice === mesHoy && hoy <= vencimiento) {
      status = "Pendiente";
    }

    periodos.push({
      clave: `${anio}-${String(mes + 1).padStart(2, "0")}`,
      nombreMes: inicioMes.toLocaleDateString("es-MX", {
        month: "long",
        year: "numeric",
      }),
      vencimiento: vencimiento.toISOString(),
      monto,
      pagado: pagadoMes,
      saldo: status === "Programado" ? monto : saldoMes,
      status,
    });
  }

  return periodos;
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
  montoMensualidadInscripcion = 0,
  hoy = new Date(),
}) {
  const pagoIdEsperado = crearPagoId(idAlumno, grupoId);
  const inicioCobroTemprano = parseFechaLocal(fechaInicioCobro);

  if (inicioCobroTemprano && cobroAunNoInicia(inicioCobroTemprano, hoy)) {
    const pagoTemprano = await Pago.findOne({
      $or: [
        { pagoId: pagoIdEsperado },
        {
          idAlumno: String(idAlumno).trim(),
          grupoId: String(grupoId).trim(),
        },
      ],
    }).lean();

    return {
      ok: true,
      pago: pagoTemprano,
      pagoId: pagoTemprano?.pagoId || pagoIdEsperado,
      periodo: null,
      montoRequerido: Number(
        pagoTemprano?.montoPago ?? montoMensualidadInscripcion ?? 0
      ),
      totalPagado: 0,
      totalPagadoPeriodo: 0,
      saldoPendiente: 0,
      saldoPeriodo: 0,
      cobroAunNoInicia: true,
      motivo: "Aún no inicia el periodo de cobro",
    };
  }

  const pago = await Pago.findOne({
    $or: [
      { pagoId: pagoIdEsperado },
      {
        idAlumno: String(idAlumno).trim(),
        grupoId: String(grupoId).trim(),
      },
    ],
    activo: { $ne: false },
  }).lean();

  const montoReferencia = Number(
    pago?.montoPago ?? montoMensualidadInscripcion ?? 0
  );

  if (!pago) {
    const abonosSinPago = await Abono.find({ pagoId: pagoIdEsperado }).lean();
    const totalAbonadoSinPago = abonosSinPago.reduce(
      (total, abono) => total + Number(abono.montoAbono || 0),
      0
    );

    if (totalAbonadoSinPago < 0.01) {
      return {
        ok: true,
        pago: null,
        pagoId: pagoIdEsperado,
        periodo: null,
        montoRequerido: montoReferencia,
        totalPagado: 0,
        totalPagadoPeriodo: 0,
        saldoPendiente: 0,
        saldoPeriodo: 0,
        sinAbonos: true,
        motivo: "Sin abonos ni pago activo registrado",
      };
    }

    if (montoReferencia > 0) {
      return {
        ok: false,
        pago: null,
        pagoId: pagoIdEsperado,
        periodo: null,
        montoRequerido: montoReferencia,
        totalPagado: totalAbonadoSinPago,
        totalPagadoPeriodo: 0,
        saldoPendiente: Math.max(montoReferencia - totalAbonadoSinPago, 0),
        motivo: "El alumno no tiene un registro de pago activo",
      };
    }

    return {
      ok: true,
      pago: null,
      pagoId: pagoIdEsperado,
      motivo: "Sin registro activo de pagos",
    };
  }

  const montoRequerido = Number(pago.montoPago || 0);
  const abonos = await Abono.find({ pagoId: pago.pagoId }).lean();
  const totalPagado = abonos.reduce(
    (total, abono) => total + Number(abono.montoAbono || 0),
    0
  );

  if (totalPagado < 0.01) {
    return {
      ok: true,
      pago,
      pagoId: pago.pagoId,
      periodo: null,
      montoRequerido,
      totalPagado: 0,
      totalPagadoPeriodo: 0,
      saldoPendiente: 0,
      saldoPeriodo: 0,
      sinAbonos: true,
      motivo: "Sin abonos registrados en esta inscripción",
    };
  }

  const diaPagoAlumno = pago.diaPago ?? pago.diaPagoFijo;
  const inicioCobro = parseFechaLocal(
    fechaInicioCobro || pago.fechaInicioPago || pago.fechaPago
  );

  if (cobroAunNoInicia(inicioCobro, hoy)) {
    return {
      ok: true,
      pago,
      pagoId: pago.pagoId,
      periodo: null,
      montoRequerido,
      totalPagado,
      totalPagadoPeriodo: 0,
      saldoPendiente: 0,
      saldoPeriodo: 0,
      cobroAunNoInicia: true,
      motivo: "Aún no inicia el periodo de cobro",
    };
  }

  const periodo = obtenerPeriodoPagoExigible(diaPagoAlumno, hoy);

  let totalPagadoPeriodo = 0;
  let periodoExigible = true;

  if (inicioCobro && indiceMes(periodo.vencimiento) < indiceMes(inicioCobro)) {
    periodoExigible = false;
  } else {
    totalPagadoPeriodo = abonos.reduce((total, abono) => {
      const fechaAbono = parseFechaLocal(abono.fechaAbono);
      if (!fechaAbono) return total;

      if (fechaAbono >= periodo.inicio && fechaAbono <= periodo.fin) {
        return total + Number(abono.montoAbono || 0);
      }

      return total;
    }, 0);
  }

  const saldoPeriodo = periodoExigible
    ? Math.max(montoRequerido - totalPagadoPeriodo, 0)
    : 0;
  const saldoPendienteBloqueo = saldoPeriodo;

  const periodoPagado =
    !periodoExigible ||
    montoRequerido <= 0 ||
    totalPagadoPeriodo >= montoRequerido;
  const sinSaldoPendiente = saldoPendienteBloqueo < 0.01;
  const ok = sinSaldoPendiente && periodoPagado;

  let motivo = null;
  if (!ok) {
    if (!sinSaldoPendiente) {
      motivo = "Tiene saldo pendiente en el periodo vigente";
    } else if (periodoExigible) {
      motivo = `Falta cubrir el pago de ${periodo.nombreMes}`;
    }
  }

  return {
    ok,
    pago,
    pagoId: pago.pagoId,
    periodo,
    montoRequerido,
    totalPagado,
    totalPagadoPeriodo,
    saldoPendiente: saldoPendienteBloqueo,
    saldoPeriodo,
    cobroAunNoInicia: false,
    motivo,
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
        diaPago: datosPago.diaPago,
        montoPago: datosPago.montoMensualidad,
        fechaInicioPago: datosPago.fechaInicioPago,
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
