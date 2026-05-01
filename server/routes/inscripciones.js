import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";
import Grupo from "../models/Grupo.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find().lean();
    res.json(inscripciones);
  } catch (error) {
    console.error("ERROR GET INSCRIPCIONES:", error);
    res.status(500).json({ error: "Error al obtener inscripciones" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { idAlumno, nombreAlumno, grupoId } = req.body;

    // Validar inputs
    if (!idAlumno || !String(idAlumno).trim()) {
      return res.status(400).json({ error: "Falta idAlumno" });
    }

    if (!nombreAlumno || !String(nombreAlumno).trim()) {
      return res.status(400).json({ error: "Falta nombreAlumno" });
    }

    if (!grupoId || !String(grupoId).trim()) {
      return res.status(400).json({ error: "Falta grupoId" });
    }

    const grupoIdTrimmed = String(grupoId).trim();

    // Verificar si el alumno ya está inscrito en este grupo
    const inscripcionExistente = await Inscripcion.findOne({
      idAlumno: String(idAlumno).trim(),
      grupoId: grupoIdTrimmed,
    }).lean();

    if (inscripcionExistente) {
      return res.status(409).json({
        error: "El alumno ya está inscrito en este grupo",
      });
    }

    // Obtener el grupo que se quiere inscribir
    const grupoNuevo = await Grupo.findOne({
      $or: [
        { IdGrupo: grupoIdTrimmed },
        { idGrupo: grupoIdTrimmed },
      ],
    }).lean();

    console.log("Búsqueda de grupo:", { grupoId: grupoIdTrimmed, grupoEncontrado: !!grupoNuevo });

    if (grupoNuevo) {
      // Buscar todas las inscripciones del alumno
      const inscripcionesAlumno = await Inscripcion.find({
        idAlumno,
      }).lean();

      // Verificar si el alumno ya está inscrito en una clase del mismo profesor a la misma hora
      for (const inscripcion of inscripcionesAlumno) {
        const grupoExistente = await Grupo.findOne({
          $or: [
            { IdGrupo: inscripcion.grupoId },
            { idGrupo: inscripcion.grupoId },
          ],
        }).lean();

        if (grupoExistente) {
          const mismoProfesor =
            (grupoNuevo.idProfesor || grupoNuevo.IdProfesor) ===
            (grupoExistente.idProfesor || grupoExistente.IdProfesor);

          const mismaHora =
            String(grupoNuevo.horaClase || "").trim() ===
            String(grupoExistente.horaClase || "").trim();

          const mismoDia =
            String(grupoNuevo.diaClase || "").trim().toLowerCase() ===
            String(grupoExistente.diaClase || "").trim().toLowerCase();

          if (mismoProfesor && mismaHora && mismoDia) {
            return res.status(409).json({
              error: `El alumno ya está inscrito en una clase del profesor ${grupoExistente.nombreProfesor} a la misma hora`,
            });
          }
        }
      }
    }

    const nuevaInscripcion = new Inscripcion({
      idAlumno: String(idAlumno).trim(),
      nombreAlumno: String(nombreAlumno).trim(),
      grupoId: grupoIdTrimmed,
    });

    const guardada = await nuevaInscripcion.save();

    res.status(201).json(guardada);
  } catch (error) {
    console.error("ERROR POST INSCRIPCION:", error);
    res.status(500).json({
      error: "Error al crear inscripción",
      detalle: error.message,
    });
  }
});

router.get("/grupo/:grupoId", async (req, res) => {
  try {
    const { grupoId } = req.params;

    const inscripciones = await Inscripcion.find({
      grupoId: String(grupoId).trim(),
    }).lean();

    res.status(200).json(inscripciones);
  } catch (error) {
    console.error("ERROR GET INSCRIPCIONES POR GRUPO:", error);
    res.status(500).json({
      error: "Error al obtener inscripciones del grupo",
      detalle: error.message,
    });
  }
});

router.get("/alumno/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;

    const inscripciones = await Inscripcion.find({
      idAlumno: String(idAlumno).trim(),
    }).lean();

    res.status(200).json(inscripciones);
  } catch (error) {
    console.error("ERROR GET INSCRIPCIONES POR ALUMNO:", error);
    res.status(500).json({
      error: "Error al obtener inscripciones del alumno",
      detalle: error.message,
    });
  }
});

router.delete("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;

    // Verificar si el grupoId es un grupo reagendado (idGrupoNuevo)
    const reagendacionDelGrupoNuevo = await Reagendacion.findOne({
      idAlumno,
      idGrupoNuevo: grupoId,
    }).lean();

    // Si es un grupo reagendado, solo eliminar la reagendación
    if (reagendacionDelGrupoNuevo) {
      const resultadoReagendaciones = await Reagendacion.deleteMany({
        idAlumno,
        idGrupoNuevo: grupoId,
      });

      return res.status(200).json({
        ok: true,
        mensaje: "Reagendación eliminada correctamente",
        reagendacionesEliminadas: resultadoReagendaciones.deletedCount,
      });
    }

    // Si no es un grupo reagendado, proceder con la baja de inscripción
    let inscripcionEliminada = await Inscripcion.findOneAndDelete({
      idAlumno: String(idAlumno).trim(),
      grupoId: String(grupoId).trim(),
    });

    if (!inscripcionEliminada) {
      return res.status(404).json({
        error: "No se encontró la inscripción del alumno en ese grupo",
      });
    }

    // Eliminar reagendaciones asociadas al grupo de origen
    const resultadoReagendaciones = await Reagendacion.deleteMany({
      idAlumno,
      $or: [
        { IdgrupoOrigen: grupoId },
        { idGrupoOrigen: grupoId },
      ],
    });

    res.status(200).json({
      ok: true,
      mensaje: "Alumno dado de baja correctamente del grupo",
      inscripcionEliminada: inscripcionEliminada || null,
      reagendacionesEliminadas: resultadoReagendaciones.deletedCount,
    });
  } catch (error) {
    console.error("ERROR DELETE INSCRIPCION:", error);
    res.status(500).json({
      error: "Error al dar de baja al alumno del grupo",
      detalle: error.message,
    });
  }
});

export default router;