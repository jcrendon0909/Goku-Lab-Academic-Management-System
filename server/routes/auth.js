import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Usuario from '../models/Usuario.js';
import { getJwtSecret } from '../utils/jwtSecret.js';
import { enviarCorreoReset } from '../utils/email.js';

const router = express.Router();

// ===== LOGIN =====
router.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        const user = await Usuario.findOne({
            usuario: { $regex: new RegExp(`^${usuario.trim()}$`, 'i') }
        });

        if (!user) {
            return res.status(401).json({ error: "El usuario no existe en Goku Lab" });
        }

        const passwordCorrecto = await bcrypt.compare(password, user.password);
        if (!passwordCorrecto) {
            return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }

        const token = jwt.sign(
            { id: user._id, rol: user.rol, usuario: user.usuario },
            getJwtSecret(),
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { usuario: user.usuario, nombreCompleto: user.nombreCompleto, rol: user.rol }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ===== RECUPERACIÓN DE CONTRASEÑA =====

// POST /api/auth/forgot-password - Solicitar reset (desde login)
router.post('/forgot-password', async (req, res) => {
    try {
        const { usuario } = req.body;
        if (!usuario) {
            return res.status(400).json({ error: "El usuario es obligatorio" });
        }

        const user = await Usuario.findOne({
            usuario: { $regex: new RegExp(`^${usuario.trim()}$`, 'i') }
        });

        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Generar token aleatorio
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000; // 1 hora

        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(expires);
        await user.save();

        // Enviar correo
        await enviarCorreoReset(user.usuario, token);

        res.json({
            ok: true,
            mensaje: "Correo de recuperación enviado (revisa tu bandeja de entrada)"
        });
    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/reset-password - Restablecer contraseña con token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;
        if (!token || !nuevaPassword) {
            return res.status(400).json({ error: "Faltan datos" });
        }

        const user = await Usuario.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Token inválido o expirado" });
        }

        const hashed = await bcrypt.hash(nuevaPassword, 10);
        user.password = hashed;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({
            ok: true,
            mensaje: "Contraseña actualizada correctamente"
        });
    } catch (error) {
        console.error('Error en reset-password:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;