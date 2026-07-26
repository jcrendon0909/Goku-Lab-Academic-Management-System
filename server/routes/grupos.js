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

// ===== GET / =====
router.get("/", async (req, res) => {
  try {
    const grupos = await Grupo.find().lean();
    res.json(grupos);
  } catch (error) {
    console.error("ERROR GET GRUPOS:", error);
    res.status(500).json({ error: "Error al obtener grupos" });
  }
});

// ===== GET /con-ocupacion =====
router.get("/con-ocupacion", async (req, res) => {
  try {
    const grupos = await Grupo.find({ Estatus: "Activo" }).lean();
    const ids = grupos.map(g => g.IdGrupo);
    const inscripciones = await Inscripcion.aggregate([
      { $match: { grupoId: { $in: ids }, estatus: "Activa" } },
      { $group: { _id: "$grupoId", count: { $sum: 1 } } }
    ]);
    const ocupacionMap = {};
    inscripciones.forEach(item => { ocupacionMap[item._id] = item.count; });

    const resultado = grupos.map(g => ({
      ...g,
      alumnosInscritos: ocupacionMap[g.IdGrupo] || 0
    }));
    res.json(resultado);
  } catch (error) {
    console.error("ERROR /con-ocupacion:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST / (CREAR GRUPO) =====
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
      CapacidadMaxima: Number(capacidadMaxima) || 8,
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

// ===== POST /crear-con-alumno (ya existe, omitimos para no repetir) =====
// (mantén tu código existente para /crear-con-alumno, no lo toco)

// ===== PATCH /:grupoId/comentario =====
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
        error: "No se encontró el grupo",
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

// ===== PATCH /:grupoId/profesor =====
router.patch("/:grupoId/profesor", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const idProfesor = String(req.body?.idProfesor || "").trim();

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

// ===== PATCH /:grupoId/curso =====
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

// ===== DELETE /:grupoId =====
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

// ============================================================
// EDITAR GRUPO (VALIDACIÓN MODIFICADA: PERMITE CAMBIAR CURSO)
// ============================================================
router.patch("/:grupoId", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const {
      idCurso,
      nombreCurso,
      diaClase,
      horaClase,
      duracionClase,
      idProfesor,
      nombreProfesor,
      comentario,
      CapacidadMaxima,
      Estatus,
    } = req.body;

    // Buscar el grupo actual
    const grupo = await Grupo.findOne({
      $or: [{ IdGrupo: grupoId }, { idGrupo: grupoId }, { GrupoId: grupoId }],
    });
    if (!grupo) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    // --- VALIDACIONES ---

    // 1. Si se intenta desactivar, verificar que no haya alumnos activos
    if (Estatus === "Inactivo" && grupo.Estatus !== "Inactivo") {
      const activos = await Inscripcion.countDocuments({
        grupoId: grupo.IdGrupo,
        estatus: "Activa",
      });
      if (activos > 0) {
        return res.status(409).json({
          error: "No se puede desactivar el grupo porque tiene alumnos activos",
          alumnosInscritos: activos,
        });
      }
    }

    // 2. VALIDACIÓN DE CAPACIDAD (solo bloquea si la capacidad cambia a un valor menor)
    //    PERMITE CAMBIAR EL CURSO (comentado)
    if (grupo.Estatus === "Activo") {
      const activos = await Inscripcion.countDocuments({
        grupoId: grupo.IdGrupo,
        estatus: "Activa",
      });

      if (activos > 0) {
        // *** CAMBIO: PERMITIR CAMBIO DE CURSO (comentamos la validación de curso) ***
        // let cursoCambia = false;
        // if (idCurso !== undefined && String(idCurso) !== String(grupo.idCurso)) {
        //   cursoCambia = true;
        // }
        // if (nombreCurso !== undefined && idCurso === undefined && nombreCurso !== grupo.nombreCurso) {
        //   cursoCambia = true;
        // }

        // Solo bloqueamos si la capacidad cambia a un valor menor (para proteger integridad)
        const capacidadCambia =
          CapacidadMaxima !== undefined && Number(CapacidadMaxima) < Number(grupo.CapacidadMaxima);

        if (capacidadCambia) {
          return res.status(409).json({
            error: "No se puede reducir la capacidad de un grupo con alumnos activos",
          });
        }

        // Si la capacidad aumenta o se mantiene, se permite
      }
    }

    // --- Construir updateData ---
    const updateData = {};

    if (idCurso !== undefined) {
      const curso = await Curso.findOne({ idCurso });
      if (!curso) {
        return res.status(404).json({ error: "Curso no encontrado" });
      }
      updateData.idCurso = idCurso;
      updateData.nombreCurso = curso.nombreCurso;
    } else if (nombreCurso !== undefined) {
      updateData.nombreCurso = nombreCurso;
    }

    if (idProfesor !== undefined) {
      const profesor = await Profesor.findOne({ idProfesor });
      if (!profesor) {
        return res.status(404).json({ error: "Profesor no encontrado" });
      }
      updateData.idProfesor = idProfesor;
      updateData.nombreProfesor = profesor.nombre;
    } else if (nombreProfesor !== undefined) {
      updateData.nombreProfesor = nombreProfesor;
    }

    if (diaClase !== undefined) updateData.diaClase = diaClase;
    if (horaClase !== undefined) updateData.horaClase = horaClase;
    if (duracionClase !== undefined) updateData.duracionClase = duracionClase;
    if (comentario !== undefined) updateData.comentario = comentario;
    if (CapacidadMaxima !== undefined) updateData.CapacidadMaxima = CapacidadMaxima;
    if (Estatus !== undefined) updateData.Estatus = Estatus;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No se enviaron campos para actualizar" });
    }

    // Actualizar
    const grupoActualizado = await Grupo.findOneAndUpdate(
      { _id: grupo._id },
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      ok: true,
      mensaje: "Grupo actualizado correctamente",
      grupo: grupoActualizado,
    });
  } catch (error) {
    console.error("ERROR PATCH GRUPO GENERAL:", error);
    res.status(500).json({
      error: "Error al actualizar el grupo",
      detalle: error.message,
    });
  }
});

export default router;