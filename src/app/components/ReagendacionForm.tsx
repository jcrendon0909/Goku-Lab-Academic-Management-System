import { useEffect, useMemo, useState } from "react";
import {
  crearReagendacion,
  getCalendario,
  getProfesores,
} from "../../services/api";

interface ReagendacionFormProps {
  data: any;
  onClose: () => void;
}

function normalizar(valor: string) {
  return String(valor || "").trim().toUpperCase();
}

function obtenerNombreDia(fechaISO: string) {
  if (!fechaISO) return "";
  const fecha = new Date(`${fechaISO}T00:00:00`);
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return dias[fecha.getDay()];
}

export default function ReagendacionForm({
  data,
  onClose,
}: ReagendacionFormProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [duracion, setDuracion] = useState("2 horas");
  const [idProfesorNuevo, setIdProfesorNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [grupoSugerido, setGrupoSugerido] = useState<any>(null);
  const [buscandoGrupo, setBuscandoGrupo] = useState(false);
  const [profesoresDisponibles, setProfesoresDisponibles] = useState<any[]>([]);

  const cursoActual = data?.clase?.title || data?.clase?.nombreCurso || "";
  const profesorOriginal =
    data?.clase?.teacher?.name || data?.clase?.nombreProfesor || "";
  const idProfesorOriginal =
    data?.clase?.idProfesor ||
    data?.clase?.IdProfesor ||
    data?.clase?.profesorId ||
    "";

  const profesorSeleccionado = profesoresDisponibles.find(
    (prof) => prof.idProfesor === idProfesorNuevo
  );

  const profesorFinal = profesorSeleccionado?.nombre || profesorOriginal;
  const idProfesorFinal = profesorSeleccionado?.idProfesor || idProfesorOriginal;

  const idGrupoOrigenDetectado =
    data?.clase?.idGrupo ||
    data?.clase?.IdgrupoOrigen ||
    data?.clase?.GrupoId ||
    data?.clase?.groupId ||
    data?.clase?.id ||
    data?.clase?._id ||
    "";

  const diaNuevo = useMemo(() => obtenerNombreDia(fecha), [fecha]);

  useEffect(() => {
    const cargarProfesores = async () => {
      try {
        const profesores = await getProfesores();

        const profesoresActivos = profesores
          .filter((prof: any) => {
            const estatus = String(prof.estatus || "").trim().toUpperCase();
            return estatus === "ACTIVO" || estatus === "";
          })
          .map((prof: any) => ({
            idProfesor:
              prof.idProfesor || prof.IdProfesor || prof.profesorId || "",
            nombre: String(prof.nombre || prof.nombreProfesor || "").trim(),
          }))
          .filter((prof: any) => prof.idProfesor && prof.nombre);

        profesoresActivos.sort((a: any, b: any) =>
          a.nombre.localeCompare(b.nombre, "es")
        );

        setProfesoresDisponibles(profesoresActivos);
      } catch (error) {
        console.error("❌ Error al cargar profesores:", error);
        setProfesoresDisponibles([]);
      }
    };

    cargarProfesores();
  }, []);

  useEffect(() => {
    const buscarGrupoCompatible = async () => {
      if (!fecha || !hora || !cursoActual || !idProfesorFinal) {
        setGrupoSugerido(null);
        return;
      }

      try {
        setBuscandoGrupo(true);

        const calendario = await getCalendario();
        const clasesBase = calendario?.clasesBase || [];

        const coincidencia = clasesBase.find((grupo: any) => {
          const mismoCurso =
            normalizar(grupo.nombreCurso) === normalizar(cursoActual);

          const mismoProfesor =
            normalizar(grupo.idProfesor) === normalizar(idProfesorFinal);

          const mismaHora =
            normalizar(grupo.horaClase) === normalizar(hora);

          const mismoDia =
            normalizar(grupo.diaClase) === normalizar(diaNuevo);

          return mismoCurso && mismoProfesor && mismaHora && mismoDia;
        });

        setGrupoSugerido(coincidencia || null);
      } catch (error) {
        console.error("❌ Error al buscar grupo compatible:", error);
        setGrupoSugerido(null);
      } finally {
        setBuscandoGrupo(false);
      }
    };

    buscarGrupoCompatible();
  }, [fecha, hora, cursoActual, idProfesorFinal, diaNuevo]);

  const handleSubmit = async () => {
    try {
      setGuardando(true);

      console.log("========== DEBUG REAGENDACIÓN ==========");
      console.log("📌 data completa:", data);
      console.log("📌 data.alumno:", data?.alumno);
      console.log("📌 data.clase:", data?.clase);
      console.log("📌 grupo sugerido:", grupoSugerido);

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

      const idGrupoNuevoFinal =
        grupoSugerido?.idGrupo ||
        `VIRTUAL_${cursoActual}_${idProfesorFinal}_${fecha}_${hora}`
          .replace(/\s+/g, "_")
          .replace(/[^A-Za-z0-9_\-]/g, "");

      const payload = {
        idAlumno: data.alumno.idAlumno,
        nombreAlumno:
          data.alumno.nombreAlumno ||
          data.alumno.Alumno ||
          data.alumno.nombre ||
          "",
        IdgrupoOrigen: idGrupoOrigenDetectado,
        idGrupoNuevo: idGrupoNuevoFinal,
        nombreCurso: cursoActual,
        profesorOriginal: profesorOriginal,
        profesorNuevo: profesorFinal,
        idProfesorOriginal: idProfesorOriginal,
        idProfesorNuevo: idProfesorFinal,
        fechaHoraOriginal: `${data.clase.date || ""} ${data.clase.startTime || ""}`,
        fechaHoraNueva: `${fecha} ${hora}`,
        duracion: duracion,
        motivo: grupoSugerido
          ? "Reagendado a grupo existente"
          : "Reagendado a clase virtual",
        FechaMovimiento: new Date().toISOString(),
        estatus: "reagendado",
      };

      console.log("📤 PAYLOAD FINAL:", payload);

      const respuesta = await crearReagendacion(payload);
      console.log("✅ RESPUESTA SERVIDOR:", respuesta);

      alert(
        grupoSugerido
          ? "Reagendación guardada en un grupo existente"
          : "Reagendación guardada como nueva clase reagendada"
      );

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
Curso: ${cursoActual}
Profesor actual: ${profesorOriginal}
Horario original: ${data?.clase?.startTime || ""} - ${data?.clase?.endTime || ""}

Nueva fecha: ${fecha || "[pendiente]"}
Nueva hora: ${hora || "[pendiente]"}
Duración: ${duracion}
Profesor sugerido: ${profesorFinal || "[pendiente]"}

${
  grupoSugerido
    ? `Grupo compatible encontrado: ${grupoSugerido.idGrupo}`
    : "No se encontró grupo compatible. Se creará clase reagendada."
}

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
      <div className="bg-white w-[650px] rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-2">Reprogramación de Clase</h2>

        <p className="text-sm text-gray-500 mb-4">
          Para {data?.alumno?.nombreAlumno || data?.alumno?.Alumno || "Alumno"}
        </p>

        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Clase Original</h3>
          <p>
            <b>Materia:</b> {cursoActual}
          </p>
          <p>
            <b>Profesor:</b> {profesorOriginal}
          </p>
          <p>
            <b>Horario:</b> {data?.clase?.startTime} - {data?.clase?.endTime}
          </p>
          <p>
            <b>Grupo origen:</b> {idGrupoOrigenDetectado}
          </p>
          <p>
            <b>ID profesor origen:</b> {idProfesorOriginal || "No disponible"}
          </p>
        </div>

        <button
          onClick={handleEnviarMensaje}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg mb-4"
        >
          Enviar Mensaje a Profesores
        </button>

        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-3">Nueva Fecha, Hora y Duración</h3>

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
              <option value="1 hora">1 hora</option>
              <option value="1:30 horas">1:30 horas</option>
              <option value="2 horas">2 horas</option>
              <option value="2:30 horas">2:30 horas</option>
              <option value="3 horas">3 horas</option>
              <option value="3:30 horas">3:30 horas</option>
              <option value="4 horas">4 horas</option>
            </select>
          </div>

          <select
            value={idProfesorNuevo}
            onChange={(e) => setIdProfesorNuevo(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">Selecciona profesor</option>
            {profesoresDisponibles.map((profesor) => (
              <option key={profesor.idProfesor} value={profesor.idProfesor}>
                {profesor.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          {buscandoGrupo ? (
            <div className="bg-blue-50 text-blue-700 p-3 rounded text-sm">
              Buscando grupo compatible...
            </div>
          ) : grupoSugerido ? (
            <div className="bg-green-50 text-green-800 p-3 rounded text-sm">
              <b>Grupo existente encontrado</b>
              <br />
              Id: {grupoSugerido.idGrupo}
              <br />
              Curso: {grupoSugerido.nombreCurso}
              <br />
              Profesor: {grupoSugerido.nombreProfesor}
              <br />
              Día: {grupoSugerido.diaClase}
              <br />
              Hora: {grupoSugerido.horaClase}
            </div>
          ) : fecha && hora ? (
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm">
              No se encontró un grupo compatible. Se creará una clase
              reagendada nueva.
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-600 p-3 rounded text-sm">
              Selecciona fecha, hora y profesor para buscar automáticamente un
              grupo compatible.
            </div>
          )}
        </div>

        <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4 text-sm">
          Esta clase quedará marcada como <b>"Reprogramado"</b>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
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