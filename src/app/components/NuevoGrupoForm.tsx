import { useEffect, useMemo, useState } from "react";
import {
  crearGrupoConAlumno,
  getAlumnos,
  getCursos,
  getProfesores,
  getGrupos,
} from "../../services/api";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface NuevoGrupoFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function normalizar(valor: string) {
  return String(valor || "").trim().toUpperCase();
}

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function NuevoGrupoForm({
  onClose,
  onSuccess,
}: NuevoGrupoFormProps) {
  const [cursos, setCursos] = useState<any[]>([]);
  const [profesores, setProfesores] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [alumnosEncontrados, setAlumnosEncontrados] = useState<any[]>([]);

  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modoAlumno, setModoAlumno] = useState<"existente" | "nuevo">(
    "existente"
  );

  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any | null>(null);

  const [cursoSeleccionado, setCursoSeleccionado] = useState<any | null>(null);
  const [idProfesor, setIdProfesor] = useState("");
  const [diaClase, setDiaClase] = useState("");
  const [horaClase, setHoraClase] = useState("");
  const [duracionClase, setDuracionClase] = useState("2 horas");
  const [modalidad, setModalidad] = useState("Presencial");
  const [capacidadMaxima, setCapacidadMaxima] = useState("8");

  const [nombreAlumnoNuevo, setNombreAlumnoNuevo] = useState("");
  const [telefonoAlumnoNuevo, setTelefonoAlumnoNuevo] = useState("");
  const [tutorAlumnoNuevo, setTutorAlumnoNuevo] = useState("");
  const [observacionesAlumnoNuevo, setObservacionesAlumnoNuevo] = useState("");

  const [conflictoHorario, setConflictoHorario] = useState<any>(null);
  const [clasesDelProfesor, setClasesDelProfesor] = useState<any[]>([]);

  const obtenerIdProfesorGrupo = (grupo: any): string => {
    return String(
      grupo?.idProfesor ||
        grupo?.IdProfesor ||
        grupo?.profesorId ||
        grupo?.ProfesorId ||
        grupo?.id_profesor ||
        ""
    ).trim();
  };

  const obtenerHoraGrupo = (grupo: any): string => {
  const valor =
    grupo?.horaClase ||
    grupo?.["horaClase "] ||
    grupo?.HoraClase ||
    grupo?.hora ||
    grupo?.Hora ||
    grupo?.horario ||
    grupo?.Horario ||
    grupo?.startTime ||
    grupo?.horaInicio ||
    grupo?.HoraInicio ||
    grupo?.["Hora Clase"] ||
    grupo?.["hora clase"] ||
    grupo?.["Hora de clase"] ||
    grupo?.["hora de clase"] ||
    "";

  const texto = String(valor || "").trim().toUpperCase();

  const match = texto.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (!match) return "";

  let h = Number(match[1]);
  const m = Number(match[2]);
  const periodo = match[3];

  if (periodo === "PM" && h < 12) h += 12;
  if (periodo === "AM" && h === 12) h = 0;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

  const obtenerDiaGrupo = (grupo: any): string => {
    return String(
      grupo?.diaClase ||
        grupo?.DiaClase ||
        grupo?.dia ||
        grupo?.Dia ||
        grupo?.dia_clase ||
        ""
    ).trim();
  };

  const obtenerCursoGrupo = (grupo: any): string => {
    return String(
      grupo?.nombreCurso ||
        grupo?.NombreCurso ||
        grupo?.curso ||
        grupo?.Curso ||
        "Curso sin nombre"
    ).trim();
  };

  const obtenerDuracionGrupo = (grupo: any): string => {
    return String(
      grupo?.duracionClase ||
        grupo?.DuracionClase ||
        grupo?.duracion ||
        grupo?.Duracion ||
        "2 horas"
    ).trim();
  };

  const horaAMinutos = (hora: string): number | null => {
    if (!hora) return null;

    const texto = String(hora).trim().toUpperCase();
    const match = texto.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);

    if (!match) return null;

    let h = Number(match[1]);
    const m = Number(match[2]);
    const periodo = match[3];

    if (periodo === "PM" && h < 12) h += 12;
    if (periodo === "AM" && h === 12) h = 0;

    if (isNaN(h) || isNaN(m)) return null;

    return h * 60 + m;
  };

  const duracionAMinutos = (duracion: string): number => {
    const dur = String(duracion || "2 horas").toLowerCase().trim();

    if (dur.includes(":")) {
      const [h, m] = dur.split(":").map(Number);
      return h * 60 + (m || 0);
    }

    if (dur.includes("1") && dur.includes("30")) return 90;
    if (dur.includes("2") && dur.includes("30")) return 150;
    if (dur.includes("3") && dur.includes("30")) return 210;
    if (dur.includes("3")) return 180;
    if (dur.includes("2")) return 120;
    if (dur.includes("1")) return 60;

    return 120;
  };

  const minutoAHora = (minutos: number | null): string => {
    if (minutos === null || isNaN(minutos)) return "Horario no disponible";

    const h = Math.floor(minutos / 60);
    const m = minutos % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const validarConflictosHorario = (
    profesorId: string,
    dia: string,
    horaNueva: string,
    duracionNueva: string
  ) => {
    if (!profesorId || !dia || !horaNueva) {
      setConflictoHorario(null);
      setClasesDelProfesor([]);
      return;
    }

    const inicioNuevo = horaAMinutos(horaNueva);

    if (inicioNuevo === null) {
      setConflictoHorario(null);
      setClasesDelProfesor([]);
      return;
    }

    const finNuevo = inicioNuevo + duracionAMinutos(duracionNueva);

    const clasesEnDia = grupos.filter((grupo: any) => {
      const mismoProfesor =
        normalizar(obtenerIdProfesorGrupo(grupo)) === normalizar(profesorId);

      const mismoDia =
        normalizar(obtenerDiaGrupo(grupo)) === normalizar(dia);

      const activo =
        normalizar(grupo?.Estatus || grupo?.estatus || "Activo") === "ACTIVO";

      return mismoProfesor && mismoDia && activo;
    });

    setClasesDelProfesor(clasesEnDia);

    let conflicto = null;

    for (const clase of clasesEnDia) {
      const horaExistente = obtenerHoraGrupo(clase);
      const inicioExistente = horaAMinutos(horaExistente);

      if (inicioExistente === null) {
        continue;
      }

      const finExistente =
        inicioExistente + duracionAMinutos(obtenerDuracionGrupo(clase));

      const hayEmpalme =
        inicioNuevo < finExistente && finNuevo > inicioExistente;

      if (hayEmpalme) {
        conflicto = {
          nombreCurso: obtenerCursoGrupo(clase),
          diaClase: obtenerDiaGrupo(clase),
          horaInicio: minutoAHora(inicioExistente),
          horaFin: minutoAHora(finExistente),
          nuevoInicio: minutoAHora(inicioNuevo),
          nuevoFin: minutoAHora(finNuevo),
        };
        break;
      }
    }

    setConflictoHorario(conflicto);
  };

  useEffect(() => {
    validarConflictosHorario(idProfesor, diaClase, horaClase, duracionClase);
  }, [idProfesor, diaClase, horaClase, duracionClase, grupos]);

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        setCargandoCatalogos(true);

        const [cursosResp, profesoresResp, gruposResp] = await Promise.all([
          getCursos(),
          getProfesores(),
          getGrupos(),
        ]);

        const cursosActivos = (cursosResp || [])
          .map((curso: any) => ({
            idCurso: curso.idCurso || curso.IdCurso || "",
            nombreCurso: curso.nombreCurso || curso.nombre || "",
            estatus: curso.estatus || curso.Estatus || "Activo",
          }))
          .filter(
            (curso: any) =>
              curso.nombreCurso &&
              ["ACTIVO", ""].includes(normalizar(curso.estatus))
          )
          .sort((a: any, b: any) =>
            a.nombreCurso.localeCompare(b.nombreCurso, "es")
          );

        const profesoresActivos = (profesoresResp || [])
          .map((prof: any) => ({
            idProfesor: prof.idProfesor || prof.IdProfesor || "",
            nombre: prof.nombre || prof.nombreProfesor || "",
            estatus: prof.estatus || prof.Estatus || "Activo",
          }))
          .filter(
            (prof: any) =>
              prof.nombre &&
              ["ACTIVO", ""].includes(normalizar(prof.estatus))
          )
          .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, "es"));

        setCursos(cursosActivos);
        setProfesores(profesoresActivos);
        setGrupos(gruposResp || []);
      } catch (error) {
        console.error("Error al cargar cursos/profesores/grupos:", error);
        setCursos([]);
        setProfesores([]);
        setGrupos([]);
      } finally {
        setCargandoCatalogos(false);
      }
    };

    cargarCatalogos();
  }, []);

  useEffect(() => {
    const buscarAlumnos = async () => {
      if (modoAlumno !== "existente") return;

      try {
        setBuscandoAlumnos(true);
        const alumnos = await getAlumnos(busquedaAlumno);
        setAlumnosEncontrados(alumnos || []);
      } catch (error) {
        console.error("Error al buscar alumnos:", error);
        setAlumnosEncontrados([]);
      } finally {
        setBuscandoAlumnos(false);
      }
    };

    buscarAlumnos();
  }, [busquedaAlumno, modoAlumno]);

  useEffect(() => {
    if (modoAlumno === "nuevo") {
      setAlumnoSeleccionado(null);
    }
  }, [modoAlumno]);

  const profesorSeleccionado = useMemo(
    () =>
      profesores.find(
        (prof: any) => normalizar(prof.idProfesor) === normalizar(idProfesor)
      ) || null,
    [profesores, idProfesor]
  );

  const puedeGuardarGrupo =
    Boolean(cursoSeleccionado?.nombreCurso) &&
    Boolean(idProfesor) &&
    Boolean(diaClase) &&
    Boolean(horaClase) &&
    Boolean(modalidad) &&
    Number(capacidadMaxima) > 0 &&
    !conflictoHorario &&
    (modoAlumno === "existente"
      ? Boolean(alumnoSeleccionado)
      : Boolean(nombreAlumnoNuevo.trim()));

  const handleGuardar = async () => {
    try {
      setGuardando(true);

      if (conflictoHorario) {
        toast.error("No se puede crear el grupo", {
          description: "Existe un conflicto de horario con otra clase.",
          duration: 5000,
        });
        return;
      }

      if (!cursoSeleccionado?.nombreCurso) {
        toast.error("Selecciona un curso");
        return;
      }

      if (!idProfesor || !profesorSeleccionado) {
        toast.error("Selecciona un profesor");
        return;
      }

      if (!diaClase) {
        toast.error("Selecciona el día de clase");
        return;
      }

      if (!horaClase) {
        toast.error("Selecciona la hora de clase");
        return;
      }

      if (!modalidad) {
        toast.error("Selecciona la modalidad");
        return;
      }

      if (!capacidadMaxima || Number(capacidadMaxima) <= 0) {
        toast.error("Indica una capacidad válida");
        return;
      }

      const payload: any = {
        grupo: {
          idCurso: cursoSeleccionado.idCurso || "",
          nombreCurso: cursoSeleccionado.nombreCurso,
          diaClase,
          horaClase,
          duracionClase,
          idProfesor: profesorSeleccionado.idProfesor || "",
          nombreProfesor: profesorSeleccionado.nombre,
          modalidad,
          capacidadMaxima: Number(capacidadMaxima),
          Estatus: "Activo",
        },
      };

      if (modoAlumno === "existente") {
        if (!alumnoSeleccionado?.idAlumno) {
          toast.error("Selecciona un alumno existente");
          return;
        }

        payload.alumnoExistente = {
          idAlumno: alumnoSeleccionado.idAlumno,
          nombreAlumno: alumnoSeleccionado.nombreAlumno,
        };
      } else {
        if (!nombreAlumnoNuevo.trim()) {
          toast.error("Captura el nombre del alumno");
          return;
        }

        payload.alumnoNuevo = {
          nombreAlumno: nombreAlumnoNuevo.trim(),
          telefono: telefonoAlumnoNuevo,
          tutor: tutorAlumnoNuevo,
          observaciones: observacionesAlumnoNuevo,
          estatus: "Activo",
        };
      }

      await crearGrupoConAlumno(payload);

      toast.success("Grupo creado e inscripción realizada correctamente", {
        description: `Grupo: ${cursoSeleccionado.nombreCurso} - ${diaClase} ${horaClase}`,
        duration: 4000,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error al crear grupo con alumno:", error);

      toast.error("Error al crear el grupo", {
        description: error.message || "Ocurrió un error inesperado.",
        duration: 5000,
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoCatalogos) {
    return (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-white rounded-xl p-6 shadow-lg w-[700px]">
          Cargando formulario...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-[820px] rounded-xl shadow-lg max-h-[88vh] overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-2">
            Crear grupo nuevo e inscribir alumno
          </h2>

          <p className="text-sm text-gray-500 mb-6">
            Captura los datos del grupo y selecciona si el alumno ya existe o si
            será un registro nuevo.
          </p>

          <div className="bg-gray-100 rounded-lg p-4 mb-5">
            <h3 className="font-semibold mb-3">Datos del grupo</h3>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curso
                </label>
                <select
                  value={cursoSeleccionado?.idCurso || ""}
                  onChange={(e) => {
                    const curso =
                      cursos.find(
                        (c: any) =>
                          normalizar(c.idCurso) === normalizar(e.target.value)
                      ) || null;
                    setCursoSeleccionado(curso);
                  }}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Selecciona curso</option>
                  {cursos.map((curso: any) => (
                    <option key={curso.idCurso} value={curso.idCurso}>
                      {curso.nombreCurso}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profesor
                </label>
                <select
                  value={idProfesor}
                  onChange={(e) => setIdProfesor(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Selecciona profesor</option>
                  {profesores.map((profesor: any) => (
                    <option key={profesor.idProfesor} value={profesor.idProfesor}>
                      {profesor.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Día
                </label>
                <select
                  value={diaClase}
                  onChange={(e) => setDiaClase(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Selecciona día</option>
                  {DIAS.map((dia) => (
                    <option key={dia} value={dia}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  value={horaClase}
                  onChange={(e) => setHoraClase(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modalidad
                </label>
                <select
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración de la clase
                </label>
                <select
                  value={duracionClase}
                  onChange={(e) => setDuracionClase(e.target.value)}
                  className="w-full border p-2 rounded"
                >
                  <option value="1 hora">1 hora</option>
                  <option value="1:30 hr">1:30 horas</option>
                  <option value="2 horas">2 horas</option>
                  <option value="2:30 horas">2:30 horas</option>
                  <option value="3 horas">3 horas</option>
                  <option value="3:30 horas">3:30 horas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad máxima
                </label>
                <input
                  type="number"
                  min="1"
                  value={capacidadMaxima}
                  onChange={(e) => setCapacidadMaxima(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg p-4 mb-5">
            <h3 className="font-semibold mb-3">Datos del alumno</h3>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setModoAlumno("existente")}
                className={`px-4 py-2 rounded-lg ${
                  modoAlumno === "existente"
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Alumno existente
              </button>

              <button
                type="button"
                onClick={() => setModoAlumno("nuevo")}
                className={`px-4 py-2 rounded-lg ${
                  modoAlumno === "nuevo"
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Alumno nuevo
              </button>
            </div>

            {modoAlumno === "existente" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar alumno
                  </label>
                  <input
                    type="text"
                    value={busquedaAlumno}
                    onChange={(e) => setBusquedaAlumno(e.target.value)}
                    placeholder="Escribe nombre o id del alumno"
                    className="w-full border p-2 rounded"
                  />
                </div>

                {alumnoSeleccionado && (
                  <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 p-3 rounded text-sm">
                    <b>Alumno seleccionado:</b>{" "}
                    {alumnoSeleccionado.nombreAlumno} (
                    {alumnoSeleccionado.idAlumno})
                  </div>
                )}

                <div className="border rounded-lg max-h-64 overflow-y-auto bg-white">
                  {buscandoAlumnos ? (
                    <p className="p-3 text-sm text-gray-500">Buscando...</p>
                  ) : alumnosEncontrados.length > 0 ? (
                    alumnosEncontrados.map((alumno: any) => {
                      const seleccionado =
                        alumnoSeleccionado?.idAlumno === alumno.idAlumno;

                      return (
                        <div
                          key={`${alumno.idAlumno}-${alumno.nombreAlumno}`}
                          onClick={() => setAlumnoSeleccionado(alumno)}
                          className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                            seleccionado ? "bg-cyan-100 border-cyan-300" : ""
                          }`}
                        >
                          <div className="font-medium text-gray-900">
                            {alumno.nombreAlumno}
                          </div>
                          <div className="text-sm text-gray-500">
                            {alumno.idAlumno || "Sin ID"}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-3 text-sm text-gray-500">
                      No se encontraron alumnos
                    </p>
                  )}
                </div>
              </div>
            )}

            {modoAlumno === "nuevo" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={nombreAlumnoNuevo}
                  onChange={(e) => setNombreAlumnoNuevo(e.target.value)}
                  placeholder="Nombre del alumno"
                  className="w-full border p-2 rounded"
                />

                <input
                  type="text"
                  value={telefonoAlumnoNuevo}
                  onChange={(e) => setTelefonoAlumnoNuevo(e.target.value)}
                  placeholder="Teléfono"
                  className="w-full border p-2 rounded"
                />

                <input
                  type="text"
                  value={tutorAlumnoNuevo}
                  onChange={(e) => setTutorAlumnoNuevo(e.target.value)}
                  placeholder="Tutor"
                  className="w-full border p-2 rounded"
                />

                <textarea
                  value={observacionesAlumnoNuevo}
                  onChange={(e) => setObservacionesAlumnoNuevo(e.target.value)}
                  rows={3}
                  placeholder="Observaciones"
                  className="w-full border p-2 rounded"
                />
              </div>
            )}
          </div>

          {idProfesor && diaClase && horaClase && (
            <div className="mb-4 space-y-3">
              {conflictoHorario && (
                <div className="bg-red-50 border-2 border-red-400 text-red-900 p-4 rounded-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-600" />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg mb-2">
                        Conflicto de horario detectado
                      </h4>

                      <p className="text-sm mb-3">
                        El profesor <b>{profesorSeleccionado?.nombre}</b> ya
                        tiene una clase que se empalma con el horario que quieres
                        crear.
                      </p>

                      <div className="bg-red-100 border border-red-300 p-3 rounded text-sm mb-3">
                        <p>
                          <b>Curso existente:</b>{" "}
                          {conflictoHorario.nombreCurso}
                        </p>
                        <p>
                          <b>Día:</b> {conflictoHorario.diaClase}
                        </p>
                        <p>
                          <b>Horario ocupado:</b>{" "}
                          {conflictoHorario.horaInicio} -{" "}
                          {conflictoHorario.horaFin}
                        </p>
                        <p>
                          <b>Nuevo horario:</b>{" "}
                          {conflictoHorario.nuevoInicio} -{" "}
                          {conflictoHorario.nuevoFin}
                        </p>
                      </div>

                      <p className="text-sm font-semibold bg-red-100 p-2 rounded">
                        No se puede crear este grupo. Selecciona otro horario o
                        elige a otro profesor.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!conflictoHorario && clasesDelProfesor.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-600" />
                    <div className="flex-1">
                      <h4 className="font-bold mb-2">
                        Otras clases del profesor en {diaClase}
                      </h4>

                      <p className="text-sm mb-3">
                        El profesor tiene las siguientes clases este día, pero
                        no se empalman con el horario seleccionado:
                      </p>

                      <div className="space-y-2">
                        {clasesDelProfesor.map((clase: any, idx: number) => {
                          const inicio = horaAMinutos(obtenerHoraGrupo(clase));
                          const fin =
                            inicio !== null
                              ? inicio + duracionAMinutos(obtenerDuracionGrupo(clase))
                              : null;

                          return (
                            <div
                              key={idx}
                              className="bg-white border border-amber-200 p-2 rounded text-sm"
                            >
                              <p>
                                <b>{obtenerCursoGrupo(clase)}</b>
                              </p>
                              <p className="text-amber-700">
                                {minutoAHora(inicio)} - {minutoAHora(fin)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!conflictoHorario && clasesDelProfesor.length === 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <h4 className="font-bold mb-1">Horario disponible</h4>
                      <p className="text-sm">
                        El profesor <b>{profesorSeleccionado?.nombre}</b> no
                        tiene clases que se empalmen con este horario.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-300 text-blue-900 p-3 rounded mb-4 text-sm">
            <p className="font-semibold mb-1">Validación automática</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>
                Valida si el profesor ya tiene clases en ese día y horario.
              </li>
              <li>
                Si una clase termina a las 11:00, otra puede iniciar a las
                11:00.
              </li>
              <li>
                Si hay empalme real, el grupo no podrá ser creado.
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white px-6 py-4 flex justify-end gap-2 border-t shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || !puedeGuardarGrupo}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-all ${
              conflictoHorario
                ? "bg-red-500 cursor-not-allowed opacity-60"
                : guardando || !puedeGuardarGrupo
                ? "bg-emerald-300 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 active:scale-95"
            }`}
          >
            {conflictoHorario
              ? "Conflicto detectado"
              : guardando
              ? "Guardando..."
              : "Crear grupo e inscribir"}
          </button>
        </div>
      </div>
    </div>
  );
}