// server/utils/periodos.js
// Helpers de rango temporal usados por reportes y gastos.
// IMPORTANTE: MESES_LABEL debe coincidir EXACTAMENTE con el enum del modelo Gasto.

export const MESES_LABEL = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * Devuelve el rango [inicio, fin) para un mes concreto.
 * @param {number} anio
 * @param {number} mes 1..12
 */
export function rangoMes(anio, mes) {
  const fechaInicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0);
  const fechaFin = new Date(anio, mes, 1, 0, 0, 0, 0); // exclusivo
  const mesLabel = MESES_LABEL[mes - 1];
  return {
    fechaInicio,
    fechaFin,
    mesLabel,
    label: `${mesLabel} ${anio}`,
  };
}

/**
 * Deriva { mes, anio } desde un objeto Date.
 * Fuente única de verdad: la fecha. Nunca confiar en lo que manda el cliente.
 */
export function mesAnioDesdeFecha(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return {
    mes: MESES_LABEL[d.getMonth()],
    anio: d.getFullYear(),
  };
}

/** Redondeo a 2 decimales para evitar basura flotante en JSON. */
export function redondear(n) {
  if (typeof n !== "number" || !isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}