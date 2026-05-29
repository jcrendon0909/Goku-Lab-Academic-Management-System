import express from "express";
import Grupo from "../models/Grupo.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";
import Profesor from "../models/Profesor.js";
import Curso from "../models/Curso.js";
import { generarId } from "../utils/generarId.js";
import { parseFechaFlexible } from "../utils/parseFechas.js";
import {
  crearOActualizarPagoDeInscripcion,
  normalizarDatosPago,
  validarMesPrimerCobro,
} from "../utils/pagos.js";

const normalizarHoraClase = (hora) => {
  const texto = String(hora || "").trim();
  const match = texto.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return texto;
  return `${String(match[1]).padStart(2, "0")}:${match[2]}`;
};

const router = express.Router();

const idGrupoDeDocumento = (grupo) =>
  String(grupo?.IdGrupo || grupo?.idGrupo || grupo?.GrupoId || "").trim();

const filtroInscripcionesPorGrupo = (idGrupo) => ({
  $or: [
    { grupoId: idGrupo },
    { GrupoId: idGrupo },
    { idGrupo: idGrupo },
    { IdGrupo: idGrupo },
  ],
});

const esInscripcionActiva = (ins) => {
  const estatus = String(ins?.estatus || "Activa").trim().toLowerCase();
  return estatus !== "baja";
};

