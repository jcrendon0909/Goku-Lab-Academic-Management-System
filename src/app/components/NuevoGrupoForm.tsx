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
  const [capacidadMaxima, setCapacidadMaxima] = useState("8");
  const [fechaCreacion, setFechaCreacion] = useState(() => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [modalidadAlumno, setModalidadAlumno] = useState<"Presencial" | "Virtual">(
    "Presencial"
  );
  const [montoMensualidad, setMontoMensualidad] = useState("");
  const [fechaPago, setFechaPago] = useState(() => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [comentariosPago, setComentariosPago] = useState("");

  const [nombreAlumnoNuevo, setNombreAlumnoNuevo] = useState("");
  const [telefonoAlumnoNuevo, setTelefonoAlumnoNuevo] = useState("");
  const [tutorAlumnoNuevo, setTutorAlumnoNuevo] = useState("");
  const [observacionesAlumnoNuevo, setObservacionesAlumnoNuevo] = useState("");

  const [conflictoHorario, setConflictoHorario] = useState<any>(null);
  const [clasesDelProfesor, setClasesDelProfesor] = useState<any[]>([]);

  // Funciones auxiliares para validación
  const horaAMinutos = (hora: string): number => {
    const [h, m] = String(hora).split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const duracionAMinutos = (duracion: string): number => {
    const dur = String(duracion || "2 horas").toLowerCase().trim();
    
    if (dur.includes(":")) {
      const [h, m] = dur.split(":").map(Number);
      return h * 60 + (m || 0);
    }
    
    if (dur.includes("1") && dur.includes("3")) return 90;
    if (dur.includes("2") && dur.includes("3")) return 150;
    if (dur.includes("3") && dur.includes("3")) return 210;
    if (dur.includes("3")) return 180;
    if (dur.includes("2")) return 120;
    if (dur.includes("1")) return 60;
    
    return 120;
  };

  const minutoAHora = (minutos: number): string => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const validarConflictosHorario = (
    profesorId: string,
    dia: string,
    horaI: string,
    duracion: string
  ) => {
    if (!profesorId || !dia || !horaI) {
      setConflictoHorario(null);
      setClasesDelProfesor([]);
      return;
    }

    const horaInicio = horaAMinutos(horaI);
    const duracionMin = duracionAMinutos(duracion);
    const horaFin = horaInicio + duracionMin;

    // Filtrar grupos del profesor en ese día
    const clasesEnDia = grupos.filter((grupo: any) => {
      const idProfesorNorm = normalizar(String(grupo.idProfesor || grupo.IdProfesor || "").trim());
      const profesorIdNorm = normalizar(profesorId);
      const diaNorm = normalizar(grupo.diaClase || "");
      
      return (
        idProfesorNorm === profesorIdNorm &&
        diaNorm === normalizar(dia) &&
        normalizar(grupo.Estatus || grupo.estatus || "Activo") === "ACTIVO"
      );
    });

    setClasesDelProfesor(clasesEnDia);

    // Verificar empalmes
    let conflicto = null;
    for (const clase of clasesEnDia) {
      const horaExistenteInicio = horaAMinutos(clase.horaClase);
      const duracionExistente = duracionAMinutos(clase.duracionClase || "2 horas");
      const horaExistenteFin = horaExistenteInicio + duracionExistente;

      // Hay empalme si: inicio < fin_existente Y fin > inicio_existente
      if (horaInicio < horaExistenteFin && horaFin > horaExistenteInicio) {
        conflicto = {
          nombreCurso: clase.nombreCurso,
          horaInicio: minutoAHora(horaExistenteInicio),
          horaFin: minutoAHora(horaExistenteFin),
          diaClase: clase.diaClase,
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
    Number(capacidadMaxima) > 0 &&
    Number(montoMensualidad) > 0 &&
    Boolean(fechaPago) &&
    !conflictoHorario &&
    (modoAlumno === "existente"
      ? Boolean(alumnoSeleccionado)
      : Boolean(nombreAlumnoNuevo.trim()));

  const handleGuardar = async () => {
    try {
      setGuardando(true);

      // Validación: que no haya conflicto de horario
      if (conflictoHorario) {
        toast.error("No se puede crear el grupo debido a un conflicto de horario", {
          description: `El profesor ya tiene una clase a esa hora`,
          duration: 5000,
        });
        setGuardando(false);
        return;
      }

      if (!cursoSeleccionado?.nombreCurso) {
        toast.error("Selecciona un curso");
        setGuardando(false);
        return;
      }

      if (!idProfesor || !profesorSeleccionado) {
        toast.error("Selecciona un profesor");
        setGuardando(false);
        return;
      }

      if (!diaClase) {
        toast.error("Selecciona el día de clase");
        setGuardando(false);
        return;
      }

      if (!horaClase) {
        toast.error("Selecciona la hora de clase");
        setGuardando(false);
        return;
      }

      if (!capacidadMaxima || Number(capacidadMaxima) <= 0) {
        toast.error("Indica una capacidad válida");
        setGuardando(false);
        return;
      }

      const montoPagoNumero = Number(montoMensualidad);

      if (!montoMensualidad || !Number.isFinite(montoPagoNumero) || montoPagoNumero <= 0) {
        toast.error("Captura un monto de mensualidad valido");
        setGuardando(false);
        return;
      }

      if (!fechaPago) {
        toast.error("Captura la fecha de pago");
        setGuardando(false);
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
          capacidadMaxima: Number(capacidadMaxima),
          Estatus: "Activo",
          fechaCreacion,
        },
        datosPago: {
          montoMensualidad: montoPagoNumero,
          fechaPago,
          comentarios: comentariosPago,
        },
      };

      if (modoAlumno === "existente") {
        if (!alumnoSeleccionado?.idAlumno) {
          toast.error("Selecciona un alumno existente");
          setGuardando(false);
          return;
        }

        payload.alumnoExistente = {
          idAlumno: alumnoSeleccionado.idAlumno,
          nombreAlumno: alumnoSeleccionado.nombreAlumno,
          modalidad: modalidadAlumno,
        };
      } else {
        if (!nombreAlumnoNuevo.trim()) {
          toast.error("Captura el nombre del alumno");
          setGuardando(false);
          return;
        }

        payload.alumnoNuevo = {
          nombreAlumno: nombreAlumnoNuevo.trim(),
          telefono: telefonoAlumnoNuevo,
          tutor: tutorAlumnoNuevo,
          observaciones: observacionesAlumnoNuevo,
          estatus: "Activo",
          modalidad: modalidadAlumno,
        };
      }

      const respuesta = await crearGrupoConAlumno(payload);
      console.log("Grupo con alumno creado:", respuesta);

      toast.success("Grupo creado e inscripción realizada correctamente", {
        description: `Grupo: ${cursoSeleccionado.nombreCurso} - ${diaClase} ${horaClase}`,
        duration: 4000,
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error("Error al crear grupo con alumno:", error);
      
      // Manejo de errores específicos del servidor
      let mensajeError = error.message || "Error al crear el grupo";
      
      // Si el error contiene información de conflicto del servidor
      if (error.message && error.message.includes("empalme")) {
        toast.error("⚠️ Conflicto de horario detectado", {
          description: error.message,
          duration: 6000,
        });
      } else if (error.message && error.message.includes("Ya existe")) {
        toast.error("El grupo ya existe", {
          description: error.message,
          duration: 5000,
        });
      } else {
        toast.error("Error al crear el grupo", {
          description: mensajeError,
          duration: 5000,
        });
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoCatalogos) {
    return (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-white rounded-xl p-6 shadow-lg w-[95vw] max-w-5xl">
          Cargando formulario...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-[95vw] max-w-6xl rounded-xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Crear grupo nuevo e inscribir alumno</h2>

        <p className="text-sm text-gray-500 mb-6">
          Captura los datos del grupo y selecciona si el alumno ya existe o si
          será un registro nuevo.
        </p>

        <div className="bg-gray-100 rounded-lg p-4 mb-5">
          <h3 className="font-semibold mb-3">Datos del grupo</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de creación del grupo
              </label>
              <input
                type="date"
                value={fechaCreacion}
                onChange={(e) => setFechaCreacion(e.target.value)}
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
                  Modalidad del alumno
                </label>
                <select
                  value={modalidadAlumno}
                  onChange={(e) =>
                    setModalidadAlumno(e.target.value as "Presencial" | "Virtual")
                  }
                  className="w-full border p-2 rounded"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                </select>
              </div>

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
                  <b>Alumno seleccionado:</b> {alumnoSeleccionado.nombreAlumno} (
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modalidad del alumno
                </label>
                <select
                  value={modalidadAlumno}
                  onChange={(e) =>
                    setModalidadAlumno(e.target.value as "Presencial" | "Virtual")
                  }
                  className="w-full border p-2 rounded"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del alumno
                </label>
                <input
                  type="text"
                  value={nombreAlumnoNuevo}
                  onChange={(e) => setNombreAlumnoNuevo(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefonoAlumnoNuevo}
                  onChange={(e) => setTelefonoAlumnoNuevo(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tutor
                </label>
                <input
                  type="text"
                  value={tutorAlumnoNuevo}
                  onChange={(e) => setTutorAlumnoNuevo(e.target.value)}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={observacionesAlumnoNuevo}
                  onChange={(e) => setObservacionesAlumnoNuevo(e.target.value)}
                  rows={3}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 mb-5">
          <h3 className="font-semibold mb-3 text-gray-900">Datos de pago</h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto de mensualidad
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={montoMensualidad}
                onChange={(e) => setMontoMensualidad(e.target.value)}
                placeholder="0.00"
                className="w-full border p-2 rounded bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de pago
              </label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full border p-2 rounded bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comentarios
              <span className="text-xs font-normal text-gray-500"> para calendario</span>
            </label>
            <textarea
              value={comentariosPago}
              onChange={(e) => setComentariosPago(e.target.value)}
              rows={3}
              className="w-full border p-2 rounded bg-white"
            />
          </div>
        </div>

        {/* Sección de validación de conflictos */}
        {idProfesor && diaClase && horaClase && (
          <div className="mb-4 space-y-3">
            {conflictoHorario && (
              <div className="bg-red-50 border-2 border-red-400 text-red-900 p-4 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-2">⚠️ Conflicto de horario detectado</h4>
                    <p className="text-sm mb-3">
                      El profesor <b>{profesorSeleccionado?.nombre}</b> ya tiene una clase asignada en este horario y no puede darse otra clase que se empalme:
                    </p>
                    <div className="bg-red-100 border border-red-300 p-3 rounded text-sm mb-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">CURSO EXISTENTE</p>
                          <p className="font-bold">{conflictoHorario.nombreCurso}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">DÍA</p>
                          <p className="font-bold">{conflictoHorario.diaClase}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-600 font-semibold">HORARIO OCUPADO</p>
                          <p className="font-bold text-lg">{conflictoHorario.horaInicio} - {conflictoHorario.horaFin}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold bg-red-100 p-2 rounded">
                      ❌ No se puede crear este grupo. Por favor, selecciona otro horario para el profesor o elige a otro profesor.
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
                    <h4 className="font-bold mb-2">📅 Otras clases del profesor en {diaClase}</h4>
                    <p className="text-sm mb-3">El profesor tiene las siguientes clases este día (sin conflictos):</p>
                    <div className="space-y-2">
                      {clasesDelProfesor.map((clase: any, idx: number) => {
                        const horaIni = horaAMinutos(clase.horaClase);
                        const durMin = duracionAMinutos(clase.duracionClase || "2 horas");
                        const horaFi = horaIni + durMin;
                        return (
                          <div key={idx} className="bg-white border border-amber-200 p-2 rounded text-sm">
                            <p><b>{clase.nombreCurso}</b></p>
                            <p className="text-amber-700">🕐 {minutoAHora(horaIni)} - {minutoAHora(horaFi)}</p>
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
                    <h4 className="font-bold mb-1">✅ Horario disponible</h4>
                    <p className="text-sm">
                      El profesor <b>{profesorSeleccionado?.nombre}</b> no tiene clases el <b>{diaClase}</b> a las <b>{horaClase}</b>. El horario está disponible.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-300 text-blue-900 p-3 rounded mb-4 text-sm">
          <p className="font-semibold mb-1">🔍 Validación automática</p>
          <ul className="text-xs space-y-1 list-disc list-inside">
            <li>El sistema valida si ya existe otro grupo con el mismo curso, profesor, día y hora.</li>
            <li>También verifica que el profesor no tenga clases que se empalmen en ese horario.</li>
            <li>Si hay conflictos, el grupo <b>no podrá ser creado</b>.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2">
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
            title={
              conflictoHorario
                ? "No se puede crear: existe un conflicto de horario"
                : !puedeGuardarGrupo
                ? "Completa todos los campos requeridos"
                : "Crear grupo e inscribir al alumno"
            }
          >
            {conflictoHorario && "⚠️ Conflicto detectado"}
            {!conflictoHorario && (guardando ? "⏳ Guardando..." : "✓ Crear grupo e inscribir")}
          </button>
        </div>
      </div>
    </div>
  );
}
