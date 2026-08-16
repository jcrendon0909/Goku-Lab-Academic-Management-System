import express from "express";
import CursoVerano from "../models/CursoVerano.js";
import AsignacionProfesorVerano from "../models/AsignacionProfesorVerano.js";
import InscripcionVerano from "../models/InscripcionVerano.js";
import Profesor from "../models/Profesor.js";

const router = express.Router();

// ============================================================
// CURSOS
// ============================================================

router.get("/", async (req, res) => {
  try {
    const cursos = await CursoVerano.find().sort({ año: -1, fechaInicio: -1 });
    res.json(cursos);
  } catch (error) {
    console.error("❌ GET /cursosVerano:", error);
    res.status(500).json({ error: error.message });
  }
});

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

router.put("/inscripciones/:inscripcionId", async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const { nombreAlumno, montoPago, semanasPagadas, fechaInicio, fechaFin, notas } = req.body;

    const inscripcion = await InscripcionVerano.findById(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    if (nombreAlumno !== undefined) inscripcion.nombreAlumno = nombreAlumno.trim();
    if (montoPago !== undefined) inscripcion.montoPago = parseFloat(montoPago);
    if (semanasPagadas !== undefined) inscripcion.semanasPagadas = parseInt(semanasPagadas);
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
// RENTABILIDAD
// ============================================================

router.get("/:id/rentabilidad", async (req, res) => {
  try {
    const { id } = req.params;
    
    const curso = await CursoVerano.findOne({ idCursoVerano: id });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    const profesores = await Profesor.find().lean();
    const profesoresMap = new Map();
    profesores.forEach(p => {
      profesoresMap.set(p.idProfesor, p.nombre || p.idProfesor);
    });

    const asignaciones = await AsignacionProfesorVerano.find({ idCursoVerano: id });
    const inscripciones = await InscripcionVerano.find({ idCursoVerano: id });

    const ingresos = inscripciones.reduce((sum, ins) => sum + ins.montoPago, 0);
    const costos = asignaciones.reduce((sum, asig) => {
      const totalHoras = asig.dias.length * asig.horasPorDia * asig.semanas;
      return sum + (totalHoras * asig.costoHora);
    }, 0);
    const utilidad = ingresos - costos;

    res.json({
      idCursoVerano: id,
      nombre: curso.nombre,
      ingresos,
      costos,
      utilidad,
      alumnosInscritos: inscripciones.length,
      profesoresAsignados: asignaciones.length,
      detalle: {
        inscripciones: inscripciones.map(ins => ({
          id: ins._id,
          alumno: ins.nombreAlumno || ins.idAlumno || 'Sin nombre',
          monto: ins.montoPago,
          semanas: ins.semanasPagadas,
          fechaInicio: ins.fechaInicio,
          fechaFin: ins.fechaFin
        })),
        asignaciones: asignaciones.map(asig => {
          const nombreProfesor = asig.nombreProfesor || profesoresMap.get(asig.idProfesor) || asig.idProfesor || 'Sin nombre';
          return {
            profesor: nombreProfesor,
            dias: asig.dias,
            horasPorDia: asig.horasPorDia,
            costoHora: asig.costoHora,
            semanas: asig.semanas,
            costoTotal: asig.dias.length * asig.horasPorDia * asig.semanas * asig.costoHora
          };
        })
      }
    });
  } catch (error) {
    console.error("❌ GET /cursosVerano/:id/rentabilidad:", error);
    res.status(500).json({ error: error.message });
  }
});
export default router;