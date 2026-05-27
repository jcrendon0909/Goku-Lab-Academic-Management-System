/**
 * Parseador centralizado para fechas ISO 8601 y múltiples formatos
 * Garantiza consistencia en toda la aplicación
 * 
 * Todos los resultados son Date objects UTC-naive (se interpretan como UTC-6 en frontend)
 */

/**
 * Parsea múltiples formatos de fecha a Date object
 * Soporta:
 * - ISO 8601: "2024-05-15T14:30:00Z" o "2024-05-15T14:30:00"
 * - SQL: "2024-05-15 14:30:00"
 * - Input date: "2024-05-15"
 * - JavaScript Date string (fallback)
 */
export function parseFechaFlexible(valor) {
  if (!valor) return null;

  const str = String(valor).trim();
  if (!str) return null;

  // Intentar parsear directamente (ISO 8601, SQL, etc)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // Formato YYYY-MM-DD (input type="date")
  const matchFecha = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchFecha) {
    // Crear a las 00:00 UTC (que es 18:00 del día anterior en UTC-6)
    // Pero queremos que se interprete como medianoche local
    const [, y, mo, d] = matchFecha;
    return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0));
  }

  // Formato YYYY-MM-DD HH:mm o YYYY-MM-DD HH:mm:ss
  const matchFechaHora = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (matchFechaHora) {
    const [, y, mo, d, h, mi, s] = matchFechaHora;
    return new Date(
      Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s) || 0
      )
    );
  }

  // Formato Tue May 15 2024 14:00 (JavaScript Date.toString())
  const matchRaro = str.match(
    /([A-Za-z]{3}\s[A-Za-z]{3}\s\d{1,2}\s\d{4}).*?(\d{1,2}):(\d{2})/
  );
  if (matchRaro) {
    const [, fechaTexto, h, mi] = matchRaro;
    const base = new Date(fechaTexto);
    if (!isNaN(base.getTime())) {
      base.setHours(Number(h), Number(mi), 0, 0);
      return base;
    }
  }

  return null;
}

/**
 * Valida que una fecha es válida
 * Usado después de parsear para confirmar
 */
export function esFechaValida(fecha) {
  if (!fecha) return false;
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return !isNaN(d.getTime());
}

/**
 * Convierte Date a ISO 8601 string para enviar al frontend
 * Formato: YYYY-MM-DDTHH:mm:00Z
 */
export function fechaAISO(fecha) {
  if (!fecha) return "";
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
}

/**
 * Extrae solo la fecha (YYYY-MM-DD) sin hora
 */
export function extraerFecha(fecha) {
  if (!fecha) return "";
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/**
 * Extrae solo la hora (HH:mm) de una fecha
 */
export function extraerHora(fecha) {
  if (!fecha) return "";
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return "";
  
  const horas = String(d.getUTCHours()).padStart(2, "0");
  const minutos = String(d.getUTCMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

/**
 * Extrae el día de la semana en español
 */
export function extraerDia(fecha) {
  if (!fecha) return "";
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return "";
  
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return dias[d.getUTCDay()];
}