/** Misma lógica que el calendario: activa y ya vigente por fechaInscripcion */
const inscripcionCuentaParaCalendario = (ins) => {
  if (!esInscripcionActiva(ins)) return false;
  const fechaInscripcion = ins.fechaInscripcion
    ? new Date(ins.fechaInscripcion)
    : null;
  if (fechaInscripcion && fechaInscripcion.getTime() > Date.now()) {
    return false;
  }
  return true;
};

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
    const { grupo, alumnoExistente, alumnoNuevo, datosPago, fechaInscripcion } =
      req.body;

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

    const capacidadGrupo =
      Number(capacidadMaxima) > 0 ? Number(capacidadMaxima) : 8;

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

    const fechaInscripcionFinal =
      parseFechaFlexible(fechaInscripcion || fechaCreacion) || new Date();

    const errorMesCobro = validarMesPrimerCobro(
      fechaInscripcionFinal,
      datosPagoNormalizados.fechaInicioPago
    );
    if (errorMesCobro) {
      return res.status(400).json({ error: errorMesCobro });
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

    const horaNormalizada = normalizarHoraClase(horaClase);

    const grupoExistente = await Grupo.findOne({
      nombreCurso: { $regex: `^${String(nombreCurso).trim()}$`, $options: "i" },
      diaClase: { $regex: `^${String(diaClase).trim()}$`, $options: "i" },
      horaClase: horaNormalizada,
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

    let grupoGuardado = grupoExistente;
    let grupoCreado = false;

    if (!grupoExistente) {
      const nuevoIdGrupo = await generarId("grupo");

      const nuevoGrupo = new Grupo({
        IdGrupo: nuevoIdGrupo,
        idCurso: idCurso || "",
        nombreCurso: String(nombreCurso).trim(),
        diaClase: String(diaClase).trim(),
        horaClase: horaNormalizada,
        duracionClase: duracionClase || "2 horas",
        idProfesor: idProfesor || "",
        nombreProfesor: String(nombreProfesor).trim(),
        comentario: String(comentario ?? comentarioGrupo ?? "").trim(),
        CapacidadMaxima: capacidadGrupo,
        Estatus: Estatus || estatus || "Activo",
        // El horario del grupo existe desde hoy; la inscripción controla cuándo aparece el alumno
        fechaCreacion: parseFechaFlexible(grupo.fechaCreacion) || new Date(),
      });

      grupoGuardado = await nuevoGrupo.save();
      grupoCreado = true;
    }

    const idGrupoFinal = idGrupoDeDocumento(grupoGuardado);

    const inscripcionExistente = await Inscripcion.findOne({
      idAlumno: alumnoFinal.idAlumno,
      grupoId: idGrupoFinal,
    }).lean();

    if (inscripcionExistente && esInscripcionActiva(inscripcionExistente)) {
      return res.status(409).json({
        error: "El alumno ya está inscrito en este grupo",
      });
    }

    const datosInscripcion = {
      nombreAlumno: alumnoFinal.nombreAlumno,
      modalidad: alumnoFinal.modalidad,
      montoMensualidad: datosPagoNormalizados.montoMensualidad,
      diaPago: datosPagoNormalizados.diaPago,
      fechaInicioPago: datosPagoNormalizados.fechaInicioPago,
      comentarios: datosPagoNormalizados.comentarios ?? "",
      fechaInscripcion: fechaInscripcionFinal,
      estatus: "Activa",
      fechaBaja: null,
      motivoBaja: "",
    };

    let inscripcionGuardada;

    if (inscripcionExistente) {
      inscripcionGuardada = await Inscripcion.findOneAndUpdate(
        { _id: inscripcionExistente._id },
        { $set: datosInscripcion },
        { new: true }
      );
    } else {
      inscripcionGuardada = await new Inscripcion({
        idAlumno: alumnoFinal.idAlumno,
        grupoId: idGrupoFinal,
        ...datosInscripcion,
      }).save();
    }

    const pago = await crearOActualizarPagoDeInscripcion({
      idAlumno: alumnoFinal.idAlumno,
      nombreAlumno: alumnoFinal.nombreAlumno,
      grupoId: idGrupoFinal,
      nombreCurso: grupoGuardado.nombreCurso,
      datosPago: datosPagoNormalizados,
    });

    res.status(201).json({
      ok: true,
      grupoCreado,
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

// Reasignar (o quitar) el profesor de un grupo existente
router.patch("/:grupoId/profesor", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const idProfesor = String(req.body?.idProfesor || "").trim();

    // Si no se manda idProfesor, se deja el grupo sin profesor asignado
    let datosProfesor = { idProfesor: "", nombreProfesor: "" };

    if (idProfesor) {
      const profesor = await Profesor.findOne({ idProfesor });
      if (!profesor) {
        return res.status(404).json({ error: "Maestro no encontrado" });
      }
      datosProfesor = {
        idProfesor: profesor.idProfesor,
        nombreProfesor: profesor.nombre,
      };
    }

    const grupo = await Grupo.findOneAndUpdate(
      {
        $or: [{ IdGrupo: grupoId }, { idGrupo: grupoId }, { GrupoId: grupoId }],
      },
      { $set: datosProfesor },
      { new: true }
    ).lean();

    if (!grupo) {
      return res.status(404).json({ error: "No se encontró el grupo" });
    }

    res.status(200).json({ ok: true, grupo });
  } catch (error) {
    console.error("ERROR PATCH PROFESOR GRUPO:", error);
    res.status(500).json({
      error: "Error al reasignar el profesor del grupo",
      detalle: error.message,
    });
  }
});

// Reasignar el curso de un grupo existente (para grupos que quedaron sin curso)
router.patch("/:grupoId/curso", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const idCurso = String(req.body?.idCurso || "").trim();

    if (!idCurso) {
      return res.status(400).json({ error: "Falta el curso a asignar" });
    }

    const curso = await Curso.findOne({ idCurso });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    const grupo = await Grupo.findOneAndUpdate(
      {
        $or: [{ IdGrupo: grupoId }, { idGrupo: grupoId }, { GrupoId: grupoId }],
      },
      { $set: { idCurso: curso.idCurso, nombreCurso: curso.nombreCurso } },
      { new: true }
    ).lean();

    if (!grupo) {
      return res.status(404).json({ error: "No se encontró el grupo" });
    }

    res.status(200).json({ ok: true, grupo });
  } catch (error) {
    console.error("ERROR PATCH CURSO GRUPO:", error);
    res.status(500).json({
      error: "Error al reasignar el curso del grupo",
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

    const idGrupoCanonico = idGrupoDeDocumento(grupo) || String(grupoId).trim();
    const filtroGrupo = filtroInscripcionesPorGrupo(idGrupoCanonico);

    const inscripciones = await Inscripcion.find(filtroGrupo).lean();
    const inscripcionesActivas = inscripciones.filter(inscripcionCuentaParaCalendario);

    if (inscripcionesActivas.length > 0) {
      return res.status(409).json({
        error:
          "No se puede eliminar el grupo porque tiene alumnos activos en el calendario",
        alumnosInscritos: inscripcionesActivas.length,
        alumnos: inscripcionesActivas.map((ins) => ({
          idAlumno: ins.idAlumno,
          nombreAlumno: ins.nombreAlumno,
          estatus: ins.estatus || "Activa",
        })),
      });
    }

    const reagendacionesRelacionadas = await Reagendacion.find({
      $or: [
        { idGrupoOrigen: idGrupoCanonico },
        { IdgrupoOrigen: idGrupoCanonico },
        { idGrupoNuevo: idGrupoCanonico },
        { IdgrupoNuevo: idGrupoCanonico },
      ],
    }).lean();

    const reagendacionesActivas = reagendacionesRelacionadas.filter(
      (r) => String(r.estatus || "reagendado").toLowerCase() !== "cancelado"
    );

    if (reagendacionesActivas.length > 0) {
      return res.status(409).json({
        error:
          "No se puede eliminar el grupo porque tiene reagendaciones activas. Elimínalas desde el calendario primero.",
        reagendacionesRelacionadas: reagendacionesActivas.length,
      });
    }

    if (inscripciones.length > 0) {
      await Inscripcion.deleteMany(filtroGrupo);
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
