// src/utils/dateUtils.ts

/**
 * Convierte un string ISO (UTC) a hora local de México (CDMX)
 * Formato: "HH:MM" (24h). Cambie `hour12: true` para 12h.
 */
export function formatMexicoTime(isoString: string): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Suma una duración (ej. "1:30 hr") a una fecha ISO y devuelve nueva fecha ISO
 */
export function addDurationToIso(isoString: string, durationStr: string): string {
  if (!isoString || !durationStr) return isoString;
  const parts = durationStr.replace(' hr', '').split(':').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return isoString;
  const [hours, minutes] = parts;
  const date = new Date(isoString);
  date.setHours(date.getHours() + hours);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * Devuelve rango "inicio - fin" en hora local, ej. "10:46 - 12:16"
 */
export function formatMexicoTimeRange(startIso: string, durationStr: string): string {
  const start = formatMexicoTime(startIso);
  const endIso = addDurationToIso(startIso, durationStr);
  const end = formatMexicoTime(endIso);
  return `${start} - ${end}`;
}