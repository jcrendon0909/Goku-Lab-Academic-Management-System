import express from "express";
import CursoVerano from "../models/CursoVerano.js";
import AsignacionProfesorVerano from "../models/AsignacionProfesorVerano.js";
import InscripcionVerano from "../models/InscripcionVerano.js";

const router = express.Router();

// ============================================================
// CURSOS
// ============================================================

// GET / - Listar todos los cursos
router.get("/", async (req, res) => {
  try {
    const cursos = await CursoVerano.find().sort({ año: -1, fechaInicio: -1 });
    res.json(cursos);
  } catch (error) {
    console.error("❌ GET /cursosVerano:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /:id - Obtener un curso por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const curso = await CursoVerano.findOne({ idCursoVerano: id });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }
    res.json(curso);
  } catch (error) {
    console.error("❌ GET /cursosVerano/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST / - Crear un nuevo curso
router.post("/", async (req, res) => {
  try {
    const nuevoCurso = new CursoVerano(req.body);
    await nuevoCurso.save();
    res.status(201).json(nuevoCurso);
  } catch (error) {
    console.error("❌ POST /cursosVerano:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - Actualizar un curso
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const curso = await CursoVerano.findOneAndUpdate(
      { idCursoVerano: id },
      req.body,
      { new: true }
    );
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }
    res.json(curso);
  } catch (error) {
    console.error("❌ PUT /cursosVerano/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id - Cambiar estatus
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { estatus } = req.body;
    const curso = await CursoVerano.findOneAndUpdate(
      { idCursoVerano: id },
      { estatus },
      { new: true }
    );
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }
    res.json(curso);
  } catch (error) {
    console.error("❌ PATCH /cursosVerano/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - Eliminar curso (solo si no tiene inscripciones)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const inscripciones = await InscripcionVerano.find({ idCursoVerano: id });
    if (inscripciones.length > 0) {
      return res.status(400).json({ error: "No se puede eliminar un curso con alumnos inscritos" });
    }
    const curso = await CursoVerano.findOneAndDelete({ idCursoVerano: id });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }
    res.json({ ok: true, mensaje: "Curso eliminado" });
  } catch (error) {
    console.error("❌ DELETE /cursosVerano/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ASIGNACIONES DE PROFESORES
// ============================================================

// GET /:id/asignaciones - Obtener asignaciones de un curso
router.get("/:id/asignaciones", async (req, res) => {
  try {
    const { id } = req.params;
    const asignaciones = await AsignacionProfesorVerano.find({ idCursoVerano: id });
    res.json(asignaciones);
  } catch (error) {
    console.error("❌ GET /cursosVerano/:id/asignaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /asignaciones - Crear una asignación
router.post("/asignaciones", async (req, res) => {
  try {
    const nuevaAsignacion = new AsignacionProfesorVerano(req.body);
    await nuevaAsignacion.save();
    res.status(201).json(nuevaAsignacion);
  } catch (error) {
    console.error("❌ POST /cursosVerano/asignaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /asignaciones/:id - Actualizar una asignación
router.put("/asignaciones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const asignacion = await AsignacionProfesorVerano.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!asignacion) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }
    res.json(asignacion);
  } catch (error) {
    console.error("❌ PUT /cursosVerano/asignaciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /asignaciones/:id - Eliminar una asignación
router.delete("/asignaciones/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const asignacion = await AsignacionProfesorVerano.findByIdAndDelete(id);
    if (!asignacion) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }
    res.json({ ok: true, mensaje: "Asignación eliminada" });
  } catch (error) {
    console.error("❌ DELETE /cursosVerano/asignaciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// INSCRIPCIONES
// ============================================================

// GET /:id/inscripciones - Obtener inscripciones de un curso
router.get("/:id/inscripciones", async (req, res) => {
  try {
    const { id } = req.params;
    const inscripciones = await InscripcionVerano.find({ idCursoVerano: id }).lean();
    res.json(inscripciones);
  } catch (error) {
    console.error("❌ GET /cursosVerano/:id/inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /:id/inscripciones - Registrar un alumno en un curso
router.post("/:id/inscripciones", async (req, res) => {
  try {
    const { id } = req.params;
    const { idAlumno, nombreAlumno, montoPago, semanasPagadas, fechaInicio, fechaFin, notas } = req.body;

    if (!idAlumno || !nombreAlumno || !montoPago || !semanasPagadas || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const curso = await CursoVerano.findOne({ idCursoVerano: id });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    // ✅ CORREGIDO: Agregar 'T00:00:00' para evitar desfase de zona horaria
    const nuevaInscripcion = new InscripcionVerano({
      idCursoVerano: id,
      idAlumno,
      nombreAlumno: nombreAlumno.trim(),
      montoPago: parseFloat(montoPago),
      semanasPagadas: parseInt(semanasPagadas),
      fechaInicio: new Date(fechaInicio + 'T00:00:00'),
      fechaFin: new Date(fechaFin + 'T00:00:00'),
      notas: notas || ""
    });

    await nuevaInscripcion.save();
    res.status(201).json(nuevaInscripcion);
  } catch (error) {
    console.error("❌ POST /cursosVerano/:id/inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ NUEVO: PUT /inscripciones/:inscripcionId - Actualizar una inscripción
router.put("/inscripciones/:inscripcionId", async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const { nombreAlumno, montoPago, semanasPagadas, fechaInicio, fechaFin, notas } = req.body;

    const inscripcion = await InscripcionVerano.findById(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    // Actualizar solo los campos enviados
    if (nombreAlumno !== undefined) inscripcion.nombreAlumno = nombreAlumno.trim();
    if (montoPago !== undefined) inscripcion.montoPago = parseFloat(montoPago);
    if (semanasPagadas !== undefined) inscripcion.semanasPagadas = parseInt(semanasPagadas);
    // ✅ CORREGIDO: Agregar 'T00:00:00' para evitar desfase de zona horaria
    if (fechaInicio) inscripcion.fechaInicio = new Date(fechaInicio + 'T00:00:00');
    if (fechaFin) inscripcion.fechaFin = new Date(fechaFin + 'T00:00:00');
    if (notas !== undefined) inscripcion.notas = notas;

    await inscripcion.save();

    res.json({ ok: true, mensaje: "Inscripción actualizada", inscripcion });
  } catch (error) {
    console.error("❌ PUT /cursosVerano/inscripciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /inscripciones/:inscripcionId - Eliminar una inscripción
router.delete("/inscripciones/:inscripcionId", async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const inscripcion = await InscripcionVerano.findByIdAndDelete(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    res.json({ ok: true, mensaje: "Inscripción eliminada" });
  } catch (error) {
    console.error("❌ DELETE /cursosVerano/inscripciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;