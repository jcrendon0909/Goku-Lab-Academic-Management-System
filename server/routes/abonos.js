import express from "express";
import Abono from "../models/Abono.js";

const router = express.Router();

// Ruta para registrar un nuevo pago (Abono o Liquidación)
router.post("/", async (req, res) => {
    try {
        const { pagoId, montoAbono, nombreAlumno, metodoAbono } = req.body;

        // Validacion basica
        if (!pagoId || !montoAbono) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const nuevoAbono = new Abono({
            abonoId: `ABO-${Date.now()}`, // Genera un ID unico basado en el tiempo
            nombreAlumno: nombreAlumno,
            pagoId: pagoId,
            fechaAbono: new Date().toISOString(), // Fecha actual en formato String
            montoAbono: Number(montoAbono),
            metodoAbono: metodoAbono || "Efectivo",
            numeroDeabono: "1" // Puedes hacerlo incremental despues si gustas
        });

        await nuevoAbono.save();

        res.status(201).json({
            message: "Pago registrado con exito",
            data: nuevoAbono
        });

    } catch (error) {
        console.error("Error al guardar abono:", error);
        res.status(500).json({ error: "Error interno al procesar el pago" });
    }
});

export default router;