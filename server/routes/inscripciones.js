import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";
import mongoose from "mongoose";
import { sincronizarPagosDesdeInscripciones } from "./pagos.js";
import { generarPagosHistoricos } from "../utils/pagosHelper.js";
import cache from "../utils/cache.js";

const router = express.Router();

// ===== RUTAS DE PRUEBA =====
router.get("/buscar/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const inscripciones = await Inscripcion.find({
      idAlumno: idAlumno.trim(),
      grupoId: grupoId.trim(),
    }).lean();
    res.json({ encontrados: inscripciones.length, inscripciones });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/test", (req, res) => {
  res.json({ ok: true, mensaje: "Ruta de inscripciones funcionando" });
});

// ============================================================
// MOVER ALUMNO A OTRO GRUPO
// ============================================================
router.patch("/:idAlumno/mover", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { nuevoGrupoId, grupoActualId } = req.body;

    if (!nuevoGrupoId || !grupoActualId) {
      return res
        .status(400)
        .json({ error: "Faltan datos: nuevoGrupoId y grupoActualId" });
    }

    const inscripcion = await Inscripcion.findOne({
      idAlumno: idAlumno.trim(),
      grupoId: grupoActualId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] },
    });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción activa no encontrada" });
    }

    const nuevoGrupo = await Grupo.findOne({
      IdGrupo: nuevoGrupoId.trim(),
    }).lean();
    if (!nuevoGrupo) {
      return res.status(404).json({ error: "Grupo destino no encontrado" });
    }

    const duplicado = await Inscripcion.findOne({
      idAlumno: idAlumno.trim(),
      grupoId: nuevoGrupoId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] },
    });
    if (duplicado) {
      await Inscripcion.updateOne(
        { _id: duplicado._id },
        {
          $set: {
            estatus: "Baja",
            fechaBaja: new Date(),
            motivoBaja: `Fusionado desde ${grupoActualId}`,
          },
        }
      );
    }

    const ocupados = await Inscripcion.countDocuments({
      grupoId: nuevoGrupoId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] },
    });
    const capacidad = nuevoGrupo.CapacidadMaxima || 20;
    if (ocupados >= capacidad) {
      return res.status(409).json({ error: "El grupo destino está lleno" });
    }

    await Inscripcion.updateOne(
      { _id: inscripcion._id },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );

    await Pago.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );
    await Abono.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );

    await sincronizarPagosDesdeInscripciones();
    cache.flushAll();

    res.status(200).json({
      ok: true,
      mensaje: `Alumno movido de ${grupoActualId} a ${nuevoGrupoId}`,
      fusionado: !!duplicado,
    });
  } catch (error) {
    console.error("❌ ERROR MOVER:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET ALL
// ============================================================
router.get("/", async (req, res) => {
  try {
    const inscripciones = await Inscripcion.find().lean();
    res.json(inscripciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET POR ALUMNO
// ============================================================
router.get("/alumno/:idAlumno", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const inscripciones = await Inscripcion.find({ idAlumno }).lean();
    res.json(inscripciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST – CREAR INSCRIPCIÓN + GENERAR PAGOS (pasado + 12 meses futuros)
// ============================================================
router.post("/", async (req, res) => {
  try {
    const datos = req.body;

    if (!datos.idAlumno || !datos.grupoId) {
      return res
        .status(400)
        .json({ error: "idAlumno y grupoId son requeridos" });
    }

    const grupo = await Grupo.findOne({ IdGrupo: datos.grupoId });
    if (!grupo) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    const fechaInscripcion = datos.fechaInscripcion
      ? new Date(datos.fechaInscripcion)
      : new Date();
    if (isNaN(fechaInscripcion.getTime())) {
      return res
        .status(400)
        .json({ error: "Fecha de inscripción inválida" });
    }

    const nuevaInscripcion = new Inscripcion({
      idAlumno: datos.idAlumno.trim(),
      nombreAlumno: datos.nombreAlumno || "",
      grupoId: datos.grupoId.trim(),
      modalidad: datos.modalidad || "Presencial",
      montoMensualidad:
        datos.montoMensualidad || grupo.precioMensualidad || 0,
      diaPago: datos.diaPago || 5,
      fechaInicioPago: datos.fechaInicioPago || fechaInscripcion,
      comentarios: datos.comentarios || "",
      fechaInscripcion,
      estatus: "Activa",
    });

    await nuevaInscripcion.save();

    await sincronizarPagosDesdeInscripciones();

    // ✅ SIEMPRE generar pagos (pasado + 12 meses futuros)
    try {
      const pagosGenerados = await generarPagosHistoricos(
        nuevaInscripcion,
        false,
        12
      );
      console.log(
        `✅ ${pagosGenerados.length} pagos generados para ${nuevaInscripcion.idAlumno}-${nuevaInscripcion.grupoId}`
      );
    } catch (err) {
      console.error("❌ Error generando pagos:", err);
    }

    cache.flushAll();

    res.status(201).json({
      ok: true,
      mensaje: "Inscripción creada exitosamente",
      inscripcion: nuevaInscripcion,
    });
  } catch (error) {
    console.error("Error POST /inscripciones:", error);
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "El alumno ya está inscrito en este grupo" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH – ACTUALIZAR INSCRIPCIÓN
// ============================================================
router.patch("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const { modalidad, comentarios } = req.body;
    const update = {};
    if (modalidad) update.modalidad = modalidad;
    if (comentarios !== undefined) update.comentarios = comentarios;

    const inscripcion = await Inscripcion.findOneAndUpdate(
      { idAlumno, grupoId },
      { $set: update },
      { new: true }
    );
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    res.json(inscripcion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE
// ============================================================
router.delete("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const inscripcion = await Inscripcion.findOneAndDelete({
      idAlumno,
      grupoId,
    });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    res.json({ ok: true, mensaje: "Inscripción eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET POR GRUPO
// ============================================================
router.get("/grupo/:grupoId", async (req, res) => {
  try {
    const { grupoId } = req.params;
    const inscripciones = await Inscripcion.find({
      grupoId,
      estatus: "Activa",
    }).lean();
    res.status(200).json(inscripciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// FINALIZAR CURSO
// ============================================================
router.patch("/:idAlumno/:grupoId/finalizar", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const { fechaFin } = req.body;
    if (!fechaFin) {
      return res
        .status(400)
        .json({ error: "Debes especificar la fecha de finalización" });
    }

    const fechaCorte = new Date(fechaFin);
    if (isNaN(fechaCorte.getTime())) {
      return res
        .status(400)
        .json({ error: "Fecha de finalización inválida" });
    }

    const inscripcion = await Inscripcion.findOne({ idAlumno, grupoId });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    if (inscripcion.estatus === "Finalizada") {
      return res.status(400).json({ error: "El curso ya está finalizado" });
    }

    inscripcion.estatus = "Finalizada";
    inscripcion.fechaFin = fechaCorte;
    await inscripcion.save();

    const pagosFuturos = await Pago.updateMany(
      {
        idAlumno,
        grupoId,
        activo: true,
        fechaInicioPago: { $gt: fechaCorte },
      },
      {
        $set: {
          activo: false,
          estatus: "Inactivo",
          fechaBaja: new Date(),
          notas: `Curso finalizado el ${fechaCorte
            .toISOString()
            .slice(0, 10)}`,
        },
      }
    );

    await sincronizarPagosDesdeInscripciones();
    cache.flushAll();

    res.json({
      ok: true,
      mensaje: "Curso finalizado correctamente",
      data: {
        inscripcion,
        pagosDesactivados: pagosFuturos.modifiedCount,
        fechaCorte: fechaCorte.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({