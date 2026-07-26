import express from "express";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";

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
// MOVER ALUMNO A OTRO GRUPO (USANDO LA MISMA LÓGICA QUE /buscar)
// ============================================================
router.patch("/:idAlumno/mover", async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { nuevoGrupoId, grupoActualId } = req.body;

    console.log('📥 MOVER - Datos recibidos:');
    console.log('  idAlumno:', idAlumno);
    console.log('  nuevoGrupoId:', nuevoGrupoId);
    console.log('  grupoActualId:', grupoActualId);

    // Validar datos
    if (!nuevoGrupoId || !grupoActualId) {
      return res.status(400).json({ 
        error: "Faltan datos: nuevoGrupoId y grupoActualId son requeridos" 
      });
    }

    // 1. Buscar la inscripción usando la misma lógica que /buscar
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

    console.log('✅ Inscripción encontrada:', inscripcion._id);
    console.log('  idAlumno:', inscripcion.idAlumno);
    console.log('  grupoId actual:', inscripcion.grupoId);
    console.log('  estatus:', inscripcion.estatus);

    // 2. Verificar que el nuevo grupo exista
    const nuevoGrupo = await Grupo.findOne({ IdGrupo: nuevoGrupoId.trim() }).lean();
    if (!nuevoGrupo) {
      return res.status(404).json({ error: "Grupo destino no encontrado" });
    }

    // 3. Verificar duplicados
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

    // 4. Verificar capacidad
    const ocupados = await Inscripcion.countDocuments({
      grupoId: nuevoGrupoId.trim(),
      estatus: { $in: ["Activa", "activa", "ACTIVA"] }
    });
    const capacidad = nuevoGrupo.CapacidadMaxima || 20;
    console.log(`📊 Ocupación destino: ${ocupados}/${capacidad}`);
    if (ocupados >= capacidad) {
      return res.status(409).json({ error: "El grupo destino está lleno" });
    }

    // 5. Actualizar la inscripción
    await Inscripcion.updateOne(
      { _id: inscripcion._id },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );
    console.log('✅ Inscripción actualizada');

    // 6. Actualizar pagos y abonos
    await Pago.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );
    await Abono.updateMany(
      { idAlumno: idAlumno.trim(), grupoId: grupoActualId.trim() },
      { $set: { grupoId: nuevoGrupoId.trim() } }
    );
    console.log('✅ Pagos y abonos actualizados');

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
// RUTAS EXISTENTES (GET, POST, PATCH, DELETE)
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

router.post("/", async (req, res) => {
  try {
    const nuevaInscripcion = new Inscripcion(req.body);
    await nuevaInscripcion.save();
    res.status(201).json(nuevaInscripcion);
  } catch (error) {
    console.error("Error POST /inscripciones:", error);
    res.status(500).json({ error: error.message });
  }
});

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
// TERMINAR CURSO (marcar inscripción como Baja)
// ============================================================
router.patch("/:inscripcionId/terminar", async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const { motivo } = req.body;

    const inscripcion = await Inscripcion.findById(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    if (inscripcion.estatus !== "Activa") {
      return res.status(400).json({ error: "La inscripción ya no está activa" });
    }

    inscripcion.estatus = "Baja";
    inscripcion.fechaBaja = new Date();
    inscripcion.motivoBaja = motivo || "Curso completado";
    await inscripcion.save();

    // Opcional: actualizar pagos pendientes de esta inscripción (si los hay)
    // await Pago.updateMany(
    //   { inscripcionId: inscripcion._id, estatus: "pendiente" },
    //   { $set: { estatus: "cancelado" } }
    // );

    res.json({
      ok: true,
      mensaje: "Curso terminado correctamente",
      inscripcion
    });
  } catch (error) {
    console.error("ERROR TERMINAR CURSO:", error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================================
// TERMINAR CURSO (cambia estatus a "Baja" con fecha de fin)
// ============================================================
router.patch("/:inscripcionId/terminar", async (req, res) => {
  try {
    const { inscripcionId } = req.params;
    const { motivo } = req.body;

    const inscripcion = await Inscripcion.findById(inscripcionId);
    if (!inscripcion) {
      return res.status(404).json({ error: "Inscripción no encontrada" });
    }

    if (inscripcion.estatus === "Baja") {
      return res.status(400).json({ error: "El curso ya está terminado" });
    }

    inscripcion.estatus = "Baja";
    inscripcion.fechaBaja = new Date();
    inscripcion.motivoBaja = motivo || "Curso completado";
    await inscripcion.save();

    res.json({
      ok: true,
      mensaje: "Curso marcado como terminado",
      inscripcion
    });
  } catch (error) {
    console.error("❌ ERROR TERMINAR CURSO:", error);
    res.status(500).json({ error: error.message });
  }
});
export default router;