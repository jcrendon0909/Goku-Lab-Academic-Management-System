import express from "express";
import Profesor from "../models/Profesor.js";
import Usuario from "../models/Usuario.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

// ============================================================
// GET / - Obtener todos los profesores (solo admin)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const profesores = await Profesor.find().lean();
    res.json(profesores);
  } catch (error) {
    console.error("❌ GET /profesores:", error);
    res.status(500).json({ error: "Error al obtener profesores", detalle: error.message });
  }
});

// ============================================================
// GET /:id - Obtener un profesor por ID
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const profesor = await Profesor.findOne({ idProfesor: id }).lean();
    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }
    res.json(profesor);
  } catch (error) {
    console.error("❌ GET /profesores/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST / - Crear un profesor (con opción de crear usuario)
// ============================================================
router.post("/", async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      email,
      fechaNacimiento,
      tipoPago,
      salarioPorHora,
      salarioMensual,
      estatus,
      crearUsuario,
      usuario,
      password,
    } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const nuevoId = await generarId("profesor");

    const nuevoProfesor = new Profesor({
      idProfesor: nuevoId,
      nombre: nombre.trim(),
      telefono: telefono || "",
      email: email || "",
      fechaNacimiento: fechaNacimiento || null,
      tipoPago: tipoPago || "fijo_mensual",
      salarioPorHora: tipoPago === "por_hora" ? (salarioPorHora || 0) : 0,
      salarioMensual: tipoPago === "fijo_mensual" ? (salarioMensual || 0) : 0,
      estatus: estatus || "Activo",
    });

    await nuevoProfesor.save();

    if (crearUsuario) {
      if (!usuario || !password) {
        await Profesor.deleteOne({ idProfesor: nuevoId });
        return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
      }

      const usuarioExistente = await Usuario.findOne({ usuario });
      if (usuarioExistente) {
        await Profesor.deleteOne({ idProfesor: nuevoId });
        return res.status(409).json({ error: "El nombre de usuario ya está en uso" });
      }

      const nuevoUsuario = new Usuario({
        usuario,
        password,
        rol: "profesor",
        idProfesor: nuevoId,
      });
      await nuevoUsuario.save();
    }

    res.status(201).json(nuevoProfesor);
  } catch (error) {
    console.error("❌ POST /profesores:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /:id - Actualizar un profesor (todos los campos)
// ============================================================
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      telefono,
      email,
      fechaNacimiento,
      tipoPago,
      salarioPorHora,
      salarioMensual,
      estatus,
    } = req.body;

    console.log("📥 PATCH /profesores/:id - ID:", id);
    console.log("📥 Datos recibidos:", req.body);

    const profesor = await Profesor.findOne({ idProfesor: id });
    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    if (nombre !== undefined) profesor.nombre = nombre.trim();
    if (telefono !== undefined) profesor.telefono = telefono;
    if (email !== undefined) profesor.email = email;
    if (fechaNacimiento !== undefined) profesor.fechaNacimiento = fechaNacimiento;
    if (tipoPago !== undefined) {
      profesor.tipoPago = tipoPago;
      if (tipoPago === "por_hora") {
        profesor.salarioMensual = 0;
        if (salarioPorHora !== undefined) profesor.salarioPorHora = salarioPorHora;
      } else {
        profesor.salarioPorHora = 0;
        if (salarioMensual !== undefined) profesor.salarioMensual = salarioMensual;
      }
    } else {
      if (salarioPorHora !== undefined && profesor.tipoPago === "por_hora") {
        profesor.salarioPorHora = salarioPorHora;
      }
      if (salarioMensual !== undefined && profesor.tipoPago === "fijo_mensual") {
        profesor.salarioMensual = salarioMensual;
      }
    }
    if (estatus !== undefined) profesor.estatus = estatus;

    await profesor.save();

    res.json({
      ok: true,
      mensaje: "Profesor actualizado",
      profesor,
    });
  } catch (error) {
    console.error("❌ PATCH /profesores/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /:id/estatus - Cambiar estatus (Activo/Inactivo)
// ============================================================
router.patch("/:id/estatus", async (req, res) => {
  try {
    const { id } = req.params;
    const { estatus } = req.body;

    if (!estatus || !["Activo", "Inactivo"].includes(estatus)) {
      return res.status(400).json({ error: "Estatus inválido" });
    }

    const profesor = await Profesor.findOne({ idProfesor: id });
    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    profesor.estatus = estatus;
    await profesor.save();

    res.json({
      ok: true,
      mensaje: `Estatus actualizado a ${estatus}`,
      profesor,
    });
  } catch (error) {
    console.error("❌ PATCH /profesores/:id/estatus:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DELETE /:id - Eliminar profesor (físicamente)
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const profesor = await Profesor.findOneAndDelete({ idProfesor: id });
    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    await Usuario.deleteOne({ idProfesor: id });

    res.json({ ok: true, mensaje: "Profesor eliminado" });
  } catch (error) {
    console.error("❌ DELETE /profesores/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🆕 GET /:id/grupos - Obtener grupos de un profesor con alumnos
// ============================================================
router.get("/:id/grupos", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el profesor existe
    const profesor = await Profesor.findOne({ idProfesor: id });
    if (!profesor) {
      return res.status(404).json({ error: "Profesor no encontrado" });
    }

    // Obtener grupos activos del profesor
    const grupos = await Grupo.find({
      idProfesor: id,
      Estatus: "Activo",
    }).lean();

    // Para cada grupo, obtener los alumnos inscritos
    const gruposConAlumnos = await Promise.all(
      grupos.map(async (grupo) => {
        const inscripciones = await Inscripcion.find({
          grupoId: grupo.IdGrupo,
          estatus: "Activa",
        }).lean();
        return {
          ...grupo,
          alumnos: inscripciones.map((ins) => ({
            idAlumno: ins.idAlumno,
            nombreAlumno: ins.nombreAlumno,
            modalidad: ins.modalidad,
          })),
          totalAlumnos: inscripciones.length,
        };
      })
    );

    res.json(gruposConAlumnos);
  } catch (error) {
    console.error("❌ GET /profesores/:id/grupos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🆕 GET /mis-grupos - Obtener grupos del profesor autenticado
// ============================================================
router.get("/mis-grupos", async (req, res) => {
  try {
    // Obtener idProfesor del usuario autenticado (debe venir del middleware de auth)
    const idProfesor = req.user?.idProfesor;
    if (!idProfesor) {
      return res.status(401).json({ error: "No autorizado" });
    }

    // Redirigir al endpoint de grupos con el id del profesor
    const grupos = await Grupo.find({
      idProfesor: idProfesor,
      Estatus: "Activo",
    }).lean();

    const gruposConAlumnos = await Promise.all(
      grupos.map(async (grupo) => {
        const inscripciones = await Inscripcion.find({
          grupoId: grupo.IdGrupo,
          estatus: "Activa",
        }).lean();
        return {
          ...grupo,
          alumnos: inscripciones.map((ins) => ({
            idAlumno: ins.idAlumno,
            nombreAlumno: ins.nombreAlumno,
            modalidad: ins.modalidad,
          })),
          totalAlumnos: inscripciones.length,
        };
      })
    );

    res.json(gruposConAlumnos);
  } catch (error) {
    console.error("❌ GET /profesores/mis-grupos:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;