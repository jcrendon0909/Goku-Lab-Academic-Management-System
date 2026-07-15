import express from "express";
import Profesor from "../models/Profesor.js";
import Grupo from "../models/Grupo.js";
import Counter from "../models/Counter.js";
import { generarId } from "../utils/generarId.js";
import Usuario from "../models/Usuario.js"; // 👈 Añadir esta importación
import bcrypt from "bcryptjs"; // 👈 Añadir esta importación

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
      salarioMensual,
      // 👇 Nuevos campos de usuario
      crearUsuario,
      usuario,
      password,
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
      salarioMensual: salarioMensual || 0,
    });

    // ===== CREACIÓN DE USUARIO OPCIONAL =====
    if (crearUsuario === true && usuario && password) {
      const usuarioExistente = await Usuario.findOne({
        usuario: usuario.toLowerCase().trim(),
      });
      if (usuarioExistente) {
        console.warn(`El usuario ${usuario} ya existe, no se creó duplicado.`);
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const nuevoUsuario = new Usuario({
          usuario: usuario.toLowerCase().trim(),
          password: hashedPassword,
          nombreCompleto: String(nombre).trim(),
          rol: "profesor",
          idProfesor: idProfesor,
        });
        await nuevoUsuario.save();
        console.log(`✅ Usuario creado para profesor ${idProfesor}`);
      }
    }

    res.status(201).json(profesor);
  } catch (error) {
    console.error("ERROR POST PROFESOR:", error);
    res.status(500).json({
      error: "Error al crear el maestro",
      detalle: error.message,
    });
  }
});

// El resto de las rutas (PATCH, DELETE) se mantienen igual que antes.
// Aquí solo pondré los cambios mínimos para no duplicar todo, pero te recomiendo reemplazar el archivo completo con el código que ya tenías, añadiendo las líneas indicadas.

// router.patch para nombre, estatus, datos-extra y delete existen y se mantienen.
// No los repito por brevedad, pero debes asegurarte de que tu archivo tenga todas las rutas que ya tenías.

export default router;