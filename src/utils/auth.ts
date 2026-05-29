/** Utilidades de sesión y roles (admin / profesor). */

export type RolUsuario = "admin" | "profesor" | "recepcion";

export interface UsuarioSesion {
  usuario?: string;
  nombreCompleto?: string;
  rol?: RolUsuario | string;
}

export function getUsuario(): UsuarioSesion | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
  } catch {
    return null;
  }
}

export function getRol(): string {
  return String(getUsuario()?.rol || "").toLowerCase();
}

export function esAdmin(): boolean {
  return getRol() === "admin";
}

export function esProfesor(): boolean {
  return getRol() === "profesor";
}

/** Ruta inicial según el rol tras iniciar sesión. */
export function rutaInicialPorRol(rol?: string): string {
  const r = String(rol || "").toLowerCase();
  if (r === "admin") return "/dashboard";
  // El profesor solo puede ver el calendario
  return "/dashboard";
}
