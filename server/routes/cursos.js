import express from "express";
import Curso from "../models/Curso.js";
import Grupo from "../models/Grupo.js";
import Counter from "../models/Counter.js";
import Pago from "../models/Pago.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

// Genera el siguiente idCurso evitando choques con IDs ya existentes.
async function generarIdCursoSeguro() {
  const cursos = await Curso.find().select("idCurso").lean();
  let maxActual = 0;
  for (const c of cursos) {
    const match = String(c.idCurso || "").match(/(\d+)\s*$/);
    if (match) {
      maxActual = Math.max(maxActual, parseInt(match[1], 10));
    }
  }

  await Counter.findOneAndUpdate(
    { nombre: "curso" },
    { $max: { secuencia: maxActual } },
    { upsert: true }
  );

  return generarId("curso");
}

router.get("/", async (req, res) => {
  try {
    const cursos = await Curso.find().lean();
    res.status(200).json(cursos);
  } catch (error) {
    console.error("ERROR GET CURSOS:", error);
    res.status(500).json({
      error: "Error al obtener cursos",
      detalle: error.message,
    });
  }
});

// Dar de alta (crear) un nuevo curso
router.post("/", async (req, res) => {
  try {
    const nombreCurso = String(req.body?.nombreCurso || req.body?.nombre || "").trim();

    if (!nombreCurso) {
      return res.status(400).json({ error: "El nombre del curso es obligatorio" });
    }

    const yaExiste = await Curso.findOne({
      nombreCurso: new RegExp(
        `^${nombreCurso.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      ),
    });
    if (yaExiste) {
      return res.status(409).json({ error: "Ya existe un curso con ese nombre" });
    }

    const idCurso = await generarIdCursoSeguro();

    const curso = await Curso.create({
      idCurso,
      nombreCurso,
      estatus: "Activo",
    });

    res.status(201).json(curso);
  } catch (error) {
    console.error("ERROR POST CURSO:", error);
    res.status(500).json({
      error: "Error al crear el curso",
      detalle: error.message,
    });
  }
});

// Editar curso (todos los campos)
router.patch("/:idCurso", async (req, res) => {
  try {
    const { idCurso } = req.params;
    const { nombreCurso, precioMensualidad, duracionMeses, nivel, categoria, estatus } = req.body;

    // Validar que al menos un campo sea enviado
    if (!nombreCurso && precioMensualidad === undefined && duracionMeses === undefined && !nivel && !categoria && !estatus) {
      return res.status(400).json({ error: "Al menos un campo debe ser enviado" });
    }

    const curso = await Curso.findOne({ idCurso });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    // Si se envía nombreCurso, validar duplicados (excluyendo el propio curso)
    if (nombreCurso && nombreCurso.trim() !== curso.nombreCurso) {
      const duplicado = await Curso.findOne({
        idCurso: { $ne: idCurso },
        nombreCurso: new RegExp(
          `^${nombreCurso.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i"
        ),
      });
      if (duplicado) {
        return res.status(409).json({ error: "Ya existe un curso con ese nombre" });
      }
    }

    // Construir objeto de actualización
    const updateData = {};
    if (nombreCurso !== undefined) updateData.nombreCurso = nombreCurso.trim();
    if (precioMensualidad !== undefined) updateData.precioMensualidad = precioMensualidad;
    if (duracionMeses !== undefined) updateData.duracionMeses = duracionMeses;
    if (nivel !== undefined) updateData.nivel = nivel;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (estatus !== undefined) updateData.estatus = estatus;

    // Actualizar el curso
    const cursoActualizado = await Curso.findOneAndUpdate(
      { idCurso },
      { $set: updateData },
      { new: true }
    );

    // Si se cambió el nombre, reflejar en grupos y pagos (solo el nombre)
    if (nombreCurso && nombreCurso.trim() !== curso.nombreCurso) {
      await Grupo.updateMany(
        { idCurso: idCurso },
        { $set: { nombreCurso: nombreCurso.trim() } }
      );
      await Pago.updateMany(
        { nombreCurso: curso.nombreCurso },
        { $set: { nombreCurso: nombreCurso.trim() } }
      );
    }

    // Nota: Los demás campos (precio, duración, nivel, categoría, estatus) NO se propagan a grupos/pagos,
    // ya que son datos referenciales del curso. Los grupos y pagos solo guardan el nombre del curso.

    res.status(200).json(cursoActualizado);
  } catch (error) {
    console.error("ERROR PATCH CURSO:", error);
    res.status(500).json({
      error: "Error al actualizar el curso",
      detalle: error.message,
    });
  }
});

// Dar de alta / inactivar un curso (cambiar estatus) - esta ruta ya no es necesaria si usamos la general, pero la dejamos por compatibilidad
router.patch("/:idCurso/estatus", async (req, res) => {
  try {
    const { idCurso } = req.params;
    const estatus = String(req.body?.estatus || "").trim();

    if (!["Activo", "Inactivo"].includes(estatus)) {
      return res.status(400).json({ error: "Estatus inválido (Activo o Inactivo)" });
    }

    const curso = await Curso.findOneAndUpdate(
      { idCurso },
      { $set: { estatus } },
      { new: true }
    );

    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    res.status(200).json(curso);
  } catch (error) {
    console.error("ERROR PATCH CURSO ESTATUS:", error);
    res.status(500).json({
      error: "Error al actualizar el estatus del curso",
      detalle: error.message,
    });
  }
});

// Borrar un curso. Los grupos que lo usaban quedan SIN curso asignado.
router.delete("/:idCurso", async (req, res) => {
  try {
    const { idCurso } = req.params;

    const curso = await Curso.findOne({ idCurso });
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    const filtroGrupos = {
      $or: [{ idCurso }, { nombreCurso: curso.nombreCurso }],
    };

    const gruposAfectados = await Grupo.find(filtroGrupos)
      .select("IdGrupo nombreCurso diaClase horaClase")
      .lean();

    if (gruposAfectados.length > 0) {
      await Grupo.updateMany(filtroGrupos, {
        $set: { idCurso: "", nombreCurso: "" },
      });
    }

    await Curso.deleteOne({ idCurso });

    res.status(200).json({
      ok: true,
      eliminado: idCurso,
      gruposAfectados: gruposAfectados.length,
      grupos: gruposAfectados,
    });
  } catch (error) {
    console.error("ERROR DELETE CURSO:", error);
    res.status(500).json({
      error: "Error al borrar el curso",
      detalle: error.message,
    });
  }
});

export default router;