/** Utilidades de fechas para inscripciones y pagos (hora local) */

export function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toMonthInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Convierte YYYY-MM del input month a YYYY-MM-DD (día 1) para el API */
export function mesCobroAFechaInicio(yyyyMm: string): string {
  const limpio = String(yyyyMm || "").trim();
  if (!/^\d{4}-\d{2}$/.test(limpio)) return "";
  return `${limpio}-01`;
}

export function indiceMesDesdeInput(valor: string): number | null {
  const fecha = valor.length === 7 ? mesCobroAFechaInicio(valor) : valor;
  const d = new Date(fecha.includes("T") ? fecha : `${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear() * 12 + d.getMonth();
}

export function validarFechasInscripcion(
  fechaInicioClases: string,
  primerMesCobro: string
): string | null {
  if (!fechaInicioClases) {
    return "Indica desde qué día empieza a tomar clase";
  }
  if (!primerMesCobro) {
    return "Indica el primer mes de cobro";
  }

  const mesClase = indiceMesDesdeInput(fechaInicioClases);
  const mesCobro = indiceMesDesdeInput(primerMesCobro);

  if (mesClase === null || mesCobro === null) {
    return "Fechas inválidas";
  }

  if (mesCobro < mesClase) {
    return "El primer mes de cobro no puede ser anterior al mes en que inicia clases";
  }

  return null;
}

export function etiquetaMes(yyyyMm: string): string {
  const fecha = mesCobroAFechaInicio(yyyyMm);
  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return yyyyMm;
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}
