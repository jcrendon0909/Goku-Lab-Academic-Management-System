import React, { useState } from "react";
import { actualizarDatosExtraProfesor } from "../api";

interface Props {
  idProfesor: string;
  fechaNacimientoActual?: string | null;
  salarioPorHoraActual?: number;
  onActualizado?: () => void;
}

const EditarDatosProfesor: React.FC<Props> = ({
  idProfesor,
  fechaNacimientoActual,
  salarioPorHoraActual,
  onActualizado,
}) => {
  const [fechaNacimiento, setFechaNacimiento] = useState<string>(
    fechaNacimientoActual ? new Date(fechaNacimientoActual).toISOString().split("T")[0] : ""
  );
  const [salarioPorHora, setSalarioPorHora] = useState<number>(
    salarioPorHoraActual ?? 0
  );
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: "exito" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);

    try {
      await actualizarDatosExtraProfesor(idProfesor, {
        fechaNacimiento: fechaNacimiento || null,
        salarioPorHora: salarioPorHora,
      });
      setMensaje({ texto: "Datos actualizados correctamente", tipo: "exito" });
      if (onActualizado) onActualizado();
    } catch (error: any) {
      setMensaje({ texto: error.message || "Error al actualizar", tipo: "error" });
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold">Datos adicionales del profesor</h3>

      <div>
        <label className="block text-sm font-medium">Fecha de nacimiento</label>
        <input
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Salario por hora (MXN)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={salarioPorHora}
          onChange={(e) => setSalarioPorHora(parseFloat(e.target.value) || 0)}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      {mensaje && (
        <div className={`p-2 rounded ${mensaje.tipo === "exito" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {mensaje.texto}
        </div>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {cargando ? "Guardando..." : "Guardar datos"}
      </button>
    </form>
  );
};

export default EditarDatosProfesor;