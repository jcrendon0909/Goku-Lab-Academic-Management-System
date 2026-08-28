export function construirPeriodosMensuales({
  fechaInicioCobro,
  diaPagoFijo,
  montoMensualidad,
  abonos = [],
  hoy = new Date(),
  mesesFuturosVisibles = 0,
  fechaFin = null, // ✅ NUEVO
}) {
  const inicio = parseFechaLocal(fechaInicioCobro);
  const monto = Number(montoMensualidad) || 0;
  if (!inicio || monto <= 0) return [];

  const diaPago = Math.min(Math.max(Number(diaPagoFijo) || 1, 1), 31);
  const mesInicio = indiceMes(inicio);
  const mesHoy = indiceMes(hoy);
  let limiteSuperior = mesHoy + Math.max(Number(mesesFuturosVisibles) || 0, 0);
  
  // ✅ Limitar si hay fecha de fin
  if (fechaFin) {
    const mesFin = indiceMes(fechaFin);
    if (mesFin < limiteSuperior) {
      limiteSuperior = mesFin;
    }
  }

  const periodos = [];
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

    let pagadoMes = 0;
    if (bolsaDeDinero >= monto) {
      pagadoMes = monto;
      bolsaDeDinero -= monto;
    } else if (bolsaDeDinero > 0) {
      pagadoMes = bolsaDeDinero;
      bolsaDeDinero = 0;
    }

    const saldoMes = Math.max(monto - pagadoMes, 0);
    let status = "Pendiente";

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