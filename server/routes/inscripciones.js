import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";

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

    if (!idAlumno) {
      return res.status(400).json({ error: "Falta idAlumno" });
    }

    if (!nombreAlumno || !String(nombreAlumno).trim()) {
      return res.status(400).json({ error: "Falta nombreAlumno" });
    }

    if (!grupoId) {
      return res.status(400).json({ error: "Falta grupoId" });
    }

    const inscripcionExistente = await Inscripcion.findOne({
      idAlumno,
      $or: [
        { grupoId },
        { GrupoId: grupoId },
        { idGrupo: grupoId },
        { IdGrupo: grupoId },
      ],
    }).lean();

    if (inscripcionExistente) {
      return res.status(409).json({
        error: "El alumno ya está inscrito en este grupo",
      });
    }

    const nuevaInscripcion = new Inscripcion({
      idAlumno,
      nombreAlumno: String(nombreAlumno).trim(),
      grupoId,
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
      $or: [
        { grupoId },
        { GrupoId: grupoId },
        { idGrupo: grupoId },
        { IdGrupo: grupoId },
      ],
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
      idAlumno,
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

    let grupoUsadoParaBaja = grupoId;

    let inscripcionEliminada = await Inscripcion.findOneAndDelete({
      idAlumno,
      $or: [
        { grupoId },
        { GrupoId: grupoId },
        { idGrupo: grupoId },
        { IdGrupo: grupoId },
      ],
    });

    const reagendacionesRelacionadasDirectas = await Reagendacion.find({
      idAlumno,
      $or: [
        { IdgrupoOrigen: grupoId },
        { idGrupoOrigen: grupoId },
        { idGrupoNuevo: grupoId },
      ],
    }).lean();

    if (!inscripcionEliminada && reagendacionesRelacionadasDirectas.length > 0) {
      const reagendacion = reagendacionesRelacionadasDirectas[0];

      const grupoOrigenReal =
        reagendacion.IdgrupoOrigen ||
        reagendacion.idGrupoOrigen ||
        "";

      if (grupoOrigenReal) {
        grupoUsadoParaBaja = grupoOrigenReal;

        inscripcionEliminada = await Inscripcion.findOneAndDelete({
          idAlumno,
          $or: [
            { grupoId: grupoOrigenReal },
            { GrupoId: grupoOrigenReal },
            { idGrupo: grupoOrigenReal },
            { IdGrupo: grupoOrigenReal },
          ],
        });
      }
    }

    const resultadoReagendaciones = await Reagendacion.deleteMany({
      idAlumno,
      $or: [
        { IdgrupoOrigen: grupoId },
        { idGrupoOrigen: grupoId },
        { idGrupoNuevo: grupoId },
        { IdgrupoOrigen: grupoUsadoParaBaja },
        { idGrupoOrigen: grupoUsadoParaBaja },
        { idGrupoNuevo: grupoUsadoParaBaja },
      ],
    });

    const huboReagendaciones = resultadoReagendaciones.deletedCount > 0;
    const huboInscripcion = Boolean(inscripcionEliminada);

    if (!huboInscripcion && !huboReagendaciones) {
      return res.status(404).json({
        error: "No se encontró la inscripción ni reagendaciones del alumno en ese grupo",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Alumno dado de baja correctamente del grupo",
      grupoUsadoParaBaja,
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