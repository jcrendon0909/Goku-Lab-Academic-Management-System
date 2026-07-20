import express from "express";
import Reagendacion from "../models/Reagendacion.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";

const router = express.Router();

const generarId = async (prefijo) => {
  const count = await Reagendacion.countDocuments();
  const num = String(count + 1).padStart(3, "0");
  return `${prefijo}${num}`;
};

// ============================================================
// UTILIDAD: Buscar reagendación por ReagendacionId o _id
// ============================================================
const buscarReagendacion = async (id) => {
  // 1. Buscar por ReagendacionId (string personalizado)
  let reagendacion = await Reagendacion.findOne({ ReagendacionId: id });
  if (reagendacion) return reagendacion;

  // 2. Si no, intentar por _id (ObjectId)
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    reagendacion = await Reagendacion.findById(id);
  }
  return reagendacion;
};

// ============================================================
// GET / - Obtener todas las reagendaciones
// ============================================================
router.get("/", async (req, res) => {
  try {
    const reagendaciones = await Reagendacion.find().lean();
    res.json(reagendaciones);
  } catch (error) {
    console.error("Error GET /reagendaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST / - Crear nueva reagendación
// ============================================================
router.post("/", async (req, res) => {
  try {
    console.log("📥 POST /reagendaciones - Payload recibido:", req.body);

    const {
      idAlumno,
      idGrupoOrigen,
      idGrupoNuevo,
      fechaHoraOriginal,
      fechaHoraNueva,
      comentario,
      tipoReagendacion,
      modalidad,
    } = req.body;

    if (!idAlumno || !idGrupoOrigen || !fechaHoraNueva) {
      console.error("❌ Faltan campos obligatorios");
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    console.log(`🔍 Buscando grupo con IdGrupo: "${idGrupoOrigen}"`);
    const grupoOrigen = await Grupo.findOne({ IdGrupo: idGrupoOrigen }).lean();
    console.log("✅ Grupo origen encontrado:", grupoOrigen);

    if (!grupoOrigen) {
      console.error(`❌ Grupo no encontrado para IdGrupo: "${idGrupoOrigen}"`);
      return res.status(404).json({ error: `Grupo origen no encontrado: ${idGrupoOrigen}` });
    }

    let grupoNuevo = null;
    if (idGrupoNuevo && idGrupoNuevo !== idGrupoOrigen) {
      console.log(`🔍 Buscando grupo destino con IdGrupo: "${idGrupoNuevo}"`);
      grupoNuevo = await Grupo.findOne({ IdGrupo: idGrupoNuevo }).lean();
      console.log("✅ Grupo destino encontrado:", grupoNuevo);
    }

    const nombreCurso = grupoOrigen.nombreCurso || "Curso sin nombre";
    const profesorOriginalId = grupoOrigen.idProfesor || "";
    const profesorOriginalNombre = grupoOrigen.nombreProfesor || "Sin profesor";

    let profesorNuevoId = "";
    let profesorNuevoNombre = "";
    if (grupoNuevo) {
      profesorNuevoId = grupoNuevo.idProfesor || "";
      profesorNuevoNombre = grupoNuevo.nombreProfesor || "Sin profesor";
    } else {
      profesorNuevoId = profesorOriginalId;
      profesorNuevoNombre = profesorOriginalNombre;
    }

    let nombreAlumno = req.body.nombreAlumno || "";
    if (!nombreAlumno) {
      const inscripcion = await Inscripcion.findOne({ idAlumno, grupoId: idGrupoOrigen }).lean();
      nombreAlumno = inscripcion?.nombreAlumno || idAlumno;
    }

    const reagendacionId = await generarId("REA");

    const nuevaReagendacion = new Reagendacion({
      ReagendacionId: reagendacionId,
      idAlumno,
      nombreAlumno,
      idGrupoOrigen,
      idGrupoNuevo: idGrupoNuevo || idGrupoOrigen,
      nombreCurso,
      profesorOriginal: profesorOriginalNombre,
      profesorNuevo: profesorNuevoNombre,
      idProfesorOriginal: profesorOriginalId,
      idProfesorNuevo: profesorNuevoId,
      fechaHoraOriginal,
      fechaHoraNueva,
      tipoReagendacion: tipoReagendacion || "temporal",
      comentario: comentario || `Reagendado por ${nombreAlumno}`,
      duracion: grupoOrigen.duracionClase || "2 horas",
      modalidad: modalidad || "Presencial",
      motivo: "Reagendado desde sistema",
      estatus: "reagendado",
    });

    console.log("🔄 Intentando guardar en MongoDB:", nuevaReagendacion);
    await nuevaReagendacion.save();
    console.log("✅ Reagendación guardada en MongoDB");

    res.status(201).json(nuevaReagendacion);
  } catch (error) {
    console.error("❌ Error en POST /reagendaciones:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ============================================================
// PUT /:id - Actualizar modalidad (CORREGIDO)
// ============================================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { modalidad } = req.body;

    if (!modalidad || !["Presencial", "Virtual"].includes(modalidad)) {
      return res.status(400).json({
        error: "Modalidad inválida. Debe ser 'Presencial' o 'Virtual'"
      });
    }

    console.log(`🔄 Actualizando reagendación con id: ${id} a modalidad: ${modalidad}`);

    // Usar la función de búsqueda que maneja ambos tipos de ID
    const reagendacion = await buscarReagendacion(id);
    if (!reagendacion) {
      return res.status(404).json({ error: "Reagendación no encontrada" });
    }

    // Actualizar el campo modalidad
    reagendacion.modalidad = modalidad;
    await reagendacion.save();

    console.log("✅ Reagendación actualizada:", reagendacion);
    res.json({
      ok: true,
      mensaje: "Modalidad actualizada correctamente",
      data: reagendacion
    });
  } catch (error) {
    console.error("❌ Error PUT /reagendaciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /:id - Eliminar reagendación (CORREGIDO)
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Intentando eliminar reagendación con id: ${id}`);

    // Usar la función de búsqueda
    const reagendacion = await buscarReagendacion(id);
    if (!reagendacion) {
      return res.status(404).json({ error: "Reagendación no encontrada" });
    }

    await reagendacion.deleteOne();
    console.log("✅ Reagendación eliminada");
    res.json({ ok: true, mensaje: "Reagendación eliminada" });
  } catch (error) {
    console.error("❌ Error DELETE /reagendaciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /alumno/:idAlumno/:idGrupoNuevo - Quitar reagendación de un alumno
// ============================================================
router.delete("/alumno/:idAlumno/:idGrupoNuevo", async (req, res) => {
  try {
    const { idAlumno, idGrupoNuevo } = req.params;
    console.log(`🗑️ Intentando eliminar reagendación de alumno: ${idAlumno}, grupo: ${idGrupoNuevo}`);

    const reagendacion = await Reagendacion.findOneAndDelete({
      idAlumno,
      idGrupoNuevo,
      estatus: "reagendado"
    });

    if (!reagendacion) {
      return res.status(404).json({ error: "Reagendación no encontrada" });
    }

    console.log("✅ Reagendación eliminada");
    res.json({ ok: true, mensaje: "Reagendación eliminada" });
  } catch (error) {
    console.error("❌ Error DELETE /alumno/:idAlumno/:idGrupoNuevo:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;