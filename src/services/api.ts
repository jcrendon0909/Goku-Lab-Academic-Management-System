import { notifyDataChanged } from "../utils/dataSync";

// ============================================================
// CONFIGURACIÓN DINÁMICA DE LA URL DEL BACKEND
// ============================================================
// Prioridad de resolución (de mayor a menor):
//   1. localStorage["goku_api_url"]   → override manual del usuario (selector)
//   2. /config.json                   → valor por defecto editable vía deploy
//   3. VITE_API_URL (build-time)      → inyectado por Cloudflare Pages
//   4. http://localhost:4000          → solo en desarrollo
// ============================================================

const DEFAULT_API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "");

const API_URL_STORAGE_KEY = "goku_api_url";

export interface ApiInstance {
  id: string;
  label: string;
  url: string;
}

export interface ApiConfig {
  apiUrl: string;
  instances: ApiInstance[];
}

let cachedApiUrl: string | null = null;
let cachedConfig: ApiConfig | null = null;
let apiUrlPromise: Promise<string> | null = null;

async function loadConfig(): Promise<ApiConfig | null> {
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    return data as ApiConfig;
  } catch {
    return null;
  }
}

async function resolveApiUrl(): Promise<string> {
  if (cachedApiUrl) return cachedApiUrl;

  const stored = localStorage.getItem(API_URL_STORAGE_KEY);
  if (stored) {
    cachedApiUrl = stored;
    return stored;
  }

  const cfg = await loadConfig();
  cachedConfig = cfg;

  if (cfg?.apiUrl) {
    cachedApiUrl = cfg.apiUrl;
    return cfg.apiUrl;
  }

  if (!DEFAULT_API_URL) {
    console.error(
      "⛔ No hay URL de API. Define VITE_API_URL en Cloudflare o crea /config.json."
    );
  }
  cachedApiUrl = DEFAULT_API_URL;
  return DEFAULT_API_URL;
}

function getApiUrl(): Promise<string> {
  if (!apiUrlPromise) apiUrlPromise = resolveApiUrl();
  return apiUrlPromise;
}

// ---------- API pública para el selector de instancia ----------

export async function obtenerConfiguracionApi(): Promise<{
  activa: string;
  instancias: ApiInstance[];
  origen: "localStorage" | "config.json" | "env" | "default";
}> {
  if (!cachedConfig) cachedConfig = await loadConfig();

  const stored = localStorage.getItem(API_URL_STORAGE_KEY);
  const activa = await getApiUrl();

  let origen: "localStorage" | "config.json" | "env" | "default" = "default";
  if (stored) origen = "localStorage";
  else if (cachedConfig?.apiUrl) origen = "config.json";
  else if (DEFAULT_API_URL) origen = "env";

  return {
    activa,
    instancias: cachedConfig?.instances ?? [],
    origen,
  };
}

export function cambiarInstanciaApi(url: string) {
  localStorage.setItem(API_URL_STORAGE_KEY, url);
  cachedApiUrl = url;
  apiUrlPromise = Promise.resolve(url);
  if (typeof window !== "undefined") window.location.reload();
}

export function usarInstanciaPorDefecto() {
  localStorage.removeItem(API_URL_STORAGE_KEY);
  cachedApiUrl = null;
  cachedConfig = null;
  apiUrlPromise = null;
  if (typeof window !== "undefined") window.location.reload();
}

// ============================================================
// FETCH BASE (usa la URL resuelta dinámicamente)
// ============================================================

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = await getApiUrl();
  const token = localStorage.getItem("token");
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });

  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
    throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  }

  return res;
}

export const loginService = async (usuario: string, password: string) => {
  const baseUrl = await getApiUrl();
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al iniciar sesión");
  }

  const data = await response.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
};

export async function getCalendario() {
  const res = await apiFetch("/calendario");
  if (!res.ok) throw new Error("Error al obtener calendario");
  return res.json();
}

export async function getReagendaciones() {
  const res = await apiFetch("/reagendaciones");
  if (!res.ok) throw new Error("Error al obtener reagendaciones");
  return res.json();
}

export async function crearReagendacion(data: any) {
  const res = await apiFetch("/reagendaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) {
    const detalle = responseData.detalle ? ` (${responseData.detalle})` : "";
    throw new Error((responseData.error || "Error al guardar reagendación") + detalle);
  }
  notifyDataChanged({ tipo: "reagendacion" });
  return responseData;
}

