import express from "express";
import mongoose from "mongoose"; // IMPORTANTE: Agregamos mongoose aquí
import Abono from "../models/Abono.js";
import Pago from "../models/Pago.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { pagoId, montoAbono, nombreAlumno, metodoAbono, fechaAbono, nuevoMontoMensual } = req.body;

        if (!nombreAlumno || !montoAbono) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        let fechaFinal = new Date();
        if (fechaAbono) {
            const [year, month, day] = fechaAbono.split("-").map(Number);
            fechaFinal = new Date(year, month - 1, day, 12, 0, 0);
        }

        // 1. GUARDAMOS EL RECIBO HISTÓRICO SIEMPRE
        const nuevoAbono = new Abono({
            abonoId: `ABO-${Date.now()}`,
            nombreAlumno: nombreAlumno,
            pagoId: pagoId || `MULTIPLE-${Date.now()}`,
            fechaAbono: fechaFinal.toISOString(),
            montoAbono: Number(montoAbono),
            metodoAbono: metodoAbono || "Efectivo",
            numeroDeabono: "1"
        });

        await nuevoAbono.save();

        // ----------------------------------------------------------------
        // 2. BUSCAMOS AL ALUMNO (Con protección Anti-CastError)
        // ----------------------------------------------------------------
        const nombreClean = nombreAlumno.trim();
        let pagosDelAlumno = await Pago.find({
            nombreAlumno: { $regex: new RegExp(`^\\s*${nombreClean}\\s*$`, 'i') }
        });

        if (!pagosDelAlumno || pagosDelAlumno.length === 0) {
            // Prevenimos el CastError validando primero si el ID es de 24 caracteres
            let queryOr = [{ id: pagoId }, { pagoId: pagoId }];
            if (mongoose.Types.ObjectId.isValid(pagoId)) {
                queryOr.push({ _id: pagoId });
            }

            const docAncla = await Pago.findOne({ $or: queryOr });
            if (docAncla && docAncla.nombreAlumno) {
                pagosDelAlumno = await Pago.find({
                    nombreAlumno: { $regex: new RegExp(`^\\s*${docAncla.nombreAlumno.trim()}\\s*$`, 'i') }
                });
            }
        }

        if (pagosDelAlumno && pagosDelAlumno.length > 0) {
            let dineroEnMano = Number(montoAbono);

            // ----------------------------------------------------------------
            // 3. PAGAR MESES EXISTENTES DE TODOS SUS CURSOS
            // ----------------------------------------------------------------
            let mesesExistentes = [];
            for (let doc of pagosDelAlumno) {
                if (!doc.periodosMensuales) doc.periodosMensuales = [];
                for (let mes of doc.periodosMensuales) {
                    mesesExistentes.push({ mes: mes, doc: doc });
                }
            }

            // Ordenamos cronológicamente para pagar lo más viejo primero
            mesesExistentes.sort((a, b) => new Date(a.mes.vencimiento) - new Date(b.mes.vencimiento));

            for (let item of mesesExistentes) {
                if (dineroEnMano <= 0) break;

                if (item.mes.status !== "Pagado") {
                    let tarifaOriginal = item.mes.monto || item.doc.montoPago || item.doc.montoMensualidad || 0;
                    let pagado = item.mes.pagado || 0;
                    let debe = tarifaOriginal - pagado;

                    if (debe > 0) {
                        let abono = Math.min(dineroEnMano, debe);

                        item.mes.pagado = pagado + abono;
                        item.mes.monto = tarifaOriginal;
                        item.mes.saldo = tarifaOriginal - item.mes.pagado;
                        item.mes.status = item.mes.pagado >= tarifaOriginal ? "Pagado" : "Parcial";
                        item.mes.fechaPagoReal = fechaFinal.toISOString();
                        item.mes.metodoAbono = metodoAbono || "Efectivo";

                        dineroEnMano -= abono;
                    }
                }
            }

            // ----------------------------------------------------------------
            // 4. CREAR MESES FUTUROS SI AÚN SOBRA DINERO
            // ----------------------------------------------------------------
            // Filtramos cursos que tengan cobro activo. Si todos están en $0, usamos el primero por defecto.
            let cursosParaProyectar = pagosDelAlumno.filter(p => (p.montoPago || p.montoMensualidad) > 0);
            if (cursosParaProyectar.length === 0) cursosParaProyectar = [pagosDelAlumno[0]];

            while (dineroEnMano > 0) {
                let cursoElegido = null;
                let fechaVence = new Date("2100-01-01"); // Fecha pivote lejana

                // Buscamos qué curso se quedó más atrasado para inyectarle el mes
                for (let doc of cursosParaProyectar) {
                    let nextDate;
                    if (doc.periodosMensuales.length > 0) {
                        let ultimoMes = doc.periodosMensuales[doc.periodosMensuales.length - 1];
                        nextDate = new Date(ultimoMes.vencimiento);
                        nextDate.setMonth(nextDate.getMonth() + 1); // Sumamos 1 mes
                    } else {
                        nextDate = doc.fechaInicioPago ? new Date(doc.fechaInicioPago) : new Date();
                        nextDate.setDate(doc.diaPago || 1);
                    }

                    if (nextDate < fechaVence) {
                        fechaVence = nextDate;
                        cursoElegido = doc;
                    }
                }

                // Determinamos la tarifa (y evitamos bucles infinitos por tarifas en $0)
                let tarifaCosto = cursoElegido.montoPago || cursoElegido.montoMensualidad || 0;
                if (tarifaCosto <= 0) tarifaCosto = 100; // Failsafe para evitar infinito

                let abono = Math.min(dineroEnMano, tarifaCosto);

                const anio = fechaVence.getFullYear();
                const mesNum = String(fechaVence.getMonth() + 1).padStart(2, '0');
                const nombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

                // Empujamos formalmente al arreglo de Mongoose
                cursoElegido.periodosMensuales.push({
                    clave: `${anio}-${mesNum}`,
                    nombreMes: `${nombres[fechaVence.getMonth()]} De ${anio}`,
                    vencimiento: fechaVence.toISOString(),
                    monto: tarifaCosto,
                    pagado: abono,
                    saldo: tarifaCosto - abono,
                    status: abono >= tarifaCosto ? "Pagado" : "Parcial",
                    fechaPagoReal: fechaFinal.toISOString(),
                    metodoAbono: metodoAbono || "Efectivo"
                });

                cursoElegido.montoTotal = (cursoElegido.montoTotal || 0) + tarifaCosto;
                dineroEnMano -= abono;
            }

            // ----------------------------------------------------------------
            // 5. CAMBIAR TARIFA PARA EL FUTURO (Opcional)
            // ----------------------------------------------------------------
            if (nuevoMontoMensual) {
                let principal = pagosDelAlumno[0];
                let nt = Number(nuevoMontoMensual);

                principal.montoPago = nt;
                principal.montoMensualidad = nt;

                for (let mes of principal.periodosMensuales) {
                    if (mes.status !== "Pagado") {
                        mes.monto = nt;
                        mes.saldo = nt - (mes.pagado || 0);
                    }
                }

                // Desactivamos el cobro de las secundarias para no duplicarle pagos a futuro
                for (let i = 1; i < pagosDelAlumno.length; i++) {
                    pagosDelAlumno[i].montoPago = 0;
                    pagosDelAlumno[i].montoMensualidad = 0;
                    for (let mes of pagosDelAlumno[i].periodosMensuales) {
                        if (mes.status !== "Pagado") {
                            mes.monto = 0;
                            mes.saldo = 0 - (mes.pagado || 0);
                            mes.status = mes.pagado > 0 ? "Pagado" : "Programado";
                        }
                    }
                }
            }

            // ----------------------------------------------------------------
            // 6. GUARDAR TODO DE FORMA 100% SEGURA EN MONGOOSE
            // ----------------------------------------------------------------
            for (let pago of pagosDelAlumno) {
                pago.montoPagado = pago.periodosMensuales.reduce((sum, m) => sum + (m.pagado || 0), 0);
                pago.montoTotal = pago.periodosMensuales.reduce((sum, m) => sum + (m.monto || 0), 0);
                pago.saldo = pago.montoTotal - pago.montoPagado;

                // Le avisamos a Mongoose explícitamente que los meses cambiaron para que no los borre
                pago.markModified('periodosMensuales');
                await pago.save();
            }
        }

        res.status(201).json({
            message: "Pago distribuido en cascada con éxito",
            data: nuevoAbono
        });

    } catch (error) {
        console.error("============= ERROR INTERNO =============");
        console.error(error);
        res.status(500).json({ error: "Error interno al procesar el pago" });
    }
});

export default router;