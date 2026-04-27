const API_URL = "http://localhost:4000/api";

export async function getCalendario() {
  const res = await fetch(`${API_URL}/calendario`);
  if (!res.ok) throw new Error("Error al obtener calendario");
  return res.json();
}

export async function getReagendaciones() {
  const res = await fetch(`${API_URL}/reagendaciones`);
  if (!res.ok) throw new Error("Error al obtener reagendaciones");
  return res.json();
}

export async function crearReagendacion(data: any) {
  const res = await fetch(`${API_URL}/reagendaciones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();

  console.log("RESPUESTA POST /api/reagendaciones:", responseData);

  if (!res.ok) {
    throw new Error(responseData.error || "Error al guardar reagendación");
  }

  return responseData;
}

export async function getProfesores() {
  const res = await fetch(`${API_URL}/profesores`);
  if (!res.ok) throw new Error("Error al obtener profesores");
  return res.json();
}

export async function getAlumnos(busqueda: string = "") {
  const url = busqueda
    ? `${API_URL}/alumnos?q=${encodeURIComponent(busqueda)}`
    : `${API_URL}/alumnos`;

  const res = await fetch(url);

  if (!res.ok) throw new Error("Error al obtener alumnos");
  return res.json();
}

export async function crearAlumno(data: {
  nombreAlumno: string;
  telefono?: string;
  tutor?: string;
  observaciones?: string;
  estatus?: string;
}) {
  const res = await fetch(`${API_URL}/alumnos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();

  console.log("RESPUESTA POST /api/alumnos:", responseData);

  if (!res.ok) {
    throw new Error(responseData.error || "Error al crear alumno");
  }

  return responseData;
}

export async function getInscripciones() {
  const res = await fetch(`${API_URL}/inscripciones`);
  if (!res.ok) throw new Error("Error al obtener inscripciones");
  return res.json();
}

export async function crearInscripcion(data: {
  idAlumno: string;
  nombreAlumno: string;
  grupoId: string;
}) {
  const res = await fetch(`${API_URL}/inscripciones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();

  console.log("RESPUESTA POST /api/inscripciones:", responseData);

  if (!res.ok) {
    throw new Error(responseData.error || "Error al crear inscripción");
  }

  return responseData;
}

export async function getInscripcionesPorGrupo(grupoId: string) {
  const res = await fetch(`${API_URL}/inscripciones/grupo/${grupoId}`);
  if (!res.ok) throw new Error("Error al obtener inscripciones del grupo");
  return res.json();
}

export async function getInscripcionesPorAlumno(idAlumno: string) {
  const res = await fetch(`${API_URL}/inscripciones/alumno/${idAlumno}`);
  if (!res.ok) throw new Error("Error al obtener inscripciones del alumno");
  return res.json();
}

// --- SECCIÓN DE PAGOS ---
export async function getPagosConEstatus() {
  const res = await fetch(`${API_URL}/pagos/lista-completa`);
  if (!res.ok) throw new Error("Error al obtener la lista de pagos");
  return res.json();
}

export async function registrarAbono(data: {
  pagoId: string;
  montoAbono: number;
  nombreAlumno: string;
  metodoAbono: string;
}) {
  const res = await fetch(`${API_URL}/abonos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al registrar el abono");
  }
  return res.json();
}