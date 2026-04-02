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
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al guardar reagendación");
  }

  return res.json();
}