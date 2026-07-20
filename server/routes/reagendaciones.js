import express from "express";
import Reagendacion from "../models/Reagendacion.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";

const router = express.Router();

// Función auxiliar para generar ID (si no tienes una, usa esta)
const generarId = async (prefijo) => {
  const count = await Reagendacion.countDocuments();
  const num = String(count + 1).padStart(3, "0");
  return `${prefijo}${num}`;
};

// GET / - Obtener todas las reagendaciones
router.get("/", async (req, res) => {
  try {
    const reagendaciones = await Reagendacion.find().lean();
    res.json(reagendaciones);
  } catch (error) {
    console.error("Error GET /reagendaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST / - Crear una nueva reagendación
router.post("/", async (req, res) => {
  try {
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

    // Validaciones básicas
    if (!idAlumno || !idGrupoOrigen || !fechaHoraNueva) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Obtener el grupo origen para obtener el curso y profesor original
    const grupoOrigen = await Grupo.findById(idGrupoOrigen).lean();
    if (!grupoOrigen) {
      return res.status(404).json({ error: "Grupo origen no encontrado" });
    }

    // Obtener el grupo destino (si existe y es diferente)
    let grupoNuevo = null;
    if (idGrupoNuevo && idGrupoNuevo !== idGrupoOrigen) {
      grupoNuevo = await Grupo.findById(idGrupoNuevo).lean();
    }

    // Obtener nombres de curso y profesor
    const nombreCurso = grupoOrigen.nombreCurso || "Curso sin nombre";
    const profesorOriginalId = grupoOrigen.idProfesor || "";
    const profesorOriginalNombre = grupoOrigen.nombreProfesor || "Sin profesor";

    let profesorNuevoId = "";
    let profesorNuevoNombre = "";
    if (grupoNuevo) {
      profesorNuevoId = grupoNuevo.idProfesor || "";
      profesorNuevoNombre = grupoNuevo.nombreProfesor || "Sin profesor";
    } else {
      // Si no hay grupo nuevo, el profesor nuevo es el mismo que el original
      profesorNuevoId = profesorOriginalId;
      profesorNuevoNombre = profesorOriginalNombre;
    }

    // Obtener nombre del alumno
    let nombreAlumno = req.body.nombreAlumno || "";
    if (!nombreAlumno) {
      const inscripcion = await Inscripcion.findOne({ idAlumno, grupoId: idGrupoOrigen }).lean();
      nombreAlumno = inscripcion?.nombreAlumno || idAlumno;
    }

    // Generar ID de reagendación
    const reagendacionId = await generarId("REA");

    // Crear el documento de reagendación
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

    await nuevaReagendacion.save();

    // Responder con el objeto creado
    res.status(201).json(nuevaReagendacion);
  } catch (error) {
    console.error("Error POST /reagendaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - Eliminar una reagendación
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const reagendacion = await Reagendacion.findOneAndDelete({
      $or: [{ _id: id }, { ReagendacionId: id }],
    });
    if (!reagendacion) {
      return res.status(404).json({ error: "Reagendación no encontrada" });
    }
    res.json({ ok: true, mensaje: "Reagendación eliminada" });
  } catch (error) {
    console.error("Error DELETE /reagendaciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;