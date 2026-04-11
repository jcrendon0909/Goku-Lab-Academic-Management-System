import express from "express";
import mongoose from "mongoose"; 
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";

const router = express.Router();

router.get("/lista-completa", async (req, res) => {
    try {
        const pagosRaw = await Pago.find().lean();
        const abonosRaw = await Abono.find().lean();

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const anioActual = hoy.getFullYear();

        const respuestaProcesada = pagosRaw.map((pago) => {
            const pagoKey = String(pago.pagoId || pago.PagoId || "").trim().toUpperCase();

            const abonosDelMes = abonosRaw.filter((abono) => {
                const abonoKey = String(abono.pagoId || "").trim().toUpperCase();
                if (!abono.fechaAbono) return false;
                const fecha = new Date(abono.fechaAbono);
                return abonoKey === pagoKey &&
                    fecha.getMonth() === mesActual &&
                    fecha.getFullYear() === anioActual;
            });

            const montoTotal = Number(pago.montoPago) || 0;
            const totalAbonado = abonosDelMes.reduce((s, a) => s + (Number(a.montoAbono) || 0), 0);

            let saldo = montoTotal - totalAbonado;
            let status = totalAbonado >= montoTotal ? "Pagado" : (totalAbonado > 0 ? "Parcial" : "Pendiente");
            if (status === "Pagado") saldo = 0;

            const dia = Number(pago.diaPagoFijo) || 1;
            const fechaLimite = new Date(anioActual, mesActual, dia);

            return {
                id: pagoKey,
                nombreAlumno: pago.nombreAlumno,
                nombreCurso: pago.nombreCurso,
                montoTotal,
                montoPagado: totalAbonado,
                saldo: saldo < 0 ? 0 : saldo,
                status,
                fechaLimite: fechaLimite.toISOString()
            };
        });

        res.json(respuestaProcesada);
    } catch (error) {
        console.error("Error en servidor:", error);
        res.status(500).json({ error: "Error al procesar pagos" });
    }
});

export default router;