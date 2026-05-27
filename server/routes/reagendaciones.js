import express from "express";
import Reagendacion from "../models/Reagendacion.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import { generarId } from "../utils/generarId.js";
import { parseFechaFlexible } from "../utils/parseFechas.js";
import { notificarReagendacionProfesor } from "../utils/notificaciones.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const reagendaciones = await Reagendacion.find().lean();
    console.log("GET /api/reagendaciones:", reagendaciones);
    res.status(200).json(reagendaciones);
  } catch (error) {
    console.error("ERROR GET REAGENDACIONES:", error);
    res.status(500).json({
      error: "Error al obtener reagendaciones",
      detalle: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("BODY REAGENDACION RECIBIDO:", req.body);

    const {
      idAlumno,
      nombreAlumno,
      IdgrupoOrigen,
      idGrupoOrigen,
      idGrupoNuevo,
      nombreCurso,
      profesorOriginal,
      profesorNuevo,
      idProfesorOriginal,
      idProfesorNuevo,
      fechaHoraOriginal,
      fechaHoraNueva,
      duracion,
      modalidad,
      motivo,
      tipoReagendacion,
      comentario,
      comentarios,
      FechaMovimiento,
      estatus,
    } = req.body;

    // ✅ CAMBIO 1D: Normalizar nombre del campo a idGrupoOrigen
    const grupoOrigenFinal = idGrupoOrigen || IdgrupoOrigen || "";
    const grupoNuevoFinal = idGrupoNuevo || "";

    if (!idAlumno) {
      return res.status(400).json({ error: "Falta idAlumno" });
    }

    if (!nombreAlumno) {
      return res.status(400).json({ error: "Falta nombreAlumno" });
    }

    if (!grupoOrigenFinal) {
      return res.status(400).json({ error: "Falta idGrupoOrigen" });
    }

    if (!grupoNuevoFinal) {
      return res.status(400).json({ error: "Falta idGrupoNuevo" });
    }

    if (!fechaHoraOriginal) {
      return res.status(400).json({ error: "Falta fechaHoraOriginal" });
    }

    if (!fechaHoraNueva) {
      return res.status(400).json({ error: "Falta fechaHoraNueva" });
    }

    // ✅ CAMBIO 4: Usar parseador centralizado de fechas
    // Reemplaza la lógica inline de parseFecha con la versión unificada
    const fechaOriginalDate = parseFechaFlexible(fechaHoraOriginal);
    const fechaNuevaDate = parseFechaFlexible(fechaHoraNueva);

    if (!fechaOriginalDate) {
      return res.status(400).json({ 
        error: "fechaHoraOriginal no es una fecha válida (usa YYYY-MM-DD o ISO 8601)" 
      });
    }

    if (!fechaNuevaDate) {
      return res.status(400).json({ 
        error: "fechaHoraNueva no es una fecha válida (usa YYYY-MM-DD o ISO 8601)" 
      });
    }

    // ✅ CAMBIO 3c: Validar que alumno existe
    const alumnoExiste = await Alumno.findOne({
      idAlumno: String(idAlumno).trim()
    }).lean();

    if (!alumnoExiste) {
      return res.status(404).json({
        error: `Alumno "${idAlumno}" no existe`
      });
    }

    // ✅ CAMBIO 3d: Validar que alumno está inscrito en grupo origen
    const inscripcionOrigen = await Inscripcion.findOne({
      idAlumno: String(idAlumno).trim(),
      grupoId: grupoOrigenFinal
    }).lean();

    if (!inscripcionOrigen) {
      return res.status(404).json({
        error: `Alumno no está inscrito en el grupo origen "${grupoOrigenFinal}"`
      });
    }

    const datosReagendacion = {
      idAlumno,
      nombreAlumno,
      idGrupoOrigen: grupoOrigenFinal, // ✅ Normalizado
      idGrupoNuevo: grupoNuevoFinal,
      nombreCurso: nombreCurso || "",
      profesorOriginal: profesorOriginal || "",
      profesorNuevo: profesorNuevo || "",
      idProfesorOriginal: idProfesorOriginal || "",
      idProfesorNuevo: idProfesorNuevo || "",
      // ✅ CAMBIO CRÍTICO: Fechas como Date, no como strings
      fechaHoraOriginal: fechaOriginalDate,
      fechaHoraNueva: fechaNuevaDate,
      duracion: duracion || "2 horas",
      modalidad: modalidad || "Presencial",
      motivo: motivo || "Reagendado desde sistema",
      tipoReagendacion: tipoReagendacion || "temporal", // ✅ NUEVO
      comentario: String(comentario || comentarios || "").trim(),
      FechaMovimiento: new Date(), // ✅ Ahora es Date, no string ISO
      estatus: estatus || "reagendado",
    };

    // ✅ CAMBIO: Buscar por idGrupoOrigen (campo normalizado)
    const actualizada = await Reagendacion.findOneAndUpdate(
      {
        idAlumno,
        idGrupoOrigen: grupoOrigenFinal,
        fechaHoraOriginal: fechaOriginalDate,
      },
      { $set: datosReagendacion },
      { new: true }
    );

    if (actualizada) {
      console.log("REAGENDACION ACTUALIZADA:", actualizada);
      
      // ✅ CAMBIO 6: Notificar al profesor sobre la actualización
      if (idProfesorOriginal) {
        await notificarReagendacionProfesor(actualizada.ReagendacionId, idProfesorOriginal);
      }
      if (idProfesorNuevo && idProfesorNuevo !== idProfesorOriginal) {
        await notificarReagendacionProfesor(actualizada.ReagendacionId, idProfesorNuevo);
      }
      
      return res.status(200).json(actualizada);
    }

    const nuevoReagendacionId = await generarId("reagendacion");

    const nuevaReagendacion = new Reagendacion({
      ReagendacionId: nuevoReagendacionId,
      ...datosReagendacion,
    });

    console.log("DOCUMENTO A GUARDAR:", nuevaReagendacion);

    const guardada = await nuevaReagendacion.save();

    console.log("REAGENDACION GUARDADA:", guardada);

    // ✅ CAMBIO 6: Notificar al profesor sobre la reagendación
    if (idProfesorOriginal) {
      await notificarReagendacionProfesor(nuevoReagendacionId, idProfesorOriginal);
    }
    if (idProfesorNuevo && idProfesorNuevo !== idProfesorOriginal) {
      await notificarReagendacionProfesor(nuevoReagendacionId, idProfesorNuevo);
    }

    res.status(201).json(guardada);
  } catch (error) {
    console.error("ERROR AL GUARDAR REAGENDACION:", error);
    res.status(500).json({
      error: "Error al guardar reagendación",
      detalle: error.message,
    });
  }
});

