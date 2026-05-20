import express from "express";
import Grupo from "../models/Grupo.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";
import { generarId } from "../utils/generarId.js";
import {
  crearOActualizarPagoDeInscripcion,
  normalizarDatosPago,
} from "../utils/pagos.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const grupos = await Grupo.find().lean();
    res.json(grupos);
  } catch (error) {
    console.error("ERROR GET GRUPOS:", error);
    res.status(500).json({ error: "Error al obtener grupos" });
  }
});

router.post("/crear-con-alumno", async (req, res) => {
  try {
    const { grupo, alumnoExistente, alumnoNuevo, datosPago } = req.body;

    if (!grupo) {
      return res.status(400).json({ error: "Faltan datos del grupo" });
    }

    const {
      idCurso,
      nombreCurso,
      diaClase,
      horaClase,
      duracionClase = "2 horas",
      idProfesor,
      nombreProfesor,
      comentario,
      comentarioGrupo,
      capacidadMaxima,
      fechaCreacion,
      Estatus,
      estatus,
    } = grupo;

    if (!nombreCurso || !String(nombreCurso).trim()) {
      return res.status(400).json({ error: "Falta nombreCurso" });
    }

    if (!diaClase || !String(diaClase).trim()) {
      return res.status(400).json({ error: "Falta diaClase" });
    }

    if (!horaClase || !String(horaClase).trim()) {
      return res.status(400).json({ error: "Falta horaClase" });
    }

    if (!nombreProfesor || !String(nombreProfesor).trim()) {
      return res.status(400).json({ error: "Falta nombreProfesor" });
    }

    if (!capacidadMaxima || Number(capacidadMaxima) <= 0) {
      return res.status(400).json({ error: "Falta capacidadMaxima válida" });
    }

    if (!alumnoExistente && !alumnoNuevo) {
      return res.status(400).json({
        error: "Debes enviar un alumno existente o un alumno nuevo",
      });
    }

    let datosPagoNormalizados = null;
    try {
      datosPagoNormalizados = normalizarDatosPago(datosPago || {});
    } catch (errorPago) {
      return res.status(400).json({ error: errorPago.message });
    }

    const grupoExistente = await Grupo.findOne({
      nombreCurso: { $regex: `^${String(nombreCurso).trim()}$`, $options: "i" },
      diaClase: { $regex: `^${String(diaClase).trim()}$`, $options: "i" },
      horaClase: String(horaClase).trim(),
      $or: [
        ...(idProfesor ? [{ idProfesor: String(idProfesor).trim() }] : []),
        {
          nombreProfesor: {
            $regex: `^${String(nombreProfesor).trim()}$`,
            $options: "i",
          },
        },
      ],
    }).lean();

    if (grupoExistente) {
      return res.status(409).json({
        error: "Ya existe un grupo con ese curso, profesor, día y hora",
        grupoExistente,
      });
    }

    let alumnoFinal = null;

    if (alumnoExistente) {
      const idAlumnoBuscado =
        alumnoExistente.idAlumno || alumnoExistente["idAlumno "] || "";

      if (!idAlumnoBuscado) {
        return res.status(400).json({
          error: "El alumno existente no tiene idAlumno",
        });
      }

      alumnoFinal = {
        idAlumno: idAlumnoBuscado,
        nombreAlumno:
          alumnoExistente.nombreAlumno || alumnoExistente.nombre || "",
        modalidad: alumnoExistente.modalidad || "Presencial",
      };
    }

    if (alumnoNuevo) {
      if (!alumnoNuevo.nombreAlumno || !String(alumnoNuevo.nombreAlumno).trim()) {
        return res.status(400).json({
          error: "Falta nombreAlumno del alumno nuevo",
        });
      }

      const nuevoIdAlumno = await generarId("alumno");
      const nombreLimpio = String(alumnoNuevo.nombreAlumno).trim();

      const nuevoAlumno = new Alumno({
        idAlumno: nuevoIdAlumno,
        nombreAlumno: nombreLimpio,
        nombre: nombreLimpio,
        telefono: alumnoNuevo.telefono || "",
        tutor: alumnoNuevo.tutor || "",
        observaciones: alumnoNuevo.observaciones || "",
        estatus: alumnoNuevo.estatus || "Activo",
      });

      const alumnoGuardado = await nuevoAlumno.save();

      alumnoFinal = {
        idAlumno: alumnoGuardado.idAlumno,
        nombreAlumno: alumnoGuardado.nombreAlumno || alumnoGuardado.nombre || "",
        modalidad: alumnoNuevo.modalidad || "Presencial",
      };
    }

    if (!alumnoFinal?.idAlumno) {
      return res.status(400).json({
        error: "No se pudo resolver el alumno final",
      });
    }

    const nuevoIdGrupo = await generarId("grupo");

    const nuevoGrupo = new Grupo({
      IdGrupo: nuevoIdGrupo,
      idCurso: idCurso || "",
      nombreCurso: String(nombreCurso).trim(),
      diaClase: String(diaClase).trim(),
      horaClase: String(horaClase).trim(),
      duracionClase: duracionClase || "2 horas",
      idProfesor: idProfesor || "",
      nombreProfesor: String(nombreProfesor).trim(),
      comentario: String(comentario ?? comentarioGrupo ?? "").trim(),
      CapacidadMaxima: Number(capacidadMaxima),
      Estatus: Estatus || estatus || "Activo",
      fechaCreacion: fechaCreacion ? new Date(fechaCreacion) : new Date(),
    });

    const grupoGuardado = await nuevoGrupo.save();

    const inscripcionExistente = await Inscripcion.findOne({
      idAlumno: alumnoFinal.idAlumno,
      grupoId: grupoGuardado.IdGrupo,
    }).lean();

    if (inscripcionExistente) {
      return res.status(409).json({
        error: "El alumno ya está inscrito en este grupo",
      });
    }

    const nuevaInscripcion = new Inscripcion({
      idAlumno: alumnoFinal.idAlumno,
      nombreAlumno: alumnoFinal.nombreAlumno,
      grupoId: grupoGuardado.IdGrupo,
      modalidad: alumnoFinal.modalidad,
      montoMensualidad: datosPagoNormalizados?.montoMensualidad ?? null,
      fechaPago: datosPagoNormalizados?.fechaPago ?? null,
      diaPagoFijo: datosPagoNormalizados?.diaPagoFijo ?? null,
      comentarios: datosPagoNormalizados?.comentarios ?? "",
    });

    const inscripcionGuardada = await nuevaInscripcion.save();

    const pago = await crearOActualizarPagoDeInscripcion({
      idAlumno: alumnoFinal.idAlumno,
      nombreAlumno: alumnoFinal.nombreAlumno,
      grupoId: grupoGuardado.IdGrupo,
      nombreCurso: grupoGuardado.nombreCurso,
      datosPago: datosPagoNormalizados,
    });

    res.status(201).json({
      ok: true,
      grupo: grupoGuardado,
      alumno: alumnoFinal,
      inscripcion: inscripcionGuardada,
      pago,
    });
  } catch (error) {
    console.error("ERROR POST /crear-con-alumno:", error);
    res.status(500).json({
      error: "Error al crear grupo con alumno",
      detalle: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      idCurso,
      nombreCurso,
      diaClase,
      horaClase,
      duracionClase = "2 horas",
      idProfesor,
      nombreProfesor,
      comentario,
      comentarioGrupo,
      capacidadMaxima,
      fechaCreacion,
      Estatus,
      estatus,
    } = req.body;

    const nuevoIdGrupo = await generarId("grupo");

    const nuevoGrupo = new Grupo({
      IdGrupo: nuevoIdGrupo,
      idCurso: idCurso || "",
      nombreCurso: String(nombreCurso).trim(),
      diaClase: String(diaClase).trim(),
      horaClase: String(horaClase).trim(),
      duracionClase: duracionClase || "2 horas",
      idProfesor: idProfesor || "",
      nombreProfesor: String(nombreProfesor).trim(),
      comentario: String(comentario ?? comentarioGrupo ?? "").trim(),
      CapacidadMaxima: Number(capacidadMaxima),
      Estatus: Estatus || estatus || "Activo",
      fechaCreacion: fechaCreacion ? new Date(fechaCreacion) : new Date(),
    });

    const guardado = await nuevoGrupo.save();

    res.status(201).json(guardado);
  } catch (error) {
    console.error("ERROR POST GRUPOS:", error);
    res.status(500).json({
      error: "Error al crear grupo",
      detalle: error.message,
    });
  }
});

router.patch("/:grupoId/comentario", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const comentario = String(
      req.body?.comentario ?? req.body?.comentarioGrupo ?? ""
    ).trim();

    const grupo = await Grupo.findOneAndUpdate(
      {
        $or: [{ IdGrupo: grupoId }, { idGrupo: grupoId }, { GrupoId: grupoId }],
      },
      { $set: { comentario } },
      { new: true }
    ).lean();

    if (!grupo) {
      return res.status(404).json({
        error: "No se encontrÃ³ el grupo",
      });
    }

    res.status(200).json({
      ok: true,
      grupo,
    });
  } catch (error) {
    console.error("ERROR PATCH COMENTARIO GRUPO:", error);
    res.status(500).json({
      error: "Error al actualizar comentario del grupo",
      detalle: error.message,
    });
  }
});

