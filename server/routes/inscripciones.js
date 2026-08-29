import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";
import Reagendacion from "../models/Reagendacion.js";
import mongoose from "mongoose";
import { sincronizarPagosDesdeInscripciones } from "./pagos.js";
import cache from "../utils/cache.js"; // ✅ Importación agregada

const router = express.Router();

// ===== RUTA DE PRUEBA /buscar =====
router.get("/buscar/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const inscripciones = await Inscripcion.find({
      idAlumno: idAlumno.trim(),
      grupoId: grupoId.trim(),
    }).lean();
    res.json({
      encontrados: inscripciones.length,
      inscripciones: inscripciones
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== RUTA DE PRUEBA /test =====
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

    console.log('📥 MOVER - Datos recibidos:');
    console.log('  idAlumno:', idAlumno);
    console.log('  nuevoGrupoId:', nuevoGrupoId);
    console.log('  grupoActualId:', grupoActualId);

    if (!nuevoGrupoId || !grupoActualId) {
      return res.status(400).json({ 
        error: "Faltan datos: nuevoGrupoId y grupoActualId son requeridos" 
      });
    }

    const inscripcion = await Inscripcion.findOne({
      idAlumno: idAlumno.trim(),
      grupoId: grupoActualId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] }
    });

    if (!inscripcion) {
      console.log('❌ Inscripción no encontrada');
      return res.status(404).json({ 
        error: "Inscripción activa no encontrada para este alumno en el grupo actual" 
      });
    }

    const nuevoGrupo = await Grupo.findOne({ IdGrupo: nuevoGrupoId.trim() }).lean();
    if (!nuevoGrupo) {
      return res.status(404).json({ error: "Grupo destino no encontrado" });
    }

    const duplicado = await Inscripcion.findOne({
      idAlumno: idAlumno.trim(),
      grupoId: nuevoGrupoId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] }
    });
    if (duplicado) {
      console.log('⚠️ Duplicado en destino, fusionando...');
      await Inscripcion.updateOne(
        { _id: duplicado._id },
        { $set: { estatus: "Baja", fechaBaja: new Date(), motivoBaja: `Fusionado desde ${grupoActualId}` } }
      );
    }

    const ocupados = await Inscripcion.countDocuments({
      grupoId: nuevoGrupoId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] }
    });
    const capacidad = nuevoGrupo.CapacidadMaxima || 20;
    if (ocupados >= capacidad) {
      return res.status(409).json({ error: "El grupo destino está lleno" });
    }

    await Inscripcion.updateOne(
      { _id: inscripcion._id },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );
    console.log('✅ Inscripción actualizada');

    await Pago.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );
    await Abono.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );

    // ✅ Sincronizar pagos y limpiar caché después del movimiento
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
    console.error("Error GET /inscripciones:", error);
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
    console.error("Error GET /inscripciones/alumno/:idAlumno:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST – CREAR INSCRIPCIÓN CON GENERACIÓN DE PAGOS HISTÓRICOS
// ============================================================
router.post("/", async (req, res) => {
  try {
    const datos = req.body;

    if (!datos.idAlumno || !datos.grupoId) {
      return res.status(400).json({ error: "idAlumno y grupoId son requeridos" });
    }

    const grupo = await Grupo.findOne({ IdGrupo: datos.grupoId });
    if (!grupo) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    const fechaInscripcion = datos.fechaInscripcion ? new Date(datos.fechaInscripcion) : new Date();
    if (isNaN(fechaInscripcion.getTime())) {
      return res.status(400).json({ error: "Fecha de inscripción inválida" });
    }

    const nuevaInscripcion = new Inscripcion({
      idAlumno: datos.idAlumno.trim(),
      nombreAlumno: datos.nombreAlumno || "",
      grupoId: datos.grupoId.trim(),
      modalidad: datos.modalidad || "Presencial",
      montoMensualidad: datos.montoMensualidad || grupo.precioMensualidad || 0,
      diaPago: datos.diaPago || 5,
      fechaInicioPago: datos.fechaInicioPago || fechaInscripcion,
      comentarios: datos.comentarios || "",
      fechaInscripcion: fechaInscripcion,
      estatus: "Activa",
    });

    await nuevaInscripcion.save();

    // ✅ Sincronizar pagos y limpiar caché después de crear inscripción
    await sincronizarPagosDesdeInscripciones();
    cache.flushAll();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaIns = new Date(fechaInscripcion);
    fechaIns.setHours(0, 0, 0, 0);

    if (fechaIns < hoy) {
      try {
        const { generarPagosHistoricos } = await import('../utils/pagosHelper.js');
        const pagosGenerados = await generarPagosHistoricos(nuevaInscripcion, false);
        console.log(`✅ ${pagosGenerados.length} pagos históricos generados para inscripción ${nuevaInscripcion._id}`);
      } catch (error) {
        console.error('❌ Error generando pagos históricos:', error);
      }
    } else {
      console.log(`ℹ️ Inscripción con fecha actual o futura, no se generan históricos.`);
    }

    res.status(201).json({
      ok: true,
      mensaje: "Inscripción creada exitosamente",
      inscripcion: nuevaInscripcion
    });

  } catch (error) {
    console.error("Error POST /inscripciones:", error);
    if (error.code === 11000) {
      return res.status(409).json({ error: "El alumno ya está inscrito en este grupo" });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH – ACTUALIZAR INSCRIPCIÓN (solo modalidad y comentarios)
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
    console.error("Error PATCH /inscripciones/:idAlumno/:grupoId:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE
// ============================================================
router.delete("/:idAlumno/:grupoId", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const inscripcion = await Inscripcion.findOneAndDelete({ idAlumno, grupoId });
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }
    res.json({ ok: true, mensaje: "Inscripción eliminada" });
  } catch (error) {
    console.error("Error DELETE /inscripciones/:idAlumno/:grupoId:", error);
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
      grupoId: grupoId,
      estatus: "Activa"
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

// ============================================================
// FINALIZAR CURSO (CON FECHA DE CORTE)
// ============================================================
router.patch("/:idAlumno/:grupoId/finalizar", async (req, res) => {
  try {
    const { idAlumno, grupoId } = req.params;
    const { fechaFin } = req.body;

    if (!fechaFin) {
      return res.status(400).json({ error: "Debes especificar la fecha de finalización" });
    }

    const fechaCorte = new Date(fechaFin);
    if (isNaN(fechaCorte.getTime())) {
      return res.status(400).json({ error: "Fecha de finalización inválida" });
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

    // 1. Desactivar pagos futuros
    const Pago = mongoose.model("Pago");
    const pagosFuturos = await Pago.updateMany(
      { 
        idAlumno, 
        grupoId, 
        activo: true,
        fechaInicioPago: { $gt: fechaCorte }
      },
      { 
        $set: { 
          activo: false, 
          estatus: "Inactivo", 
          fechaBaja: new Date(),
          notas: `Curso finalizado el ${fechaCorte.toISOString().slice(0,10)}`
        } 
      }
    );

    // 2. Desactivar reagendaciones futuras
    const Reagendacion = mongoose.model("Reagendacion");
    const reagendacionesFuturas = await Reagendacion.updateMany(
      {
        idAlumno,
        idGrupoNuevo: grupoId,
        estatus: "reagendado",
        fechaHoraNueva: { $gt: fechaCorte }
      },
      {
        $set: {
          estatus: "cancelado",
          comentario: `Cancelado por finalización de curso el ${fechaCorte.toISOString().slice(0,10)}`
        }
      }
    );

    // 3. Actualizar asistencias futuras (opcional)
    const Asistencia = mongoose.model("Asistencia");
    await Asistencia.updateMany(
      {
        idAlumno,
        idGrupo: grupoId,
        fecha: { $gt: fechaCorte }
      },
      {
        $set: {
          estado: "ausente",
          comentario: `Clase posterior a finalización del curso (${fechaCorte.toISOString().slice(0,10)})`
        }
      }
    );

    // ✅ Sincronizar pagos y limpiar caché después de finalizar
    await sincronizarPagosDesdeInscripciones();
    cache.flushAll();

    res.json({
      ok: true,
      mensaje: "Curso finalizado correctamente",
      data: {
        inscripcion,
        pagosDesactivados: pagosFuturos.modifiedCount,
        reagendacionesCanceladas: reagendacionesFuturas.modifiedCount,
        fechaCorte: fechaCorte.toISOString()
      }
    });
  } catch (error) {
    console.error("❌ Error PATCH /inscripciones/finalizar:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;