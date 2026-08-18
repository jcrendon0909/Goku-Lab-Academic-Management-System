import { useEffect, useMemo, useState } from "react";
import {
  crearReagendacion,
  getCalendario,
  getProfesores,
} from "../../services/api";
import { formatMexicoTimeRange } from "../../utils/dateUtils";
import { toast } from "sonner";

interface ReagendacionFormProps {
  data: any;
  onClose: () => void;
  onSuccess?: () => void;
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
  onSuccess,
}: ReagendacionFormProps) {
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [duracion, setDuracion] = useState("2 horas");
  const [modalidad, setModalidad] = useState(data?.alumno?.modalidad || "Presencial");
  const [idProfesorNuevo, setIdProfesorNuevo] = useState("");
  const [tipoReagendacion, setTipoReagendacion] = useState<"temporal" | "permanente">("temporal");
  const [guardando, setGuardando] = useState(false);
  const [grupoSugerido, setGrupoSugerido] = useState<any>(null);
  const [buscandoGrupo, setBuscandoGrupo] = useState(false);
  const [profesoresDisponibles, setProfesoresDisponibles] = useState<any[]>([]);

  const cursoActual = data?.clase?.title || data?.clase?.nombreCurso || "";
  const profesorOriginal = data?.clase?.teacher?.name || data?.clase?.nombreProfesor || "";
  const idProfesorOriginal = data?.clase?.idProfesor || data?.clase?.IdProfesor || data?.clase?.profesorId || "";

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
            idProfesor: prof.idProfesor || prof.IdProfesor || prof.profesorId || "",
            nombre: String(prof.nombre || prof.nombreProfesor || "").trim(),
          }))
          .filter((prof: any) => prof.idProfesor && prof.nombre);
        profesoresActivos.sort((a: any, b: any) =>
          a.nombre.localeCompare(b.nombre, "es")
        );
        setProfesoresDisponibles(profesoresActivos);
      } catch (error) {
        console.error("Error al cargar profesores:", error);
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
          const mismoCurso = normalizar(grupo.nombreCurso) === normalizar(cursoActual);
          const mismoProfesor = normalizar(grupo.idProfesor) === normalizar(idProfesorFinal);
          const mismaHora = normalizar(grupo.horaClase) === normalizar(hora);
          const mismoDia = normalizar(grupo.diaClase) === normalizar(diaNuevo);
          return mismoCurso && mismoProfesor && mismaHora && mismoDia;
        });
        setGrupoSugerido(coincidencia || null);
      } catch (error) {
        console.error("Error al buscar grupo compatible:", error);
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

      // Validaciones
      if (!data?.alumno?.idAlumno) {
        toast.error("No se encontró el id del alumno");
        return;
      }
      if (!idGrupoOrigenDetectado) {
        toast.error("No se encontró el grupo de origen. Verifica los datos.");
        return;
      }
      if (!fecha || !hora) {
        toast.error("Debes seleccionar fecha y hora");
        return;
      }

      const idGrupoNuevoFinal =
        grupoSugerido?.idGrupo ||
        `VIRTUAL_${cursoActual}_${idProfesorFinal}_${fecha}_${hora}`
          .replace(/\s+/g, "_")
          .replace(/[^A-Za-z0-9_\-]/g, "");

      // Construir fechas en formato ISO con zona horaria local
      const crearFechaLocal = (d: Date, horaStr: string) => {
        const [h = 0, m = 0] = horaStr.split(":").map(Number);
        const fecha = new Date(d);
        fecha.setHours(h, m, 0, 0);
        return fecha; // Devuelve objeto Date, no string
      };

      const fechaOriginal = data.clase?.date ? new Date(data.clase.date) : new Date();
      const horaClaseOrigen = String(data.clase?.startTime || "00:00").trim();
      const fechaOriginalDate = crearFechaLocal(fechaOriginal, horaClaseOrigen);

      const [anio, mes, dia] = fecha.split("-").map(Number);
      const fechaNuevaDate = crearFechaLocal(new Date(anio, mes - 1, dia), hora);

      const payload = {
        idAlumno: data.alumno.idAlumno,
        nombreAlumno: data.alumno.nombreAlumno || "",
        idGrupoOrigen: idGrupoOrigenDetectado,
        idGrupoNuevo: idGrupoNuevoFinal,
        nombreCurso: cursoActual,
        profesorOriginal: profesorOriginal,
        profesorNuevo: profesorFinal,
        idProfesorOriginal: idProfesorOriginal,
        idProfesorNuevo: idProfesorFinal,
        fechaHoraOriginal: fechaOriginalDate.toISOString(),
        fechaHoraNueva: fechaNuevaDate.toISOString(),
        duracion: duracion,
        modalidad: modalidad,
        tipoReagendacion: tipoReagendacion,
        comentario: "",
        motivo: grupoSugerido
          ? "Reagendado a grupo existente"
          : "Reagendado a clase virtual",
        estatus: "reagendado",
      };

      const respuesta = await crearReagendacion(payload);
      toast.success(respuesta.mensaje || "Reagendación creada correctamente");
      if (onSuccess) onSuccess();
      else onClose();
    } catch (error: any) {
      console.error("Error en handleSubmit:", error);
      // Si el error es 409 (conflicto), mostrar mensaje específico
      if (error.message?.includes("profesor ya tiene") || error.message?.includes("alumno ya tiene")) {
        toast.error(`⚠️ ${error.message}`);
      } else {
        toast.error(error?.message || "Error al guardar la reagendación");
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEnviarMensaje = async () => {
    const mensaje = `Hola equipo

Se solicita reagendación:

Alumno: ${data?.alumno?.nombreAlumno || ""}
Curso: ${cursoActual}
Profesor actual: ${profesorOriginal}
Horario original: ${formatMexicoTimeRange(data?.clase?.startTime, data?.duracion)}

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
      await navigator.clipboard.writeText(mensaje);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(mensaje)}`,
        "_blank"
      );
    } catch (error) {
      console.error("Error al generar mensaje:", error);
      toast.error("No se pudo generar el mensaje");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border-4 border-[#F8B50E]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#F8B50E] to-[#FFD700] rounded-full flex items-center justify-center text-2xl">
            🔄
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#F8B50E] to-[#FFA500]">
              Reprogramación de Clase
            </h2>
            <p className="text-sm text-gray-600">
              Alumno: <span className="font-bold text-[#26AAA3]">{data?.alumno?.nombreAlumno || ""}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <h3 className="font-bold text-blue-900 mb-2">📌 Clase Original</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">Materia:</span> {cursoActual}</p>
              <p><span className="font-semibold">Profesor:</span> {profesorOriginal}</p>
              <p><span className="font-semibold">Horario:</span> {formatMexicoTimeRange(data?.clase?.startTime, data?.duracion)}</p>
              <p><span className="font-semibold">Grupo:</span> <code className="bg-gray-200 px-1 rounded">{idGrupoOrigenDetectado}</code></p>
              <p><span className="font-semibold">Modalidad:</span> {data?.alumno?.modalidad || 'Presencial'}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 p-4 rounded-xl">
            <h3 className="font-bold text-gray-900 mb-2">✏️ Nueva Configuración</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600">Hora</label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600">Duración</label>
                  <select
                    value={duracion}
                    onChange={(e) => setDuracion(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
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
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600">Modalidad</label>
                  <select
                    value={modalidad}
                    onChange={(e) => setModalidad(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600">Profesor Nuevo</label>
                  <select
                    value={idProfesorNuevo}
                    onChange={(e) => setIdProfesorNuevo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                  >
                    <option value="">Seleccionar</option>
                    {profesoresDisponibles.map((prof) => (
                      <option key={prof.idProfesor} value={prof.idProfesor}>
                        {prof.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tipo de reagendación */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Reagendación</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoReagendacion("temporal")}
              className={`p-3 rounded-xl border-2 transition-all ${
                tipoReagendacion === "temporal"
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <div className="font-bold text-lg">⏰ Temporal</div>
              <div className="text-xs">Solo esta clase</div>
            </button>
            <button
              type="button"
              onClick={() => setTipoReagendacion("permanente")}
              className={`p-3 rounded-xl border-2 transition-all ${
                tipoReagendacion === "permanente"
                  ? "border-green-500 bg-green-50 text-green-700 shadow-md"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <div className="font-bold text-lg">♻️ Permanente</div>
              <div className="text-xs">Cambio definitivo</div>
            </button>
          </div>
        </div>

        {/* Grupo sugerido */}
        <div className="mb-4">
          {buscandoGrupo ? (
            <div className="bg-blue-50 border border-blue-300 text-blue-700 p-3 rounded-xl text-sm font-semibold flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              Buscando grupo compatible...
            </div>
          ) : grupoSugerido ? (
            <div className="bg-green-50 border border-green-300 text-green-900 p-3 rounded-xl text-sm">
              <div className="font-bold mb-1">✅ Grupo existente encontrado</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div><span className="font-semibold">ID:</span> {grupoSugerido.idGrupo}</div>
                <div><span className="font-semibold">Curso:</span> {grupoSugerido.nombreCurso}</div>
                <div><span className="font-semibold">Profesor:</span> {grupoSugerido.nombreProfesor}</div>
                <div><span className="font-semibold">Día/Hora:</span> {grupoSugerido.diaClase} {grupoSugerido.horaClase}</div>
              </div>
            </div>
          ) : fecha && hora ? (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-xl text-sm font-semibold">
              ⚠️ No se encontró grupo compatible. Se creará una clase reagendada nueva.
            </div>
          ) : (
            <div className="bg-gray-100 border border-gray-200 text-gray-500 p-3 rounded-xl text-sm">
              Selecciona fecha, hora y profesor para buscar un grupo compatible.
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
          <button
            onClick={handleEnviarMensaje}
            className="border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
          >
            <span>💬</span> WhatsApp Profesores
          </button>
          <button
            onClick={onClose}
            className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-full font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 px-6 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {guardando ? "⏳ Guardando..." : "✅ Confirmar Reagendación"}
          </button>
        </div>
      </div>
    </div>
  );
}