// Eliminar reagendación de un alumno específico (mantiene la inscripción)
router.delete("/alumno/:idAlumno/:idGrupoNuevo", async (req, res) => {
  try {
    const { idAlumno, idGrupoNuevo } = req.params;

    const eliminada = await Reagendacion.findOneAndDelete({
      idAlumno,
      idGrupoNuevo,
    });

    if (!eliminada) {
      return res.status(404).json({
        error: "No se encontró la reagendación del alumno",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Reagendación eliminada correctamente",
      reagendacion: eliminada,
    });
  } catch (error) {
    console.error("ERROR DELETE REAGENDACION ALUMNO:", error);
    res.status(500).json({
      error: "Error al eliminar reagendación",
      detalle: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const eliminada =
      (await Reagendacion.findByIdAndDelete(id)) ||
      (await Reagendacion.findOneAndDelete({ ReagendacionId: id }));

    if (!eliminada) {
      const resultadoGrupo = await Reagendacion.deleteMany({ idGrupoNuevo: id });

      if (resultadoGrupo.deletedCount > 0) {
        return res.status(200).json({
          ok: true,
          mensaje: "Reagendación eliminada correctamente",
          reagendacionesEliminadas: resultadoGrupo.deletedCount,
        });
      }

      return res.status(404).json({
        error: "No se encontró la reagendación",
      });
    }

    res.status(200).json({
      ok: true,
      mensaje: "Reagendación eliminada correctamente",
      reagendacion: eliminada,
    });
  } catch (error) {
    console.error("ERROR DELETE REAGENDACION:", error);
    res.status(500).json({
      error: "Error al eliminar reagendación",
      detalle: error.message,
    });
  }
});

export default router;
