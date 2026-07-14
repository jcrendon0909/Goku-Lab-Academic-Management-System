import express from "express";
import Profesor from "../models/Profesor.js";
import Grupo from "../models/Grupo.js";
import Counter from "../models/Counter.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

async function generarIdProfesorSeguro() {
  const profesores = await Profesor.find().select("idProfesor").lean();
  let maxActual = 0;
  for (const p of profesores) {
    const match = String(p.idProfesor || "").match(/(\d+)\s*$/);
    if (match) {
      maxActual = Math.max(maxActual, parseInt(match[1], 10));
    }
  }
  await Counter.findOneAndUpdate(
    { nombre: "profesor" },
    { $max: { secuencia: maxActual } },
    { upsert: true }
  );
  return generarId("profesor");
}

router.get("/", async (req, res) => {
  try {
    const profesores = await Profesor.find().lean();
    res.status(200).json(profesores);
  } catch (error) {
    console.error("ERROR GET PROFESORES:", error);
    res.status(500).json({
      error: "Error al obtener profesores",
      detalle: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      nombre,
      fechaNacimiento,
      salarioPorHora,
      tipoPago,
      salarioMensual
    } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: "El nombre del maestro es obligatorio" });
    }

    const yaExiste = await Profesor.findOne({
      nombre: new RegExp(`^${nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (yaExiste) {
      return res.status(409).json({ error: "Ya existe un maestro con ese nombre" });
    }

    const idProfesor = await generarIdProfesorSeguro();

    const profesor = await Profesor.create({
      idProfesor,
      nombre: String(nombre).trim(),
      estatus: "Activo",
      fechaNacimiento: fechaNacimiento || null,
      salarioPorHora: salarioPorHora || 0,
      tipoPago: tipoPago || 'por_hora',
      salarioMensual: salarioMensual || 0
    });

    res.status(201).json(profesor);
  } catch (error) {
    console.error("ERROR POST PROFESOR:", error);
    res.status(500).json({
      error: "Error al crear el maestro",
      detalle: error.message,
    });
  }
});

router.patch("/:idProfesor", async (req, res) => {
  try {
    const { idProfesor } = req.params;
    const nombre = String(req.body?.nombre || "").trim();

    if (!nombre) {
      return res.status(400).json({ error: "El nombre del maestro es obligatorio" });
    }

    const profesor = await Profesor.findOne({ idProfesor });
    if (!profesor) {
      return res.status(404).json({ error: "Maestro no encontrado" });
    }

    const duplicado = await Profesor.findOne({
      idProfesor: { $ne: idProfesor },
      nombre: new RegExp(`^${nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (duplicado) {
      return res.status(409).json({ error: "Ya existe un maestro con ese nombre" });
    }

    const nombreAnterior = profesor.nombre;
    profesor.nombre = nombre;
    await profesor.save();

    // Reflejar el nuevo nombre en los grupos asignados
    await Grupo.updateMany(
      { $or: [{ idProfesor }, { nombreProfesor: nombreAnterior }] },
      { $set: { idProfesor, nombreProfesor: nombre } }
    );

    res.status(200).json(profesor);
  } catch (error) {
    console.error("ERROR PATCH NOMBRE PROFESOR:", error);
    res.status(500).json({
      error: "Error al editar el nombre del maestro",
      detalle: error.message,
    });
  }
});

router.patch("/:idProfesor/estatus", async (req, res) => {
  try {
    const { idProfesor } = req.params;
    const estatus = String(req.body?.estatus || "").trim();

    if (!["Activo", "Inactivo"].includes(estatus)) {
      return res.status(400).json({ error: "Estatus inválido (Activo o Inactivo)" });
    }

    const profesor = await Profesor.findOneAndUpdate(
      { idProfesor },
      { $set: { estatus } },
      { new: true }
    );

    if (!profesor) {
      return res.status(404).json({ error: "Maestro no encontrado" });
    }

    res.status(200).json(profesor);
  } catch (error) {
    console.error("ERROR PATCH PROFESOR ESTATUS:", error);
    res.status(500).json({
      error: "Error al actualizar el estatus del maestro",
      detalle: error.message,
    });
  }
});

// ===== ENDPOINT PARA ACTUALIZAR DATOS EXTRA (fecha, salarios, tipo) =====
router.patch("/:idProfesor/datos-extra", async (req, res) => {
  try {
    const { idProfesor } = req.params;
    const { fechaNacimiento, salarioPorHora, tipoPago, salarioMensual } = req.body;

    const update = {};
    if (fechaNacimiento !== undefined) update.fechaNacimiento = fechaNacimiento || null;
    if (salarioPorHora !== undefined) update.salarioPorHora = Math.max(0, parseFloat(salarioPorHora) || 0);
    if (tipoPago !== undefined) {
      if (!['por_hora', 'fijo_mensual'].includes(tipoPago)) {
        return res.status(400).json({ error: "tipoPago debe ser 'por_hora' o 'fijo_mensual'" });
      }
      update.tipoPago = tipoPago;
    }
    if (salarioMensual !== undefined) update.salarioMensual = Math.max(0, parseFloat(salarioMensual) || 0);

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No se enviaron datos para actualizar" });
    }

    const profesor = await Profesor.findOneAndUpdate(
      { idProfesor },
      { $set: update },
      { new: true }
    );

    if (!profesor) {
      return res.status(404).json({ error: "Maestro no encontrado" });
    }

    res.status(200).json(profesor);
  } catch (error) {
    console.error("ERROR PATCH DATOS EXTRA PROFESOR:", error);
    res.status(500).json({
      error: "Error al actualizar datos extra del maestro",
      detalle: error.message,
    });
  }
});

router.delete("/:idProfesor", async (req, res) => {
  try {
    const { idProfesor } = req.params;

    const profesor = await Profesor.findOne({ idProfesor });
    if (!profesor) {
      return res.status(404).json({ error: "Maestro no encontrado" });
    }

    const filtroGrupos = {
      $or: [{ idProfesor }, { nombreProfesor: profesor.nombre }],
    };

    const gruposAfectados = await Grupo.find(filtroGrupos)
      .select("IdGrupo nombreCurso diaClase horaClase")
      .lean();

    if (gruposAfectados.length > 0) {
      await Grupo.updateMany(filtroGrupos, {
        $set: { idProfesor: "", nombreProfesor: "" },
      });
    }

    await Profesor.deleteOne({ idProfesor });

    res.status(200).json({
      ok: true,
      eliminado: idProfesor,
      gruposAfectados: gruposAfectados.length,
      grupos: gruposAfectados,
    });
  } catch (error) {
    console.error("ERROR DELETE PROFESOR:", error);
    res.status(500).json({
      error: "Error al dar de baja al maestro",
      detalle: error.message,
    });
  }
});

export default router;