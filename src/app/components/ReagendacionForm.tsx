import { useState } from "react";
import { crearReagendacion } from "../../services/api";


interface ReagendacionFormProps {
  data: any;
  onClose: () => void;
}


export default function ReagendacionForm({ data, onClose }:  ReagendacionFormProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [duracion, setDuracion] = useState("2 horas");
  const [profesorNuevo, setProfesorNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async () => {
  try {
    setGuardando(true);

    console.log("========== DEBUG REAGENDACIÓN ==========");
    console.log("📌 data completa:", data);
    console.log("📌 data.alumno:", data?.alumno);
    console.log("📌 data.clase:", data?.clase);

    const idGrupoOrigenDetectado =
      data?.clase?.idGrupo ||
      data?.clase?.IdgrupoOrigen ||
      data?.clase?.GrupoId ||
      data?.clase?.groupId ||
      data?.clase?.id ||
      data?.clase?._id ||
      "";

    console.log("📌 Posibles ids detectados:", {
      idGrupo: data?.clase?.idGrupo,
      IdgrupoOrigen: data?.clase?.IdgrupoOrigen,
      GrupoId: data?.clase?.GrupoId,
      groupId: data?.clase?.groupId,
      id: data?.clase?.id,
      _id: data?.clase?._id,
    });

    console.log("📌 idGrupoOrigenDetectado:", idGrupoOrigenDetectado);

    if (!data?.alumno?.idAlumno) {
      console.error("❌ Falta data.alumno.idAlumno");
      alert("No se encontró el id del alumno");
      return;
    }

    if (!idGrupoOrigenDetectado) {
      console.error("❌ No se encontró el grupo de origen");
      alert("No se encontró el grupo de origen. Revisa la consola.");
      return;
    }

    if (!fecha || !hora) {
      console.error("❌ Faltan fecha u hora");
      alert("Debes seleccionar fecha y hora");
      return;
    }

     const payload = {
      ReagendacionId: `REA${Date.now()}`,
      idAlumno: data.alumno.idAlumno,
      nombreAlumno:
        data.alumno.nombreAlumno ||
        data.alumno.Alumno ||
        data.alumno.nombre ||
        "",
      IdgrupoOrigen: idGrupoOrigenDetectado,
      idGrupoNuevo: idGrupoOrigenDetectado,
      nombreCurso: data.clase.title || data.clase.nombreCurso || "",
      profesorOriginal:
        data.clase.teacher?.name || data.clase.nombreProfesor || "",
      profesorNuevo:
        profesorNuevo || data.clase.teacher?.name || data.clase.nombreProfesor || "",
      fechaHoraOriginal: `${data.clase.date || ""} ${data.clase.startTime || ""}`,
      fechaHoraNueva: `${fecha} ${hora}`,
      motivo: "Reagendado desde sistema",
      FechaMovimiento: new Date().toISOString(),
      estatus: "reagendado",
    };

    console.log("📤 PAYLOAD FINAL:", payload);

    const respuesta = await crearReagendacion(payload);
    console.log("✅ RESPUESTA SERVIDOR:", respuesta);

    alert("Reagendación guardada correctamente");
    onClose();
  } catch (error) {
    console.error("❌ ERROR EN handleSubmit:", error);
    alert("Error al guardar la reagendación");
  } finally {
    setGuardando(false);
    console.log("========== FIN DEBUG ==========");
  }
};

  const handleEnviarMensaje = async () => {
    const mensaje = `Hola equipo 👋

Se solicita reagendación:

Alumno: ${data?.alumno?.nombreAlumno || data?.alumno?.Alumno || ""}
Curso: ${data?.clase?.title || data?.clase?.nombreCurso || ""}
Profesor actual: ${data?.clase?.teacher?.name || data?.clase?.nombreProfesor || ""}
Horario original: ${data?.clase?.startTime || ""} - ${data?.clase?.endTime || ""}

Nueva fecha: ${fecha || "[pendiente]"}
Nueva hora: ${hora || "[pendiente]"}
Duración: ${duracion}

¿Quién puede cubrir esta clase?`;

    try {
      console.log("📲 Mensaje de WhatsApp generado:", mensaje);
      await navigator.clipboard.writeText(mensaje);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(mensaje)}`,
        "_blank"
      );
    } catch (error) {
      console.error("❌ Error al generar mensaje:", error);
      alert("No se pudo generar el mensaje");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-[600px] rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-2">
          Reprogramación de Clase
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          Para {data?.alumno?.nombreAlumno || data?.alumno?.Alumno || "Alumno"}
        </p>

        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Clase Original</h3>
          <p><b>Materia:</b> {data?.clase?.title || data?.clase?.nombreCurso}</p>
          <p><b>Profesor:</b> {data?.clase?.teacher?.name || data?.clase?.nombreProfesor}</p>
          <p>
            <b>Horario:</b> {data?.clase?.startTime} - {data?.clase?.endTime}
          </p>
        </div>

        <button
          onClick={handleEnviarMensaje}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg mb-4"
        >
          📲 Enviar Mensaje a Profesores
        </button>

        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-3">
            Nueva Fecha, Hora y Duración
          </h3>

          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border p-2 rounded w-1/3"
            />

            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="border p-2 rounded w-1/3"
            />

            <select
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              className="border p-2 rounded w-1/3"
            >
              <option>1 hora</option>
              <option>2 horas</option>
              <option>3 horas</option>
            </select>
          </div>

          <input
            placeholder="Profesor nuevo"
            value={profesorNuevo}
            onChange={(e) => setProfesorNuevo(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4 text-sm">
          Esta clase quedará marcada como <b>"Reprogramado"</b>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {guardando ? "Guardando..." : "Confirmar Reprogramación"}
          </button>
        </div>
      </div>
    </div>
  );
}