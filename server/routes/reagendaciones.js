import express from "express";
import Reagendacion from "../models/Reagendacion.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Asistencia from "../models/Asistencia.js";

const router = express.Router();

// ============================================================
// UTILIDAD: Generar ID de reagendación
// ============================================================
const generarId = async (prefijo) => {
  const count = await Reagendacion.countDocuments();
  const num = String(count + 1).padStart(3, "0");
  return `${prefijo}${num}`;
};

// ============================================================
// UTILIDAD: Verificar conflictos de horario
// ============================================================
async function verificarConflictosHorario({
  idProfesor,
  idAlumno,
  fechaHoraNueva,
  duracionClase = "2 horas",
  idGrupoOrigen,
}) {
  const conflictos = { profesor: false, alumno: false, mensaje: "" };
  const fecha = new Date(fechaHoraNueva);
  const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'long' });
  const diaSemanaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

  // 1. Verificar conflicto del profesor
  if (idProfesor) {
    // Obtener grupos del profesor en ese día
    const gruposProfesor = await Grupo.find({
      idProfesor,
      Estatus: "Activo",
      diaClase: diaSemanaCapitalized,
    }).lean();

    // Verificar si alguno coincide en horario
    const horaNueva = fecha.toTimeString().slice(0, 5);
    for (const grupo of gruposProfesor) {
      if (grupo.horaClase === horaNueva) {
        conflictos.profesor = true;
        conflictos.mensaje = `El profesor ya tiene una clase en ese horario (${grupo.nombreCurso} - ${grupo.diaClase} ${grupo.horaClase}).`;
        break;
      }
    }

    // También verificar reagendaciones activas del profesor para esa fecha/hora
    if (!conflictos.profesor) {
      const reagendacionesProfesor = await Reagendacion.find({
        idProfesor,
        estatus: "reagendado",
        fechaHoraNueva: {
          $gte: new Date(fecha.setHours(0,0,0,0)),
          $lt: new Date(fecha.setHours(23,59,59,999))
        }
      }).lean();
      for (const reag of reagendacionesProfesor) {
        const fechaReag = new Date(reag.fechaHoraNueva);
        if (fechaReag.toTimeString().slice(0,5) === horaNueva) {
          conflictos.profesor = true;
          conflictos.mensaje = `El profesor ya tiene una clase reagendada en ese horario.`;
          break;
        }
      }
    }
  }

  // 2. Verificar conflicto del alumno
  if (idAlumno) {
    // Obtener inscripciones activas del alumno (excluyendo el grupo origen)
    const inscripciones = await Inscripcion.find({
      idAlumno,
      estatus: "Activa",
      grupoId: { $ne: idGrupoOrigen },
    }).lean();

    const gruposIds = inscripciones.map(ins => ins.grupoId);
    const gruposAlumno = await Grupo.find({
      IdGrupo: { $in: gruposIds },
      Estatus: "Activo",
      diaClase: diaSemanaCapitalized,
    }).lean();

    const horaNueva = fecha.toTimeString().slice(0,5);
    for (const grupo of gruposAlumno) {
      if (grupo.horaClase === horaNueva) {
        conflictos.alumno = true;
        conflictos.mensaje = `El alumno ya tiene otra clase en ese horario (${grupo.nombreCurso}).`;
        break;
      }
    }

    // También verificar reagendaciones del alumno para esa fecha/hora
    if (!conflictos.alumno) {
      const reagendacionesAlumno = await Reagendacion.find({
        idAlumno,
        estatus: "reagendado",
        fechaHoraNueva: {
          $gte: new Date(fecha.setHours(0,0,0,0)),
          $lt: new Date(fecha.setHours(23,59,59,999))
        }
      }).lean();
      for (const reag of reagendacionesAlumno) {
        const fechaReag = new Date(reag.fechaHoraNueva);
        if (fechaReag.toTimeString().slice(0,5) === horaNueva) {
          conflictos.alumno = true;
          conflictos.mensaje = `El alumno ya tiene una clase reagendada en ese horario.`;
          break;
        }
      }
    }
  }

  return conflictos;
}

