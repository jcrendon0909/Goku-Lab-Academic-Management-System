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
  const res = await fetch("http://localhost:4000/api/reagendaciones", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const responseData = await res.json();

  console.log("RESPUESTA POST /api/reagendaciones:", responseData);

  if (!res.ok) {
    throw new Error(responseData.error || "Error al guardar reagendación");
  }

  return responseData;
}


// --- SECCIÓN DE PAGOS ---
export async function getPagosConEstatus() {
    const res = await fetch(`${API_URL}/pagos/lista-completa`);
    if (!res.ok) throw new Error("Error al obtener la lista de pagos");
    return res.json();
}

export async function registrarAbono(data: {
    pagoId: string,
    montoAbono: number,
    nombreAlumno: string,
    metodoAbono: string
}) {
    const res = await fetch(`${API_URL}/abonos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al registrar el abono");
    }
    return res.json();
}