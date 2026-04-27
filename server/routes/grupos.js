import express from "express";
import Grupo from "../models/Grupo.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

const normalizar = (valor) => String(valor || "").trim().toUpperCase();

router.get("/", async (req, res) => {
  try {
    const grupos = await Grupo.find().lean();
    res.json(grupos);
  } catch (error) {
    console.error("ERROR GET GRUPOS:", error);
    res.status(500).json({ error: "Error al obtener grupos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      idCurso,
      nombreCurso,
      diaClase,
      horaClase,
      idProfesor,
      nombreProfesor,
      modalidad,
      capacidadMaxima,
      Estatus,
      estatus,
    } = req.body;

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

    if (!modalidad || !String(modalidad).trim()) {
      return res.status(400).json({ error: "Falta modalidad" });
    }

    if (!capacidadMaxima || Number(capacidadMaxima) <= 0) {
      return res.status(400).json({ error: "Falta capacidadMaxima válida" });
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

    const nuevoIdGrupo = await generarId("grupo");

    const nuevoGrupo = new Grupo({
      IdGrupo: nuevoIdGrupo,
      idCurso: idCurso || "",
      nombreCurso: String(nombreCurso).trim(),
      diaClase: String(diaClase).trim(),
      horaClase: String(horaClase).trim(),
      idProfesor: idProfesor || "",
      nombreProfesor: String(nombreProfesor).trim(),
      modalidad: String(modalidad).trim(),
      CapacidadMaxima: Number(capacidadMaxima),
      Estatus: Estatus || estatus || "Activo",
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

router.post("/crear-con-alumno", async (req, res) => {
  try {
    const {
      grupo,
      alumnoExistente,
      alumnoNuevo,
    } = req.body;

    if (!grupo) {
      return res.status(400).json({ error: "Faltan datos del grupo" });
    }

    const {
      idCurso,
      nombreCurso,
      diaClase,
      horaClase,
      idProfesor,
      nombreProfesor,
      modalidad,
      capacidadMaxima,
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

    if (!modalidad || !String(modalidad).trim()) {
      return res.status(400).json({ error: "Falta modalidad" });
    }

    if (!capacidadMaxima || Number(capacidadMaxima) <= 0) {
      return res.status(400).json({ error: "Falta capacidadMaxima válida" });
    }

    if (!alumnoExistente && !alumnoNuevo) {
      return res.status(400).json({
        error: "Debes enviar un alumno existente o un alumno nuevo",
      });
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
        alumnoExistente.idAlumno ||
        alumnoExistente["idAlumno "] ||
        "";

      if (!idAlumnoBuscado) {
        return res.status(400).json({
          error: "El alumno existente no tiene idAlumno",
        });
      }

      alumnoFinal = {
        idAlumno: idAlumnoBuscado,
        nombreAlumno:
          alumnoExistente.nombreAlumno ||
          alumnoExistente.nombre ||
          "",
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
      idProfesor: idProfesor || "",
      nombreProfesor: String(nombreProfesor).trim(),
      modalidad: String(modalidad).trim(),
      CapacidadMaxima: Number(capacidadMaxima),
      Estatus: Estatus || estatus || "Activo",
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
    });

    const inscripcionGuardada = await nuevaInscripcion.save();

    res.status(201).json({
      ok: true,
      grupo: grupoGuardado,
      alumno: alumnoFinal,
      inscripcion: inscripcionGuardada,
    });
  } catch (error) {
    console.error("ERROR POST /crear-con-alumno:", error);
    res.status(500).json({
      error: "Error al crear grupo con alumno",
      detalle: error.message,
    });
  }
});

export default router;