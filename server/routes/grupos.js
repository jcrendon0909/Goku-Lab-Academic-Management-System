import express from "express";
import Grupo from "../models/Grupo.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";
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
      duracionClase,
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

    // Función para convertir hora a minutos
    const horaAMinutos = (hora) => {
      const [h, m] = String(hora).split(":").map(Number);
      return h * 60 + (m || 0);
    };

    // Función para convertir duración a minutos (maneja múltiples formatos)
    const duracionAMinutos = (duracion) => {
      const dur = String(duracion || "2 horas").toLowerCase().trim();
      
      // Si es formato HH:MM
      if (dur.includes(":")) {
        const [h, m] = dur.split(":").map(Number);
        return h * 60 + (m || 0);
      }
      
      // Si es formato "1 hora", "2 horas", etc.
      if (dur.includes("1") && dur.includes("3")) return 90; // 1:30
      if (dur.includes("2") && dur.includes("3")) return 150; // 2:30
      if (dur.includes("3") && dur.includes("3")) return 210; // 3:30
      if (dur.includes("3")) return 180; // 3 horas
      if (dur.includes("2")) return 120; // 2 horas
      if (dur.includes("1")) return 60; // 1 hora
      
      return 120; // Default 2 horas
    };

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

    // Validar que el profesor no tenga empalme de clases
    if (idProfesor && String(idProfesor).trim()) {
      const horaInicio = horaAMinutos(horaClase);
      const duracion = duracionAMinutos(duracionClase);
      const horaFin = horaInicio + duracion;

      const idProfesorNormalizado = normalizar(String(idProfesor).trim());

      // Buscar TODAS las clases del profesor en ese día
      const clasesProfesor = await Grupo.find({
        diaClase: { $regex: `^${String(diaClase).trim()}$`, $options: "i" },
        Estatus: "Activo",
      }).lean();

      // Filtrar las clases que sean del mismo profesor
      const clasesDelProfesor = clasesProfesor.filter((clase) => {
        const idProfesorClase = normalizar(String(clase.idProfesor || clase.IdProfesor || "").trim());
        return idProfesorClase === idProfesorNormalizado && idProfesorClase !== "";
      });

      // Verificar empalmes
      for (const clase of clasesDelProfesor) {
        const horaExistenteInicio = horaAMinutos(clase.horaClase);
        const duracionExistente = duracionAMinutos(clase.duracionClase || "2 horas");
        const horaExistenteFin = horaExistenteInicio + duracionExistente;

        console.log(`Validando empalme:
          Nueva clase: ${horaInicio} - ${horaFin} (${duracion} min)
          Clase existente: ${horaExistenteInicio} - ${horaExistenteFin} (${duracionExistente} min)
        `);

        // Verificar si hay empalme: inicio < fin_existente Y fin > inicio_existente
        if (horaInicio < horaExistenteFin && horaFin > horaExistenteInicio) {
          return res.status(409).json({
            error: `El profesor ${nombreProfesor} ya tiene una clase asignada entre las ${Math.floor(horaExistenteInicio / 60)}:${String(horaExistenteInicio % 60).padStart(2, "0")} y ${Math.floor(horaExistenteFin / 60)}:${String(horaExistenteFin % 60).padStart(2, "0")}. No se puede crear otra clase que se empalme.`,
            clasesConflicto: {
              horaExistenteInicio,
              horaExistenteFin,
              horaInicio,
              horaFin,
            },
          });
        }
      }
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
      modalidad: String(modalidad).trim(),
      CapacidadMaxima: Number(capacidadMaxima),
      Estatus: Estatus || estatus || "Activo",
      fechaCreacion: new Date(),
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
    const { grupo, alumnoExistente, alumnoNuevo } = req.body;

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

    const inscripciones = await Inscripcion.find({
      grupoId,
    }).lean();

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
        error: "No se puede eliminar el grupo porque tiene reagendaciones relacionadas",
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