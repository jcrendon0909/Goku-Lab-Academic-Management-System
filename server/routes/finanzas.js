import express from "express";
import Pago from "../models/Pago.js";
import Alumno from "../models/Alumno.js";
import Gasto from "../models/Gasto.js";

const router = express.Router();

// --- 1. Resumen General: Ingresos, Gastos, Utilidad ---
router.get("/resumen", async (req, res) => {
    try {
        const { anio = new Date().getFullYear(), mes } = req.query;

        // Construir filtro de fecha para el año (y mes si se proporciona)
        const filtroAnio = { anio: parseInt(anio) };
        if (mes) filtroAnio.mes = mes;

        // Total de Ingresos (suma de montos de pago de alumnos activos o estables)
        // Aquí puedes filtrar por situación_percibida si quieres (ej: solo "Estable" y "Terminó curso")
        const ingresos = await Pago.aggregate([
            { $match: { ...filtroAnio, activo: true } },
            { $group: { _id: null, total: { $sum: "$montoPago" } } }
        ]);

        // Total de Gastos
        const gastos = await Gasto.aggregate([
            { $match: filtroAnio },
            { $group: { _id: null, total: { $sum: "$monto" } } }
        ]);

        const totalIngresos = ingresos.length > 0 ? ingresos[0].total : 0;
        const totalGastos = gastos.length > 0 ? gastos[0].total : 0;
        const utilidad = totalIngresos - totalGastos;
        const porcentajeUtilidad = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

        res.json({
            anio: parseInt(anio),
            mes: mes || "Anual",
            ingresos: totalIngresos,
            gastos: totalGastos,
            utilidad,
            porcentajeUtilidad: parseFloat(porcentajeUtilidad.toFixed(2))
        });
    } catch (error) {
        console.error("ERROR RESUMEN FINANCIERO:", error);
        res.status(500).json({ error: "Error al obtener resumen financiero", detalle: error.message });
    }
});

// --- 2. Rentabilidad por Profesor ---
router.get("/rentabilidad-profesores", async (req, res) => {
    try {
        const { anio = new Date().getFullYear(), mes } = req.query;

        // Filtro de año para pagos
        const filtroAnio = { anio: parseInt(anio) };
        if (mes) filtroAnio.mes = mes;

        // 1. Ingresos por profesor: sumar montos de pago agrupados por profesor
        // Nota: Asumimos que el profesor se obtiene del curso en Inscripcion o del pago.
        // Para este ejemplo, usaremos un campo `profesor` en Pago (si no existe, podemos obtenerlo de Inscripcion).
        // Como no tenemos ese campo en Pago, haremos un lookup con Inscripcion.
        const ingresosPorProfesor = await Pago.aggregate([
            { $match: { ...filtroAnio, activo: true } },
            {
                $lookup: {
                    from: "inscripciones",
                    localField: "idAlumno",
                    foreignField: "idAlumno",
                    as: "inscripcion"
                }
            },
            { $unwind: { path: "$inscripcion", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$inscripcion.profesor", // Asumiendo que Inscripcion tiene campo `profesor`
                    totalIngresos: { $sum: "$montoPago" },
                    alumnos: { $addToSet: "$idAlumno" }
                }
            },
            {
                $project: {
                    profesor: { $ifNull: ["$_id", "Sin Profesor"] },
                    totalIngresos: 1,
                    numAlumnos: { $size: "$alumnos" },
                    _id: 0
                }
            }
        ]);

        // 2. Costo por profesor (lo obtienes de una tabla de configuración o de un modelo Profesor)
        // Aquí puedes mockearlo o consultar un modelo Profesor si existe.
        // Por ahora, usaremos un objeto en memoria para simular.
        const costoPorProfesor = {
            "Ana Karina Matías": 13000,
            "Eduardo Castro": 6400,
            "José Daniel Piña": 0,
            "Adam": 0,
            "Claudia Sierra": 0,
            "Juan Carlos Rendón": 0,
            "Krishna": 1200,
            "Robotica": 2400,
            "Daniel Altamirano": 3200,
            "Lizbeth": 2400
        };

        // 3. Combinar y calcular utilidad
        const resultado = ingresosPorProfesor.map(item => {
            const costo = costoPorProfesor[item.profesor] || 0;
            const utilidad = item.totalIngresos - costo;
            const porcentajeUtilidad = item.totalIngresos > 0 ? (utilidad / item.totalIngresos) * 100 : 0;

            return {
                profesor: item.profesor,
                alumnos: item.numAlumnos,
                ingresos: item.totalIngresos,
                costo,
                utilidad,
                porcentajeUtilidad: parseFloat(porcentajeUtilidad.toFixed(2))
            };
        });

        res.json(resultado);
    } catch (error) {
        console.error("ERROR RENTABILIDAD PROFESORES:", error);
        res.status(500).json({ error: "Error al obtener rentabilidad por profesor", detalle: error.message });
    }
});

// --- 3. (Opcional) Ingresos por Curso y Mes ---
router.get("/ingresos-por-curso", async (req, res) => {
    try {
        const { anio = new Date().getFullYear() } = req.query;

        const ingresosPorCurso = await Pago.aggregate([
            { $match: { anio: parseInt(anio), activo: true } },
            {
                $group: {
                    _id: { mes: "$mesCorrespondiente", curso: "$nombreCurso" },
                    total: { $sum: "$montoPago" }
                }
            },
            {
                $group: {
                    _id: "$_id.mes",
                    cursos: { $push: { nombre: "$_id.curso", total: "$total" } },
                    totalMes: { $sum: "$total" }
                }
            },
            { $sort: { "_id": 1 } } // Ordenar por mes
        ]);

        res.json(ingresosPorCurso);
    } catch (error) {
        console.error("ERROR INGRESOS POR CURSO:", error);
        res.status(500).json({ error: "Error al obtener ingresos por curso", detalle: error.message });
    }
});

// --- 4. (Opcional) Lista de Gastos con Filtros ---
router.get("/gastos", async (req, res) => {
    try {
        const { mes, anio, categoria } = req.query;
        const filtro = {};
        if (mes) filtro.mes = mes;
        if (anio) filtro.anio = parseInt(anio);
        if (categoria) filtro.categoria = categoria;

        const gastos = await Gasto.find(filtro).sort({ fecha: -1 });
        res.json(gastos);
    } catch (error) {
        console.error("ERROR LISTA GASTOS:", error);
        res.status(500).json({ error: "Error al obtener gastos", detalle: error.message });
    }
});

// --- 5. (Opcional) Crear un Gasto ---
router.post("/gastos", async (req, res) => {
    try {
        const nuevoGasto = new Gasto(req.body);
        await nuevoGasto.save();
        res.status(201).json(nuevoGasto);
    } catch (error) {
        console.error("ERROR CREAR GASTO:", error);
        res.status(400).json({ error: "Error al crear gasto", detalle: error.message });
    }
});

export default router;