// ============================================================
// POST / - Crear una reagendación (con validaciones)
// ============================================================
router.post("/", async (req, res) => {
  try {
    console.log("📥 POST /reagendaciones - Payload recibido:", req.body);

    const {
      idAlumno,
      idGrupoOrigen,
      idGrupoNuevo,
      fechaHoraOriginal,
      fechaHoraNueva,
      comentario,
      tipoReagendacion,
      modalidad,
    } = req.body;

    // Validaciones básicas
    if (!idAlumno || !idGrupoOrigen || !fechaHoraNueva) {
      console.error("❌ Faltan campos obligatorios");
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Obtener grupo origen
    const grupoOrigen = await Grupo.findOne({ IdGrupo: idGrupoOrigen }).lean();
    if (!grupoOrigen) {
      return res.status(404).json({ error: `Grupo origen no encontrado: ${idGrupoOrigen}` });
    }

    // Obtener grupo destino (si es diferente)
    let grupoNuevo = null;
    if (idGrupoNuevo && idGrupoNuevo !== idGrupoOrigen) {
      grupoNuevo = await Grupo.findOne({ IdGrupo: idGrupoNuevo }).lean();
    }

    // Preparar datos de profesores
    const idProfesorOriginal = grupoOrigen.idProfesor || "";
    const profesorOriginalNombre = grupoOrigen.nombreProfesor || "Sin profesor";

    let idProfesorNuevo = grupoNuevo?.idProfesor || idProfesorOriginal;
    let profesorNuevoNombre = grupoNuevo?.nombreProfesor || profesorOriginalNombre;

    // ✅ VALIDACIÓN DE CONFLICTOS DE HORARIO
    const duracion = grupoOrigen.duracionClase || "2 horas";
    const conflictos = await verificarConflictosHorario({
      idProfesor: idProfesorNuevo,
      idAlumno,
      fechaHoraNueva,
      duracionClase: duracion,
      idGrupoOrigen,
    });

    if (conflictos.profesor || conflictos.alumno) {
      return res.status(409).json({
        error: conflictos.mensaje,
        detalle: {
          profesor: conflictos.profesor,
          alumno: conflictos.alumno,
        },
      });
    }

    // Obtener nombre del alumno
    let nombreAlumno = req.body.nombreAlumno || "";
    if (!nombreAlumno) {
      const inscripcion = await Inscripcion.findOne({ idAlumno, grupoId: idGrupoOrigen }).lean();
      nombreAlumno = inscripcion?.nombreAlumno || idAlumno;
    }

    // Generar ID
    const reagendacionId = await generarId("REA");

    // Crear objeto de reagendación
    const nuevaReagendacion = new Reagendacion({
      ReagendacionId: reagendacionId,
      idAlumno,
      nombreAlumno,
      idGrupoOrigen,
      idGrupoNuevo: idGrupoNuevo || idGrupoOrigen,
      nombreCurso: grupoOrigen.nombreCurso || "Curso sin nombre",
      profesorOriginal: profesorOriginalNombre,
      profesorNuevo: profesorNuevoNombre,
      idProfesorOriginal: idProfesorOriginal,
      idProfesorNuevo: idProfesorNuevo,
      fechaHoraOriginal: new Date(fechaHoraOriginal),
      fechaHoraNueva: new Date(fechaHoraNueva),
      tipoReagendacion: tipoReagendacion || "temporal",
      comentario: comentario || `Reagendado por ${nombreAlumno}`,
      duracion: duracion,
      modalidad: modalidad || "Presencial",
      motivo: "Reagendado desde sistema",
      estatus: "reagendado",
    });

    await nuevaReagendacion.save();
    console.log("✅ Reagendación guardada en MongoDB");

    // ✅ ACTUALIZAR ASISTENCIA
    // 1. Marcar la asistencia original como "reagendada" (si existe)
    const fechaOriginal = new Date(fechaHoraOriginal);
    const asistenciaOriginal = await Asistencia.findOne({
      idAlumno,
      idGrupo: idGrupoOrigen,
      fecha: {
        $gte: new Date(fechaOriginal.setHours(0,0,0,0)),
        $lt: new Date(fechaOriginal.setHours(23,59,59,999))
      }
    });
    if (asistenciaOriginal) {
      asistenciaOriginal.estado = "justificado"; // o "reagendado" si lo agregas al enum
      asistenciaOriginal.comentario = `Reagendado a ${new Date(fechaHoraNueva).toLocaleString()}`;
      await asistenciaOriginal.save();
      console.log("✅ Asistencia original actualizada a 'justificado'");
    } else {
      // Si no existe, crear una para dejar registro
      await Asistencia.create({
        idAlumno,
        idGrupo: idGrupoOrigen,
        idProfesor: idProfesorOriginal,
        fecha: new Date(fechaHoraOriginal),
        estado: "justificado",
        comentario: `Reagendado a ${new Date(fechaHoraNueva).toLocaleString()}`,
      });
      console.log("✅ Asistencia original creada con estado 'justificado'");
    }

    // 2. Crear un registro de asistencia para la nueva fecha (estado "pendiente" o "programado")
    await Asistencia.create({
      idAlumno,
      idGrupo: idGrupoNuevo || idGrupoOrigen,
      idProfesor: idProfesorNuevo,
      fecha: new Date(fechaHoraNueva),
      estado: "pendiente", // o "programado" si lo agregas
      comentario: `Reagendado desde ${new Date(fechaHoraOriginal).toLocaleString()}`,
    });
    console.log("✅ Asistencia para nueva fecha creada con estado 'pendiente'");

    res.status(201).json(nuevaReagendacion);
  } catch (error) {
    console.error("❌ Error en POST /reagendaciones:", error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ============================================================
// PUT /:id - Actualizar modalidad (ya existe)
// ============================================================
router.put("/:id", async (req, res) => {
  // ... (código existente sin cambios) ...
});

// ============================================================
// DELETE /:id - Eliminar reagendación (ya existe)
// ============================================================
router.delete("/:id", async (req, res) => {
  // ... (código existente sin cambios) ...
});

// ============================================================
// DELETE /alumno/:idAlumno/:idGrupoNuevo - Quitar reagendación de un alumno
// ============================================================
router.delete("/alumno/:idAlumno/:idGrupoNuevo", async (req, res) => {
  // ... (código existente sin cambios) ...
});

export default router;