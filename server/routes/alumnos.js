import express from "express";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

// GET / - Obtener todos los alumnos (con conteo de cursos activos y búsqueda)
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    
    let filtro = {};
    if (q) {
      filtro = {
        $or: [
          { idAlumno: { $regex: q, $options: 'i' } },
          { nombreAlumno: { $regex: q, $options: 'i' } },
          { telefono: { $regex: q, $options: 'i' } }
        ]
      };
    }

    const alumnos = await Alumno.aggregate([
      { $match: filtro },
      {
        $lookup: {
          from: "inscripciones",
          let: { idAlumno: "$idAlumno" },
          pipeline: [
            { 
              $match: { 
                $expr: { $eq: ["$idAlumno", "$$idAlumno"] },
                estatus: "Activa"
              } 
            },
            { $count: "total" }
          ],
          as: "cursosActivosData"
        }
      },
      {
        $addFields: {
          cursosActivos: { 
            $ifNull: [ { $arrayElemAt: ["$cursosActivosData.total", 0] }, 0 ] 
          }
        }
      },
      { $project: { cursosActivosData: 0 } }
    ]);

    res.json(alumnos);
  } catch (error) {
    console.error("❌ GET /alumnos:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST / - Crear un alumno
router.post("/", async (req, res) => {
  try {
    const { nombreAlumno, telefono, tutor, observaciones, email, fechaNacimiento, descuento, notasInternas } = req.body;
    if (!nombreAlumno) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    const idAlumno = await generarId("alumno");
    const nuevoAlumno = new Alumno({
      idAlumno,
      nombreAlumno,
      telefono: telefono || "",
      tutor: tutor || "",
      observaciones: observaciones || "",
      estatus: "Activo",
      email: email || "",
      fechaNacimiento: fechaNacimiento || null,
      descuento: descuento || 0,
      notasInternas: notasInternas || "",
    });
    await nuevoAlumno.save();
    res.status(201).json(nuevoAlumno);
  } catch (error) {
    console.error("❌ POST /alumnos:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /:idAlumno - Obtener un alumno
router.get("/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const alumno = await Alumno.findOne({ idAlumno }).lean();
    if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });
    res.json(alumno);
  } catch (error) {
    console.error("❌ GET /alumnos/:idAlumno:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /:idAlumno - Actualizar alumno (incluye nombre y cascada)
router.patch("/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { nombreAlumno, telefono, tutor, observaciones, estatus } = req.body;

    const updateData = {};
    if (nombreAlumno !== undefined) updateData.nombreAlumno = nombreAlumno.trim();
    if (telefono !== undefined) updateData.telefono = telefono;
    if (tutor !== undefined) updateData.tutor = tutor;
    if (observaciones !== undefined) updateData.observaciones = observaciones;
    if (estatus !== undefined) updateData.estatus = estatus;

    const alumno = await Alumno.findOneAndUpdate(
      { idAlumno },
      { $set: updateData },
      { new: true }
    );
    if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });

    if (nombreAlumno !== undefined) {
      await Inscripcion.updateMany(
        { idAlumno },
        { $set: { nombreAlumno: nombreAlumno.trim() } }
      );
      await Pago.updateMany(
        { idAlumno },
        { $set: { nombreAlumno: nombreAlumno.trim() } }
      );
      await Abono.updateMany(
        { idAlumno },
        { $set: { nombreAlumno: nombreAlumno.trim() } }
      );
    }

    res.json(alumno);
  } catch (error) {
    console.error("❌ PATCH /alumnos/:idAlumno:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:idAlumno - Eliminar alumno (con validación de inscripciones activas)
router.delete("/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    // Verificar si tiene inscripciones activas
    const activas = await Inscripcion.countDocuments({ idAlumno, estatus: "Activa" });
    if (activas > 0) {
      return res.status(409).json({
        error: "No se puede eliminar porque tiene inscripciones activas",
        inscripcionesActivas: activas
      });
    }
    // Eliminar el alumno
    const alumno = await Alumno.findOneAndDelete({ idAlumno });
    if (!alumno) {
      return res.status(404).json({ error: "Alumno no encontrado" });
    }
    res.json({ ok: true, mensaje: "Alumno eliminado" });
  } catch (error) {
    console.error("❌ DELETE /alumnos/:idAlumno:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ PATCH /:idAlumno/desactivar - Desactivar un alumno (baja lógica)
router.patch("/:idAlumno/desactivar", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { motivo } = req.body;

    // Buscar el alumno
    const alumno = await Alumno.findOne({ idAlumno });
    if (!alumno) {
      return res.status(404).json({ error: "Alumno no encontrado" });
    }

    // Cambiar estatus a Inactivo
    alumno.estatus = "Inactivo";
    alumno.updatedAt = new Date();
    await alumno.save();

    // Dar de baja todas sus inscripciones activas
    await Inscripcion.updateMany(
      { idAlumno, estatus: "Activa" },
      { 
        $set: { 
          estatus: "Inactiva", 
          fechaBaja: new Date(),
          motivoBaja: motivo || "Alumno desactivado"
        } 
      }
    );

    res.json({ 
      ok: true, 
      mensaje: "Alumno desactivado correctamente",
      data: alumno
    });
  } catch (error) {
    console.error("❌ PATCH /alumnos/:idAlumno/desactivar:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;