router.delete("/:grupoId", async (req, res) => {
  try {
    const { grupoId } = req.params;

    const grupo = await Grupo.findOne({
      $or: [{ IdGrupo: grupoId }, { idGrupo: grupoId }, { GrupoId: grupoId }],
    });

    if (!grupo) {
      return res.status(404).json({
        error: "No se encontró el grupo",
      });
    }

    const inscripciones = await Inscripcion.find({ grupoId }).lean();

    if (inscripciones.length > 0) {
      return res.status(409).json({
        error: "No se puede eliminar el grupo porque tiene alumnos inscritos",
        alumnosInscritos: inscripciones.length,
      });
    }

    const reagendacionesRelacionadas = await Reagendacion.find({
      $or: [
        { IdgrupoOrigen: grupoId },
        { idGrupoOrigen: grupoId },
        { idGrupoNuevo: grupoId },
      ],
    }).lean();

    if (reagendacionesRelacionadas.length > 0) {
      return res.status(409).json({
        error:
          "No se puede eliminar el grupo porque tiene reagendaciones relacionadas",
        reagendacionesRelacionadas: reagendacionesRelacionadas.length,
      });
    }

    await Grupo.deleteOne({ _id: grupo._id });

    res.status(200).json({
      ok: true,
      mensaje: "Grupo eliminado correctamente",
      grupoEliminado: grupo,
    });
  } catch (error) {
    console.error("ERROR DELETE GRUPO:", error);
    res.status(500).json({
      error: "Error al eliminar grupo",
      detalle: error.message,
    });
  }
});

export default router;
