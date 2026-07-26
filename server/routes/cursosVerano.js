import express from "express";
import CursoVerano from "../models/CursoVerano.js";
import InscripcionVerano from "../models/InscripcionVerano.js";
import AsignacionProfesorVerano from "../models/AsignacionProfesorVerano.js";
import PagoProfesorVerano from "../models/PagoProfesorVerano.js";
import Profesor from "../models/Profesor.js";

const router = express.Router();

// ============================================================
// CRUD DE CURSOS DE VERANO
// ============================================================

// GET / - Listar todos los cursos
router.get("/", async (req, res) => {
  try {
    const cursos = await CursoVerano.find().sort({ año: -1, createdAt: -1 }).lean();
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
    const curso = await CursoVerano.findOne({ idCursoVerano: id }).lean();
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }
    res.json(curso);
  } catch (error) {
    console.error("❌ GET /cursosVerano/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST / - Crear un curso
router.post("/", async (req, res) => {
  try {
    const { nombre, modalidad, año, fechaInicio, fechaFin, descripcion, profesorPrincipal } = req.body;

    if (!nombre || !año || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const añoNum = parseInt(año);
    const contador = await CursoVerano.countDocuments({ año: añoNum });
    const nuevoId = `CV-${añoNum}-${String(contador + 1).padStart(3, '0')}`;

    const nuevoCurso = new CursoVerano({
      idCursoVerano: nuevoId,
      nombre: nombre.trim(),
      modalidad: modalidad || 'verano',
      año: añoNum,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      descripcion: descripcion || "",
      profesorPrincipal: profesorPrincipal || "",
      estatus: 'activo'
    });

    await nuevoCurso.save();
    res.status(201).json(nuevoCurso);
  } catch (error) {
    console.error("❌ POST /cursosVerano:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:id - Actualizar curso
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const curso = await CursoVerano.findOne({ idCursoVerano: id });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    Object.assign(curso, updateData);
    await curso.save();
    res.json({ ok: true, mensaje: "Curso actualizado", curso });
  } catch (error) {
    console.error("❌ PATCH /cursosVerano/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:id - Eliminar curso (solo si no tiene inscripciones)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const inscripciones = await InscripcionVerano.countDocuments({ idCursoVerano: id });
    if (inscripciones > 0) {
      return res.status(409).json({ error: "No se puede eliminar porque tiene alumnos inscritos" });
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

    const nuevaInscripcion = new InscripcionVerano({
      idCursoVerano: id,
      idAlumno,
      nombreAlumno: nombreAlumno.trim(),
      montoPago: parseFloat(montoPago),
      semanasPagadas: parseInt(semanasPagadas),
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      notas: notas || ""
    });

    await nuevaInscripcion.save();
    res.status(201).json(nuevaInscripcion);
  } catch (error) {
    console.error("❌ POST /cursosVerano/:id/inscripciones:", error);
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

// ============================================================
// ASIGNACIÓN DE PROFESORES
// ============================================================

// GET /:id/asignaciones - Obtener asignaciones de un curso
router.get("/:id/asignaciones", async (req, res) => {
  try {
    const { id } = req.params;
    const asignaciones = await AsignacionProfesorVerano.find({ idCursoVerano: id }).lean();
    const idsProfesores = asignaciones.map(a => a.idProfesor);
    const profesores = await Profesor.find({ idProfesor: { $in: idsProfesores } }).lean();
    const mapaProfesores = {};
    profesores.forEach(p => { mapaProfesores[p.idProfesor] = p.nombre; });

    const resultado = asignaciones.map(a => ({
      ...a,
      nombreProfesor: mapaProfesores[a.idProfesor] || a.idProfesor
    }));
    res.json(resultado);
  } catch (error) {
    console.error("❌ GET /cursosVerano/:id/asignaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /:id/asignaciones - Asignar un profesor
router.post("/:id/asignaciones", async (req, res) => {
  try {
    const { id } = req.params;
    const { idProfesor, dias, horasPorDia, costoHora, semanas } = req.body;

    if (!idProfesor || !dias || !Array.isArray(dias) || dias.length === 0) {
      return res.status(400).json({ error: "Profesor y días son requeridos" });
    }

    const profesor = await Profesor.findOne({ idProfesor });
    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    const existente = await AsignacionProfesorVerano.findOne({
      idCursoVerano: id,
      idProfesor
    });
    if (existente) {
      return res.status(409).json({ error: "Este profesor ya está asignado al curso" });
    }

    const nuevaAsignacion = new AsignacionProfesorVerano({
      idCursoVerano: id,
      idProfesor,
      dias: dias.map(Number),
      horasPorDia: parseFloat(horasPorDia) || 0,
      costoHora: parseFloat(costoHora) || 0,
      semanas: parseInt(semanas) || 1
    });

    await nuevaAsignacion.save();
    const resultado = { ...nuevaAsignacion.toObject(), nombreProfesor: profesor.nombre };
    res.status(201).json(resultado);
  } catch (error) {
    console.error("❌ POST /cursosVerano/:id/asignaciones:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /asignaciones/:asignacionId - Actualizar una asignación
router.patch("/asignaciones/:asignacionId", async (req, res) => {
  try {
    const { asignacionId } = req.params;
    const { dias, horasPorDia, costoHora, semanas } = req.body;

    const asignacion = await AsignacionProfesorVerano.findById(asignacionId);
    if (!asignacion) {
      return res.status(404).json({ error: "Asignación no encontrada" });
    }

    if (dias !== undefined) asignacion.dias = dias.map(Number);
    if (horasPorDia !== undefined) asignacion.horasPorDia = parseFloat(horasPorDia);
    if (costoHora !== undefined) asignacion.costoHora = parseFloat(costoHora);
    if (semanas !== undefined) asignacion.semanas = parseInt(semanas);

    await asignacion.save();
    res.json({ ok: true, mensaje: "Asignación actualizada", asignacion });
  } catch (error) {
    console.error("❌ PATCH /cursosVerano/asignaciones/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /asignaciones/:asignacionId - Eliminar una asignación
router.delete("/asignaciones/:asignacionId", async (req, res) => {
  try {
    const { asignacionId } = req.params;
    const asignacion = await AsignacionProfesorVerano.findByIdAndDelete(asignacionId);
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
// RENTABILIDAD (CON INSCRIPCIONES INCLUIDAS)
// ============================================================

router.get("/:id/rentabilidad", async (req, res) => {
  try {
    const { id } = req.params;

    const curso = await CursoVerano.findOne({ idCursoVerano: id });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    // Obtener inscripciones
    const inscripciones = await InscripcionVerano.find({ idCursoVerano: id }).lean();
    const ingresosTotales = inscripciones.reduce((sum, i) => sum + (i.montoPago || 0), 0);

    // Obtener asignaciones de profesores
    const asignaciones = await AsignacionProfesorVerano.find({ idCursoVerano: id }).lean();
    let costosTotales = 0;
    const costosPorProfesor = {};

    for (const asig of asignaciones) {
      const totalHoras = asig.dias.length * asig.horasPorDia * (asig.semanas || 1);
      const costo = totalHoras * (asig.costoHora || 0);
      costosTotales += costo;
      costosPorProfesor[asig.idProfesor] = (costosPorProfesor[asig.idProfesor] || 0) + costo;
    }

    // Obtener nombres de profesores
    const idsProfesores = Object.keys(costosPorProfesor);
    const profesores = await Profesor.find({ idProfesor: { $in: idsProfesores } }).lean();
    const mapaProfesores = {};
    profesores.forEach(p => { mapaProfesores[p.idProfesor] = p.nombre; });

    const costosDetalle = idsProfesores.map(id => {
      const asig = asignaciones.find(a => a.idProfesor === id);
      return {
        idProfesor: id,
        nombre: mapaProfesores[id] || id,
        total: costosPorProfesor[id],
        dias: asig ? asig.dias : [],
        horasPorDia: asig ? asig.horasPorDia : 0,
        semanas: asig ? asig.semanas : 0,
        totalHoras: asig ? asig.dias.length * asig.horasPorDia * (asig.semanas || 1) : 0,
        costoHora: asig ? asig.costoHora : 0
      };
    });

    // ✅ Incluir inscripciones en la respuesta
    res.json({
      idCursoVerano: id,
      nombre: curso.nombre,
      modalidad: curso.modalidad,
      año: curso.año,
      ingresosTotales,
      costosTotales,
      ganancia: ingresosTotales - costosTotales,
      numeroAlumnos: inscripciones.length,
      costosDetalle,
      inscripciones
    });
  } catch (error) {
    console.error("❌ GET /cursosVerano/:id/rentabilidad:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;