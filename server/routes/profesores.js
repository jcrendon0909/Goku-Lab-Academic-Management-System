import express from "express";
import Profesor from "../models/Profesor.js";
import Grupo from "../models/Grupo.js";
import Counter from "../models/Counter.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

// Genera el siguiente idProfesor evitando choques con IDs ya existentes.
// (El contador podía estar desincronizado y generar un PROF### duplicado.)
async function generarIdProfesorSeguro() {
  const profesores = await Profesor.find().select("idProfesor").lean();
  let maxActual = 0;
  for (const p of profesores) {
    const match = String(p.idProfesor || "").match(/(\d+)\s*$/);
    if (match) {
      maxActual = Math.max(maxActual, parseInt(match[1], 10));
    }
  }

  // Aseguramos que el contador esté al menos en el máximo existente
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

// Inscribir (crear) un nuevo maestro
router.post("/", async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();

    if (!nombre) {
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
      nombre,
      estatus: "Activo",
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

// Editar el nombre de un maestro (se refleja en sus grupos)
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

// Dar de alta / baja un maestro (cambiar estatus)
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

// Dar de baja del sistema (eliminar) un maestro.
// Si tenía grupos asignados, esos grupos quedan SIN profesor asignado.
router.delete("/:idProfesor", async (req, res) => {
  try {
    const { idProfesor } = req.params;

    const profesor = await Profesor.findOne({ idProfesor });
    if (!profesor) {
      return res.status(404).json({ error: "Maestro no encontrado" });
    }

    // Grupos que dependían de este maestro (por id o por nombre)
    const filtroGrupos = {
      $or: [{ idProfesor }, { nombreProfesor: profesor.nombre }],
    };

    const gruposAfectados = await Grupo.find(filtroGrupos)
      .select("IdGrupo nombreCurso diaClase horaClase")
      .lean();

    // Se dejan sin profesor asignado (no se borran los grupos)
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