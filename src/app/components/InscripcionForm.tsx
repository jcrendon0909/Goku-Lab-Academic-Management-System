import { useEffect, useMemo, useState } from "react";
import {
  crearAlumno,
  crearInscripcion,
  getAlumnos,
} from "../../services/api";

interface InscripcionFormProps {
  classData: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function InscripcionForm({
  classData,
  onClose,
  onSuccess,
}: InscripcionFormProps) {
  const [modo, setModo] = useState<"existente" | "nuevo">("existente");
  const [busqueda, setBusqueda] = useState("");
  const [alumnosEncontrados, setAlumnosEncontrados] = useState<any[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any | null>(null);

  const [nombreAlumno, setNombreAlumno] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tutor, setTutor] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [modalidad, setModalidad] = useState("Presencial");
  const [fechaInscripcion, setFechaInscripcion] = useState<string>("");
  const [montoMensualidad, setMontoMensualidad] = useState("");
  const [fechaPago, setFechaPago] = useState<string>("");

  const [guardando, setGuardando] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const grupoId = useMemo(() => {
    if (!classData) return "";

    return (
      classData?.idGrupo ||
      classData?.IdGrupo ||
      classData?.grupoId ||
      classData?.GrupoId ||
      classData?.id_grupo ||
      classData?.id ||
      ""
    );
  }, [classData]);

  // Valor para el input tipo="date" (YYYY-MM-DD)
  const toDateInputValue = (value: any) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    // Default: día de la clase seleccionada en el calendario.
    if (classData?.date) {
      setFechaInscripcion(toDateInputValue(classData.date));
      setFechaPago((actual) => actual || toDateInputValue(new Date()));
      return;
    }
    setFechaInscripcion(toDateInputValue(new Date()));
    setFechaPago((actual) => actual || toDateInputValue(new Date()));
  }, [classData]);

  useEffect(() => {
    const buscar = async () => {
      if (modo !== "existente") return;

      try {
        setBuscando(true);
        const alumnos = await getAlumnos(busqueda);
        setAlumnosEncontrados(alumnos || []);
      } catch (error) {
        console.error("Error al buscar alumnos:", error);
        setAlumnosEncontrados([]);
      } finally {
        setBuscando(false);
      }
    };

    buscar();
  }, [busqueda, modo]);

  useEffect(() => {
    if (modo === "nuevo") {
      setAlumnoSeleccionado(null);
    }
  }, [modo]);

  const alumnoYaElegidoTexto = useMemo(() => {
    if (!alumnoSeleccionado) return "";
    return `${alumnoSeleccionado.nombreAlumno || "Sin nombre"} (${alumnoSeleccionado.idAlumno || "Sin ID"})`;
  }, [alumnoSeleccionado]);

  const handleSeleccionarAlumno = (alumno: any) => {
    setAlumnoSeleccionado(alumno);
  };

  const handleGuardar = async () => {
    try {
      setGuardando(true);

      if (!grupoId || !grupoId.trim()) {
        console.error("Error: grupoId vacío. classData:", classData);
        alert(
          "❌ No se encontró el identificador del grupo. Por favor recarga la página e intenta de nuevo."
        );
        return;
      }

      const montoPagoNumero = Number(montoMensualidad);

      if (!montoMensualidad || !Number.isFinite(montoPagoNumero) || montoPagoNumero <= 0) {
        alert("Captura un monto de mensualidad valido");
        return;
      }

      if (!fechaPago) {
        alert("Captura la fecha de pago");
        return;
      }

      let alumnoFinal = alumnoSeleccionado;

      if (modo === "existente") {
        if (!alumnoSeleccionado) {
          alert("❌ Debes seleccionar un alumno");
          return;
        }
      }

      if (modo === "nuevo") {
        if (!nombreAlumno.trim()) {
          alert("❌ Debes capturar el nombre del alumno");
          return;
        }

        try {
          alumnoFinal = await crearAlumno({
            nombreAlumno: nombreAlumno.trim(),
            telefono,
            tutor,
            observaciones,
            estatus: "Activo",
          });
        } catch (errorAlumno: any) {
          console.error("Error al crear alumno:", errorAlumno);
          alert(`❌ Error al crear alumno: ${errorAlumno.message || "Error desconocido"}`);
          return;
        }
      }

      if (!alumnoFinal?.idAlumno) {
        console.error("Error: alumnoFinal sin idAlumno:", alumnoFinal);
        alert("❌ No se pudo obtener el alumno creado");
        return;
      }

      console.log("classData completo:", classData);
      console.log("grupoId final enviado:", grupoId);

      try {
        await crearInscripcion({
          idAlumno: alumnoFinal.idAlumno,
          nombreAlumno: alumnoFinal.nombreAlumno || alumnoFinal.nombre,
          grupoId: grupoId.trim(),
          modalidad: modalidad,
          fechaInscripcion: fechaInscripcion || undefined,
          montoMensualidad: montoPagoNumero,
          fechaPago,
        });
      } catch (errorInscripcion: any) {
        console.error("Error al crear inscripción:", errorInscripcion);
        alert(
          `❌ Error al inscribir alumno: ${errorInscripcion.message || "Error desconocido"}`
        );
        return;
      }

      alert("✓ Alumno inscrito correctamente");

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error: any) {
      console.error("Error inesperado al inscribir:", error);
      alert(`❌ Error inesperado: ${error.message || "Error al inscribir alumno"}`);
    } finally {
      setGuardando(false);
    }
  };

  const puedeConfirmar =
    Boolean(grupoId && grupoId.trim()) &&
    Boolean(fechaPago) &&
    Number(montoMensualidad) > 0 &&
    (modo === "existente"
      ? Boolean(alumnoSeleccionado)
      : Boolean(nombreAlumno.trim()));

  const datosPagoForm = (
    <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4 mt-5 space-y-3">
      <h3 className="font-semibold text-gray-900">Datos de pago</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            className="w-full border p-2 rounded"
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
            className="w-full border p-2 rounded"
          />
        </div>
      </div>

    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-[95vw] max-w-5xl rounded-xl p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Inscribir alumno</h2>

        <p className="text-sm text-gray-500 mb-4">
          Grupo: {classData?.title || classData?.nombreCurso || "Sin curso"} |{" "}
          {classData?.teacher?.name || classData?.nombreProfesor || "Sin profesor"} |{" "}
          {classData?.startTime || ""}
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setModo("existente");
            }}
            className={`px-4 py-2 rounded-lg ${
              modo === "existente"
                ? "bg-cyan-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Alumno existente
          </button>

          <button
            type="button"
            onClick={() => {
              setModo("nuevo");
            }}
            className={`px-4 py-2 rounded-lg ${
              modo === "nuevo"
                ? "bg-cyan-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Alumno nuevo
          </button>
        </div>

        {modo === "existente" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar alumno
              </label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Escribe nombre o ID del alumno"
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modalidad de la clase
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
                Fecha de inicio (desde cuándo aparece)
              </label>
              <input
                type="date"
                value={fechaInscripcion}
                onChange={(e) => setFechaInscripcion(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            {alumnoSeleccionado && (
              <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 p-3 rounded text-sm">
                <b>Alumno seleccionado:</b> {alumnoYaElegidoTexto}
              </div>
            )}

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {buscando ? (
                <p className="p-3 text-sm text-gray-500">Buscando...</p>
              ) : alumnosEncontrados.length > 0 ? (
                alumnosEncontrados.map((alumno) => {
                  const seleccionado =
                    alumnoSeleccionado?.idAlumno === alumno.idAlumno;

                  return (
                    <div
                      key={alumno.idAlumno}
                      onClick={() => handleSeleccionarAlumno(alumno)}
                      className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                        seleccionado ? "bg-cyan-100 border-cyan-300" : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {alumno.nombreAlumno}
                      </div>
                      <div className="text-sm text-gray-500">
                        {alumno.idAlumno}
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

        {modo === "nuevo" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del alumno
              </label>
              <input
                type="text"
                value={nombreAlumno}
                onChange={(e) => setNombreAlumno(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modalidad de la clase
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
                Fecha de inicio (desde cuándo aparece)
              </label>
              <input
                type="date"
                value={fechaInscripcion}
                onChange={(e) => setFechaInscripcion(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tutor
              </label>
              <input
                type="text"
                value={tutor}
                onChange={(e) => setTutor(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full border p-2 rounded"
                rows={3}
              />
            </div>
          </div>
        )}

        {datosPagoForm}

        <div className="flex justify-end gap-2 mt-6">
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
            disabled={guardando || !puedeConfirmar}
            className={`px-4 py-2 rounded text-white ${
              guardando || !puedeConfirmar
                ? "bg-emerald-300 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            {guardando ? "Guardando..." : "Confirmar inscripción"}
          </button>
        </div>
      </div>
    </div>
  );
}