export async function getProfesores() {
  const res = await apiFetch("/profesores");
  if (!res.ok) throw new Error("Error al obtener profesores");
  return res.json();
}

export async function crearProfesor(data: {
  nombre: string;
  fechaNacimiento?: string | null;
  salarioPorHora?: number;
  tipoPago?: 'por_hora' | 'fijo_mensual';
  salarioMensual?: number;
  crearUsuario?: boolean;
  usuario?: string;
  password?: string;
}) {
  const res = await apiFetch("/profesores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al crear el maestro");
  notifyDataChanged({ tipo: "profesor" });
  return responseData;
}

export async function renombrarProfesor(idProfesor: string, nombre: string) {
  const res = await apiFetch(`/profesores/${idProfesor}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al editar el maestro");
  notifyDataChanged({ tipo: "profesor" });
  return data;
}

export async function actualizarEstatusProfesor(
  idProfesor: string,
  estatus: "Activo" | "Inactivo"
) {
  const res = await apiFetch(`/profesores/${idProfesor}/estatus`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estatus }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al actualizar el maestro");
  notifyDataChanged({ tipo: "profesor" });
  return data;
}

export async function eliminarProfesor(idProfesor: string) {
  const res = await apiFetch(`/profesores/${idProfesor}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al dar de baja al maestro");
  notifyDataChanged({ tipo: "profesor" });
  return data;
}

export async function reasignarProfesorGrupo(grupoId: string, idProfesor: string) {
  const res = await apiFetch(`/grupos/${grupoId}/profesor`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idProfesor }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al reasignar el profesor");
  notifyDataChanged({ tipo: "grupo" });
  return data;
}

export async function getGrupos() {
  const res = await apiFetch("/grupos");
  if (!res.ok) throw new Error("Error al obtener grupos");
  return res.json();
}

export async function getCursos() {
  const res = await apiFetch("/cursos");
  if (!res.ok) throw new Error("Error al obtener cursos");
  return res.json();
}

export async function crearCurso(nombreCurso: string) {
  const res = await apiFetch("/cursos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreCurso }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al crear el curso");
  notifyDataChanged({ tipo: "curso" });
  return data;
}

export async function renombrarCurso(idCurso: string, nombreCurso: string) {
  const res = await apiFetch(`/cursos/${idCurso}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombreCurso }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al editar el curso");
  notifyDataChanged({ tipo: "curso" });
  return data;
}

export async function actualizarEstatusCurso(
  idCurso: string,
  estatus: "Activo" | "Inactivo"
) {
  const res = await apiFetch(`/cursos/${idCurso}/estatus`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estatus }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al actualizar el curso");
  notifyDataChanged({ tipo: "curso" });
  return data;
}

export async function eliminarCurso(idCurso: string) {
  const res = await apiFetch(`/cursos/${idCurso}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al borrar el curso");
  notifyDataChanged({ tipo: "curso" });
  return data;
}

export async function reasignarCursoGrupo(grupoId: string, idCurso: string) {
  const res = await apiFetch(`/grupos/${grupoId}/curso`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idCurso }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al reasignar el curso");
  notifyDataChanged({ tipo: "grupo" });
  return data;
}

export async function getAlumnos(busqueda: string = "") {
  const path = busqueda ? `/alumnos?q=${encodeURIComponent(busqueda)}` : "/alumnos";
  const res = await apiFetch(path);
  if (!res.ok) throw new Error("Error al obtener alumnos");
  return res.json();
}

export async function actualizarAlumno(
  idAlumno: string,
  data: {
    nombreAlumno?: string;
    telefono?: string;
    tutor?: string;
    observaciones?: string;
    estatus?: string;
  }
) {
  const res = await apiFetch(`/alumnos/${idAlumno}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al actualizar alumno");
  notifyDataChanged({ tipo: "alumno" });
  return responseData;
}

export async function eliminarAlumno(idAlumno: string) {
  const res = await apiFetch(`/alumnos/${idAlumno}`, { method: "DELETE" });
  const responseData = await res.json();
  if (!res.ok) {
    const activas = responseData.detalle?.inscripcionesActivas;
    const extra =
      activas != null
        ? ` Tiene ${activas} curso(s) activo(s): usa «Dar de baja» en cada curso primero.`
        : "";
    throw new Error((responseData.error || "Error al eliminar alumno") + extra);
  }
  notifyDataChanged({ tipo: "eliminar-alumno" });
  return responseData;
}

export async function desactivarAlumno(idAlumno: string) {
  const res = await apiFetch(`/alumnos/${idAlumno}/desactivar`, { method: "PATCH" });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al desactivar alumno");
  notifyDataChanged({ tipo: "alumno" });
  return responseData;
}

export async function crearAlumno(data: {
  nombreAlumno: string;
  telefono?: string;
  tutor?: string;
  observaciones?: string;
  estatus?: string;
}) {
  const res = await apiFetch("/alumnos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al crear alumno");
  notifyDataChanged({ tipo: "alumno" });
  return responseData;
}

export async function getInscripciones() {
  const res = await apiFetch("/inscripciones");
  if (!res.ok) throw new Error("Error al obtener inscripciones");
  return res.json();
}

export async function guardarNotasAlumno(data: { idAlumno: string; observaciones: string }) {
  const res = await apiFetch(`/alumnos/${data.idAlumno}/nota`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observaciones: data.observaciones }),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al guardar la nota del alumno");
  notifyDataChanged({ tipo: "alumno" });
  return responseData;
}

export async function crearInscripcion(data: {
  idAlumno: string;
  nombreAlumno: string;
  grupoId: string;
  modalidad?: string;
  fechaInscripcion?: string;
  montoMensualidad?: number;
  diaPago?: number;
  fechaInicioPago?: string;
  comentarios?: string;
}) {
  const res = await apiFetch("/inscripciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al crear inscripción");
  notifyDataChanged({ tipo: "inscripcion" });
  return responseData;
}

export async function actualizarInscripcionAlumno(
  idAlumno: string,
  grupoId: string,
  data: { modalidad?: string; comentarios?: string }
) {
  const res = await apiFetch(`/inscripciones/${idAlumno}/${grupoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al actualizar inscripción");
  notifyDataChanged({ tipo: "inscripcion" });
  return responseData;
}

export async function getInscripcionesPorGrupo(grupoId: string) {
  const res = await apiFetch(`/inscripciones/grupo/${grupoId}`);
  if (!res.ok) throw new Error("Error al obtener inscripciones del grupo");
  return res.json();
}

export async function getInscripcionesPorAlumno(idAlumno: string) {
  const res = await apiFetch(`/inscripciones/alumno/${idAlumno}`);
  if (!res.ok) throw new Error("Error al obtener inscripciones del alumno");
  return res.json();
}

export async function crearGrupoConAlumno(data: {
  fechaInscripcion?: string;
  grupo: {
    idCurso?: string;
    nombreCurso: string;
    diaClase: string;
    horaClase: string;
    duracionClase?: string;
    idProfesor?: string;
    nombreProfesor: string;
    comentario?: string;
    comentarioGrupo?: string;
    capacidadMaxima: number;
    fechaCreacion?: string;
    Estatus?: string;
  };
  alumnoExistente?: {
    idAlumno: string;
    nombreAlumno?: string;
    nombre?: string;
    modalidad?: string;
  };
  alumnoNuevo?: {
    nombreAlumno: string;
    telefono?: string;
    tutor?: string;
    observaciones?: string;
    estatus?: string;
    modalidad?: string;
  };
  datosPago?: {
    montoMensualidad: number;
    diaPago: number;
    fechaInicioPago: string;
    comentarios?: string;
  };
}) {
  const res = await apiFetch("/grupos/crear-con-alumno", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al crear grupo con alumno");
  notifyDataChanged({ tipo: "inscripcion" });
  return responseData;
}

export async function actualizarComentarioGrupo(grupoId: string, comentario: string) {
  const res = await apiFetch(`/grupos/${grupoId}/comentario`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comentario }),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al actualizar comentario del grupo");
  notifyDataChanged({ tipo: "grupo" });
  return responseData;
}

export async function getPagosConEstatus() {
  const res = await apiFetch("/pagos/lista-completa");
  if (!res.ok) throw new Error("Error al obtener la lista de pagos");
  return res.json();
}

export async function registrarAbono(data: {
  pagoId: string;
  montoAbono: number;
  nombreAlumno: string;
  metodoAbono: string;
  fechaAbono?: string;
  idAlumno: string;
  grupoId: string;
  nuevoMontoMensual?: number | null;
  esDescuento?: boolean;
  descuentoPorcentaje?: number;
  mesesCubiertos?: number;
  aplicaSaldoAFavor?: boolean;
}) {
  const res = await apiFetch("/abonos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al registrar el abono");
  }
  const responseData = await res.json();
  notifyDataChanged({ tipo: "pago" });
  return responseData;
}

export async function eliminarReagendacion(id: string) {
  const res = await apiFetch(`/reagendaciones/${id}`, { method: "DELETE" });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al eliminar reagendación");
  notifyDataChanged({ tipo: "reagendacion" });
  return responseData;
}

export async function eliminarReagendacionAlumno(idAlumno: string, idGrupoNuevo: string) {
  const res = await apiFetch(`/reagendaciones/alumno/${idAlumno}/${idGrupoNuevo}`, {
    method: "DELETE",
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al eliminar reagendación");
  notifyDataChanged({ tipo: "reagendacion" });
  return responseData;
}

export async function bajaAlumnoDeGrupo(idAlumno: string, grupoId: string) {
  const res = await apiFetch(`/inscripciones/${idAlumno}/${grupoId}`, { method: "DELETE" });
  const responseData = await res.json();
  if (!res.ok) {
    const detalle = responseData.detalle;
    let mensaje = responseData.error || "Error al dar de baja al alumno";
    if (responseData.detalle && typeof responseData.detalle === "string") {
      mensaje = `${mensaje} (${responseData.detalle})`;
    }
    if (detalle?.saldoPendiente > 0) {
      mensaje = `${mensaje} (saldo: $${Number(detalle.saldoPendiente).toFixed(2)})`;
    }
    throw new Error(mensaje);
  }
  notifyDataChanged({ tipo: "baja" });
  return responseData;
}

export async function eliminarHistorialCursoBaja(idAlumno: string, grupoId: string) {
  const res = await apiFetch(`/inscripciones/${idAlumno}/${grupoId}/historial`, {
    method: "DELETE",
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al eliminar el curso del sistema");
  notifyDataChanged({ tipo: "eliminar-historial-curso" });
  return responseData;
}

export async function reactivarInscripcion(
  idAlumno: string,
  grupoId: string,
  data?: { fechaInicioPago?: string }
) {
  const res = await apiFetch(`/inscripciones/${idAlumno}/${grupoId}/reactivar`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "Error al reactivar el curso");
  notifyDataChanged({ tipo: "reactivar" });
  return responseData;
}

export async function eliminarGrupo(grupoId: string) {
  const res = await apiFetch(`/grupos/${grupoId}`, { method: "DELETE" });
  const responseData = await res.json();
  if (!res.ok) {
    const lista =
      Array.isArray(responseData.alumnos) && responseData.alumnos.length > 0
        ? `\n${responseData.alumnos
            .map((a: { nombreAlumno?: string; idAlumno?: string }) => `• ${a.nombreAlumno || a.idAlumno}`)
            .join("\n")}`
        : "";
    throw new Error((responseData.error || "Error al eliminar grupo") + lista);
  }
  notifyDataChanged({ tipo: "grupo" });
  return responseData;
}

export const actualizarDiaPago = async (pagoId: string, nuevoDia: number) => {
  const response = await apiFetch(`/pagos/actualizar-dia/${pagoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nuevoDia }),
  });
  const responseData = await response.json();
  if (!response.ok) throw new Error(responseData.error || "Error al actualizar día de pago");
  notifyDataChanged({ tipo: "pago" });
  return responseData;
};

export async function actualizarDatosExtraProfesor(
  idProfesor: string,
  data: {
    fechaNacimiento?: Date | string | null;
    salarioPorHora?: number;
    tipoPago?: "por_hora" | "fijo_mensual";
    salarioMensual?: number;
  }
) {
  const res = await apiFetch(`/profesores/${idProfesor}/datos-extra`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const responseData = await res.json();
  if (!res.ok) {
    throw new Error(responseData.error || "Error al actualizar datos extra del profesor");
  }
  notifyDataChanged({ tipo: "profesor" });
  return responseData;
}

export async function getRentabilidadProfesores(filtros?: {
  mes?: string;
  anio?: string;
}) {
  const params = new URLSearchParams();
  if (filtros?.mes) params.append("mes", filtros.mes);
  if (filtros?.anio) params.append("anio", filtros.anio);

  const res = await apiFetch(`/reportes/rentabilidad-profesores?${params.toString()}`);
  if (!res.ok) throw new Error("Error al obtener rentabilidad de profesores");
  return res.json();
}

export async function solicitarResetPassword(usuario: string) {
  const res = await apiFetch("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al solicitar el restablecimiento");
  return data;
}

export async function resetPassword(token: string, nuevaPassword: string) {
  const res = await apiFetch("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, nuevaPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al restablecer la contraseña");
  return data;
}

export async function resetPasswordPorAdmin(idUsuario: string) {
  const res = await apiFetch(`/usuarios/${idUsuario}/reset-password`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al generar token");
  return data.token;
}

export const actualizarModalidadReagendacion = async (
  reagendacionId: string,
  modalidad: string
) => {
  const res = await apiFetch(`/reagendaciones/${reagendacionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modalidad }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar modalidad');
  return data;
};

export async function getGastos(filtros?: { mes?: string; anio?: number; categoria?: string }) {
  const params = new URLSearchParams();
  if (filtros?.mes) params.append('mes', filtros.mes);
  if (filtros?.anio) params.append('anio', String(filtros.anio));
  if (filtros?.categoria) params.append('categoria', filtros.categoria);

  const res = await apiFetch(`/gastos?${params.toString()}`);
  if (!res.ok) throw new Error('Error al obtener gastos');
  return res.json();
}

export async function crearGasto(data: any) {
  const res = await apiFetch('/gastos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al crear gasto');
  return res.json();
}

export async function actualizarGasto(id: string, data: any) {
  const res = await apiFetch(`/gastos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar gasto');
  return res.json();
}

export async function eliminarGasto(id: string) {
  const res = await apiFetch(`/gastos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar gasto');
  return res.json();
}

export async function editarAbono(
  abonoId: string,
  data: {
    montoAbono?: number;
    fechaAbono?: string;
    metodoAbono?: string;
    notas?: string;
  }
) {
  const res = await apiFetch(`/abonos/${abonoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al editar el abono");
  }
  const responseData = await res.json();
  notifyDataChanged({ tipo: "pago" });
  return responseData;
}

// ============================================================
// REPORTES FINANCIEROS (módulo de rentabilidad global)
// ============================================================

export interface FuenteMonto {
  id: string;
  label: string;
  monto: number;
}

export interface RentabilidadGlobal {
  periodo: { anio: number; mes: number; mesLabel: string; label: string };
  ingresos: { 
    fuentes: FuenteMonto[]; 
    total: number; 
    proyectado: number; // 🆕 Agregado para la meta del mes
  };
  egresos: { fuentes: FuenteMonto[]; total: number };
  utilidad: number;
  utilidadProyectada: number; // 🆕 Agregado para comparar el estimado
  porcentajeUtilidad: number;
  desgloseGastos: { categoria: string; monto: number }[];
  desgloseProfesores: { idProfesor: string; nombre: string; costo: number }[];
  variacionVsMesAnterior: { monto: number; porcentaje: number | null };
}

export interface UtilidadMensual {
  anio: number;
  meses: {
    mesNum: number;
    mesLabel: string;
    label: string;
    ingresos: number;
    ingresosProyectados: number; // 🆕 Agregado
    gastos: number;
    costoProfesores: number;
    egresos: number;
    utilidad: number;
    utilidadProyectada: number; // 🆕 Agregado
    porcentajeUtilidad: number;
  }[];
}

export async function getRentabilidadGlobal(filtros?: {
  mes?: number;
  anio?: number;
}): Promise<RentabilidadGlobal> {
  const params = new URLSearchParams();
  if (filtros?.mes) params.append("mes", String(filtros.mes));
  if (filtros?.anio) params.append("anio", String(filtros.anio));
  const res = await apiFetch(`/reportes/rentabilidad-global?${params.toString()}`);
  if (!res.ok) throw new Error("Error al obtener rentabilidad global");
  return res.json();
}

export async function getUtilidadMensual(anio?: number): Promise<UtilidadMensual> {
  const params = new URLSearchParams();
  if (anio) params.append("anio", String(anio));
  const res = await apiFetch(`/reportes/utilidad-mensual?${params.toString()}`);
  if (!res.ok) throw new Error("Error al obtener utilidad mensual");
  return res.json();
}

export async function restaurarGasto(id: string) {
  const res = await apiFetch(`/gastos/${id}/restaurar`, { method: "PATCH" });
  if (!res.ok) throw new Error("Error al restaurar gasto");
  return res.json();
}