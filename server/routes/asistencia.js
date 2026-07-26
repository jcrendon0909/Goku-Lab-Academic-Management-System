import express from "express";
import Asistencia from "../models/Asistencia.js";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";

const router = express.Router();

// ============================================================
// GET /grupos-para-profesor - Obtener grupos (sin autenticación)
// ============================================================
router.get("/grupos-para-profesor", async (req, res) => {
  try {
    // Temporalmente devolvemos todos los grupos activos
    const grupos = await Grupo.find({ Estatus: "Activo" }).lean();
    res.json(grupos);
  } catch (error) {
    console.error("❌ GET /asistencia/grupos-para-profesor:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /grupo/:grupoId - Obtener asistencia de un grupo
// ============================================================
router.get("/grupo/:grupoId", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: "La fecha es requerida (YYYY-MM-DD)" });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    // Obtener alumnos activos del grupo
    const inscripciones = await Inscripcion.find({
      grupoId: grupoId,
      estatus: "Activa",
    }).lean();

    // Obtener asistencias existentes para esa fecha
    const asistencias = await Asistencia.find({
      grupoId: grupoId,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
    }).lean();

    // Combinar datos
    const resultado = inscripciones.map((ins) => {
      const asistencia = asistencias.find((a) => a.idAlumno === ins.idAlumno);
      return {
        idAlumno: ins.idAlumno,
        nombreAlumno: ins.nombreAlumno,
        estado: asistencia ? asistencia.estado : "ausente",
        observaciones: asistencia ? asistencia.observaciones : "",
        asistenciaId: asistencia ? asistencia._id : null,
      };
    });

    res.json({
      grupoId,
      fecha: fecha,
      alumnos: resultado,
    });
  } catch (error) {
    console.error("❌ GET /asistencia/grupo/:grupoId:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST / - Guardar asistencia
// ============================================================
router.post("/", async (req, res) => {
  try {
    const { grupoId, fecha, alumnos } = req.body;

    if (!grupoId || !fecha || !alumnos || !Array.isArray(alumnos)) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const fechaObj = new Date(fecha);
    fechaObj.setHours(0, 0, 0, 0);

    const resultados = await Promise.all(
      alumnos.map(async (item) => {
        const { idAlumno, nombreAlumno, estado, observaciones } = item;

        if (!idAlumno || !estado) {
          return { idAlumno, error: "Faltan datos" };
        }

        let asistencia = await Asistencia.findOne({
          idAlumno,
          grupoId,
          fecha: fechaObj,
        });

        if (asistencia) {
          asistencia.estado = estado;
          asistencia.observaciones = observaciones || "";
          await asistencia.save();
        } else {
          asistencia = new Asistencia({
            idAlumno,
            nombreAlumno,
            grupoId,
            fecha: fechaObj,
            estado,
            observaciones: observaciones || "",
          });
          await asistencia.save();
        }

        return { idAlumno, success: true };
      })
    );

    res.json({
      ok: true,
      mensaje: "Asistencia guardada correctamente",
      resultados,
    });
  } catch (error) {
    console.error("❌ POST /asistencia:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /alumno/:idAlumno - Historial de asistencia de un alumno
// ============================================================
router.get("/alumno/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { limite } = req.query;

    const query = Asistencia.find({ idAlumno }).sort({ fecha: -1 });
    if (limite) {
      query.limit(parseInt(limite));
    }

    const historial = await query.lean();
    res.json(historial);
  } catch (error) {
    console.error("❌ GET /asistencia/alumno/:idAlumno:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;