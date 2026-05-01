import { useEffect, useMemo, useState } from "react";
import {
  crearGrupoConAlumno,
  getAlumnos,
  getCursos,
  getProfesores,
  getGrupos,
} from "../../services/api";

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
    Boolean(modalidad) &&
    Number(capacidadMaxima) > 0 &&
    !conflictoHorario &&
    (modoAlumno === "existente"
      ? Boolean(alumnoSeleccionado)
      : Boolean(nombreAlumnoNuevo.trim()));

  const handleGuardar = async () => {
    try {
      setGuardando(true);

      if (!cursoSeleccionado?.nombreCurso) {
        alert("Debes seleccionar un curso");
        return;
      }

      if (!idProfesor || !profesorSeleccionado) {
        alert("Debes seleccionar un profesor");
        return;
      }

      if (!diaClase) {
        alert("Debes seleccionar el día de clase");
        return;
      }

      if (!horaClase) {
        alert("Debes seleccionar la hora de clase");
        return;
      }

      if (!modalidad) {
        alert("Debes seleccionar la modalidad");
        return;
      }

      if (!capacidadMaxima || Number(capacidadMaxima) <= 0) {
        alert("Debes indicar una capacidad válida");
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
          alert("Debes seleccionar un alumno existente");
          return;
        }

        payload.alumnoExistente = {
          idAlumno: alumnoSeleccionado.idAlumno,
          nombreAlumno: alumnoSeleccionado.nombreAlumno,
        };
      } else {
        if (!nombreAlumnoNuevo.trim()) {
          alert("Debes capturar el nombre del alumno");
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

      const respuesta = await crearGrupoConAlumno(payload);
      console.log("Grupo con alumno creado:", respuesta);

      alert("Grupo creado e inscripción realizada correctamente");

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error("Error al crear grupo con alumno:", error);
      alert(error.message || "Error al crear grupo con alumno");
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
      <div className="bg-white w-[760px] rounded-xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Crear grupo nuevo e inscribir alumno</h2>

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

        {/* Sección de validación de conflictos */}
        {idProfesor && diaClase && horaClase && (
          <div className="mb-4 space-y-3">
            {conflictoHorario && (
              <div className="bg-red-100 border border-red-400 text-red-800 p-4 rounded">
                <h4 className="font-semibold mb-2">⚠️ Conflicto de horario detectado</h4>
                <p className="text-sm mb-2">
                  El profesor <b>{profesorSeleccionado?.nombre}</b> ya tiene una clase asignada:
                </p>
                <div className="bg-white p-3 rounded text-sm">
                  <p><b>Curso:</b> {conflictoHorario.nombreCurso}</p>
                  <p><b>Día:</b> {conflictoHorario.diaClase}</p>
                  <p><b>Horario:</b> {conflictoHorario.horaInicio} - {conflictoHorario.horaFin}</p>
                </div>
                <p className="text-sm mt-2">
                  Por favor, selecciona otro horario para el profesor o elige a otro profesor.
                </p>
              </div>
            )}

            {!conflictoHorario && clasesDelProfesor.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded">
                <h4 className="font-semibold mb-2">ℹ️ Clases del profesor en {diaClase}</h4>
                <div className="space-y-2">
                  {clasesDelProfesor.map((clase: any, idx: number) => {
                    const horaIni = horaAMinutos(clase.horaClase);
                    const durMin = duracionAMinutos(clase.duracionClase || "2 horas");
                    const horaFi = horaIni + durMin;
                    return (
                      <div key={idx} className="bg-white p-2 rounded text-sm">
                        <p><b>{clase.nombreCurso}</b> - {minutoAHora(horaIni)} a {minutoAHora(horaFi)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!conflictoHorario && clasesDelProfesor.length === 0 && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded text-sm">
                ✓ El horario seleccionado está disponible. No hay conflictos.
              </div>
            )}
          </div>
        )}

        <div className="bg-yellow-100 text-yellow-800 p-3 rounded mb-4 text-sm">
          Antes de crear el grupo, el sistema validará si ya existe otro con el
          mismo curso, profesor, día y hora.
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || !puedeGuardarGrupo}
            className={`px-4 py-2 rounded text-white ${
              guardando || !puedeGuardarGrupo
                ? "bg-emerald-300 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            {guardando ? "Guardando..." : "Crear grupo e inscribir"}
          </button>
        </div>
      </div>
    </div>
  );
}