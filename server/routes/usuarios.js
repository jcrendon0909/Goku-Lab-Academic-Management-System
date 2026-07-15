import express from "express";
import Usuario from "../models/Usuario.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = express.Router();

// GET /api/usuarios - Obtener todos los usuarios (sin datos sensibles)
router.get("/", async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .lean();
    res.json(usuarios);
  } catch (error) {
    console.error("Error GET /usuarios:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios - Crear un nuevo usuario (solo admin)
router.post("/", async (req, res) => {
  try {
    const { usuario, password, nombreCompleto, rol, idProfesor } = req.body;

    if (!usuario || !password || !nombreCompleto) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    const usuarioExistente = await Usuario.findOne({
      usuario: usuario.toLowerCase().trim(),
    });
    if (usuarioExistente) {
      return res.status(409).json({ error: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = new Usuario({
      usuario: usuario.toLowerCase().trim(),
      password: hashedPassword,
      nombreCompleto: nombreCompleto.trim(),
      rol: rol || "profesor",
      idProfesor: idProfesor || "",
    });

    await nuevoUsuario.save();

    const usuarioRespuesta = nuevoUsuario.toObject();
    delete usuarioRespuesta.password;
    delete usuarioRespuesta.resetPasswordToken;
    delete usuarioRespuesta.resetPasswordExpires;

    res.status(201).json(usuarioRespuesta);
  } catch (error) {
    console.error("Error POST /usuarios:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/usuarios/:id - Actualizar usuario (rol, nombre, idProfesor)
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rol, nombreCompleto, idProfesor } = req.body;

    const update = {};
    if (rol) update.rol = rol;
    if (nombreCompleto) update.nombreCompleto = nombreCompleto.trim();
    if (idProfesor !== undefined) update.idProfesor = idProfesor;

    const usuario = await Usuario.findByIdAndUpdate(id, update, { new: true })
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    console.error("Error PATCH /usuarios/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/usuarios/:id - Eliminar usuario
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByIdAndDelete(id);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ ok: true, mensaje: "Usuario eliminado" });
  } catch (error) {
    console.error("Error DELETE /usuarios/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/:id/reset-password - Generar token (sin correo)
router.post("/:id/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 3600000;

    usuario.resetPasswordToken = token;
    usuario.resetPasswordExpires = new Date(expires);
    await usuario.save();

    res.json({
      ok: true,
      token: token,
      mensaje: "Token generado. Compártelo con el usuario para que restablezca su contraseña."
    });
  } catch (error) {
    console.error("Error POST /usuarios/:id/reset-password:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;