// src/utils/fechas.ts

/**
 * Extrae el string "YYYY-MM-DD" de cualquier fecha ISO o Date.
 */
export function extraerFechaString(fechaRaw: string | Date | undefined | null): string {
  if (!fechaRaw) return "";
  const str = String(fechaRaw);
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  return str;
}

/**
 * Formatea la fecha visualmente SIN usar objetos Date.
 * Retorna algo como "10 may 2024".
 */
export function formatearFechaDisplay(fechaRaw: string | Date | undefined | null): string {
  const fechaStr = extraerFechaString(fechaRaw);
  if (!fechaStr) return "";
  
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return fechaStr;
  
  const [year, month, day] = partes;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mesNombre = meses[parseInt(month) - 1] || month;
  
  return `${day} ${mesNombre} ${year}`;
}

/**
 * Convierte a un Date LOCAL al mediodía. Solo se usa para cálculos internos
 * (como saber qué día de la semana es), NUNCA para mostrar en pantalla.
 */
export function parsearFechaLocal(fechaRaw: string | Date | undefined | null): Date {
  const fechaStr = extraerFechaString(fechaRaw);
  if (!fechaStr) return new Date();
  return new Date(fechaStr + 'T12:00:00');
}