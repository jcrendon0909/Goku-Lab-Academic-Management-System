import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";
import Grupo from "../models/Grupo.js";
import Pago from "../models/Pago.js";
import Alumno from "../models/Alumno.js";
import { parseFechaFlexible } from "../utils/parseFechas.js";
import {
  crearOActualizarPagoDeInscripcion,
  normalizarDatosPago,
  validarPagoAlCorrienteParaBaja,
} from "../utils/pagos.js";

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
    const {
      idAlumno,
      nombreAlumno,
      grupoId,
      modalidad,
      fechaInscripcion,
      montoMensualidad,
      diaPago,
      fechaInicioPago,
      comentarios,
    } = req.body;

    // Validar inputs básicos
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

    // ✅ CAMBIO 4: Usar parseador centralizado de fechas
    // Soporta ISO 8601, SQL format, input date, y JavaScript Date strings
    let fechaInscripcionFinal = undefined;
    if (fechaInscripcion) {
      const d = parseFechaFlexible(fechaInscripcion);
      if (d && !isNaN(d.getTime())) {
        fechaInscripcionFinal = d;
      } else {
        return res.status(400).json({
          error: "fechaInscripcion no es válida. Usa formato YYYY-MM-DD o ISO 8601"
        });
      }
    }

    // ✅ Normalizar y validar datos de pago (REQUERIDOS)
    let datosPagoNormalizados = null;
    try {
      datosPagoNormalizados = normalizarDatosPago({
        montoMensualidad,
        diaPago,
        fechaInicioPago,
        comentarios,
      });
    } catch (errorPago) {
      return res.status(400).json({ error: errorPago.message });
    }

    if (!datosPagoNormalizados) {
      return res.status(400).json({ error: "Datos de pago requeridos (monto, día de pago, fecha de inicio)" });
    }

    // ✅ CAMBIO 3a: Validar que el grupo existe ANTES de hacer anything
    const grupoNuevo = await Grupo.findOne({
      $or: [
        { IdGrupo: grupoIdTrimmed },
        { idGrupo: grupoIdTrimmed },
      ],
    }).lean();

    if (!grupoNuevo) {
      return res.status(404).json({
        error: `Grupo "${grupoIdTrimmed}" no existe en la base de datos`
      });
    }

    // ✅ CAMBIO 3b: Validar que el alumno existe
    const alumnoExiste = await Alumno.findOne({
      $or: [
        { idAlumno: String(idAlumno).trim() },
        { "idAlumno ": String(idAlumno).trim() },
        { IdAlumno: String(idAlumno).trim() },
        { id_alumno: String(idAlumno).trim() },
      ]
    }).lean();

    if (!alumnoExiste) {
      return res.status(404).json({
        error: `Alumno "${idAlumno}" no existe en la base de datos`
      });
    }

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

    console.log("Búsqueda de grupo:", { grupoId: grupoIdTrimmed, grupoEncontrado: !!grupoNuevo });

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

    const nuevaInscripcion = new Inscripcion({
      idAlumno: String(idAlumno).trim(),
      nombreAlumno: String(nombreAlumno).trim(),
      grupoId: grupoIdTrimmed,
      modalidad: modalidad || "Presencial",
      montoMensualidad: datosPagoNormalizados.montoMensualidad,
      diaPago: datosPagoNormalizados.diaPago,
      fechaInicioPago: datosPagoNormalizados.fechaInicioPago,
      comentarios: datosPagoNormalizados.comentarios || "",
      fechaInscripcion: fechaInscripcionFinal,
    });

    const guardada = await nuevaInscripcion.save();

    const pago = await crearOActualizarPagoDeInscripcion({
      idAlumno: guardada.idAlumno,
      nombreAlumno: guardada.nombreAlumno,
      grupoId: guardada.grupoId,
      nombreCurso: grupoNuevo?.nombreCurso || "",
      datosPago: datosPagoNormalizados,
    });

    res.status(201).json({
      ...guardada.toObject(),
      pago,
    });
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

    const inscripcion = await Inscripcion.findOne({
      idAlumno: String(idAlumno).trim(),
      grupoId: String(grupoId).trim(),
    });

    if (!inscripcion) {
      return res.status(404).json({
        error: "No se encontró la inscripción del alumno en ese grupo",
      });
    }

    const validacionPago = await validarPagoAlCorrienteParaBaja({
      idAlumno,
      grupoId,
      fechaInicioCobro:
        inscripcion.fechaPago ||
        inscripcion.fechaInscripcion ||
        inscripcion.createdAt,
    });

    if (!validacionPago.ok) {
      return res.status(409).json({
        error: `No se puede dar de baja todavía. Primero debe quedar pagado ${validacionPago.periodo.nombreMes}.`,
        detalle: {
          mesRequerido: validacionPago.periodo.nombreMes,
          montoRequerido: validacionPago.montoRequerido,
          pagadoEnPeriodo: validacionPago.totalPagadoPeriodo,
          saldoPendiente: validacionPago.saldoPeriodo,
          fechaLimite: validacionPago.periodo.vencimiento,
        },
      });
    }

    // Si no es un grupo reagendado, proceder con la baja de inscripción
    const inscripcionEliminada = await Inscripcion.findOneAndDelete({
      idAlumno: String(idAlumno).trim(),
      grupoId: String(grupoId).trim(),
    });

    let pagoDesactivado = null;
    if (validacionPago.pago?._id) {
      pagoDesactivado = await Pago.findByIdAndUpdate(
        validacionPago.pago._id,
        {
          activo: false,
          fechaBaja: new Date(),
        },
        { new: true }
      );
    }

    // Eliminar reagendaciones asociadas al grupo de origen
    const resultadoReagendaciones = await Reagendacion.deleteMany({
      idAlumno,
      $or: [
        // ✅ Normalizado: solo idGrupoOrigen
        { idGrupoOrigen: grupoId },
      ],
    });

    res.status(200).json({
      ok: true,
      mensaje: pagoDesactivado
        ? "Alumno dado de baja; sus pagos anteriores permanecen en el historial"
        : "Alumno dado de baja correctamente del grupo",
      inscripcionEliminada: inscripcionEliminada || null,
      pagoDesactivado: pagoDesactivado || null,
      pagoValidado: validacionPago.pago
        ? {
            mesRequerido: validacionPago.periodo.nombreMes,
            montoRequerido: validacionPago.montoRequerido,
            pagadoEnPeriodo: validacionPago.totalPagadoPeriodo,
          }
        : null,
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
