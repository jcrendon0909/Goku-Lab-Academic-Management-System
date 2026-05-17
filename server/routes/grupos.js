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

const normalizar = (valor) => String(valor || "").trim().toUpperCase();

const horaAMinutos = (hora) => {
  if (!hora) return null;

  const texto = String(hora).trim().toUpperCase();
  const match = texto.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);

  if (!match) return null;

  let h = Number(match[1]);
  const m = Number(match[2]);
  const periodo = match[3];

  if (periodo === "PM" && h < 12) h += 12;
  if (periodo === "AM" && h === 12) h = 0;

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
};

const duracionAMinutos = (duracion) => {
  const dur = String(duracion || "2 horas").toLowerCase().trim();

  if (dur.includes(":")) {
    const [h, m] = dur.split(":").map(Number);
    return h * 60 + (m || 0);
  }

  if (dur.includes("1") && dur.includes("30")) return 90;
  if (dur.includes("2") && dur.includes("30")) return 150;
  if (dur.includes("3") && dur.includes("30")) return 210;
  if (dur.includes("3")) return 180;
  if (dur.includes("2")) return 120;
  if (dur.includes("1")) return 60;

  return 120;
};

const minutoAHora = (minutos) => {
  if (minutos === null || Number.isNaN(minutos)) {
    return "Horario no disponible";
  }

  const h = Math.floor(minutos / 60);
  const m = minutos % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

async function validarEmpalmeProfesor({
  idProfesor,
  nombreProfesor,
  diaClase,
  horaClase,
  duracionClase,
}) {
  if (!idProfesor || !diaClase || !horaClase) return null;

  const inicioNuevo = horaAMinutos(horaClase);

  if (inicioNuevo === null) return null;

  const finNuevo = inicioNuevo + duracionAMinutos(duracionClase);

  const gruposDelDia = await Grupo.find({
    diaClase: { $regex: `^${String(diaClase).trim()}$`, $options: "i" },
    Estatus: "Activo",
  }).lean();

  const clasesDelProfesor = gruposDelDia.filter((clase) => {
    const idProfesorClase = normalizar(
      clase.idProfesor || clase.IdProfesor || clase.profesorId || ""
    );

    return idProfesorClase === normalizar(idProfesor);
  });

  for (const clase of clasesDelProfesor) {
    const inicioExistente = horaAMinutos(
      clase.horaClase ||
        clase["horaClase "] ||
        clase.HoraClase ||
        clase.hora ||
        clase.Hora ||
        ""
    );
    if (inicioExistente === null) continue;

    const finExistente =
      inicioExistente + duracionAMinutos(clase.duracionClase || "2 horas");

    const hayEmpalme =
      inicioNuevo < finExistente && finNuevo > inicioExistente;

    if (hayEmpalme) {
      return {
        error: `El profesor ${nombreProfesor} ya tiene una clase asignada de ${minutoAHora(
          inicioExistente
        )} a ${minutoAHora(
          finExistente
        )}. No se puede crear otra clase que se empalme.`,
        conflicto: {
          cursoExistente: clase.nombreCurso || "Curso sin nombre",
          diaClase: clase.diaClase,
          horaExistenteInicio: minutoAHora(inicioExistente),
          horaExistenteFin: minutoAHora(finExistente),
          horaNuevaInicio: minutoAHora(inicioNuevo),
          horaNuevaFin: minutoAHora(finNuevo),
        },
      };
    }
  }

  return null;
}

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

    const conflicto = await validarEmpalmeProfesor({
      idProfesor,
      nombreProfesor,
      diaClase,
      horaClase,
      duracionClase,
    });

    if (conflicto) {
      return res.status(409).json(conflicto);
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
      capacidadMaxima,
      fechaCreacion,
      Estatus,
      estatus,
    } = req.body;

    const conflicto = await validarEmpalmeProfesor({
      idProfesor,
      nombreProfesor,
      diaClase,
      horaClase,
      duracionClase,
    });

    if (conflicto) {
      return res.status(409).json(conflicto);
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
