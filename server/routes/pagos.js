import express from "express";
import Pago from "../models/Pago.js";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import { crearPagoId } from "../utils/pagos.js";
import cache from "../utils/cache.js";

const router = express.Router();

// ============================================================
// FUNCIÓN PARA SINCRONIZAR PAGOS (EXPORTADA PARA index.js)
// ============================================================
export async function sincronizarPagosDesdeInscripciones() {
    const inscripciones = await Inscripcion.find({
        estatus: { $ne: "Baja" },
        montoMensualidad: { $gt: 0 },
    }).lean();

    if (!inscripciones.length) return;

    const grupos = await Grupo.find().lean();
    const gruposMap = new Map();
    for (const g of grupos) {
        const id = String(g.IdGrupo || g.idGrupo || "").trim();
        if (id) gruposMap.set(id.toUpperCase(), g);
    }

    for (const ins of inscripciones) {
        const idAlumno = String(ins.idAlumno || "").trim();
        const grupoId = String(ins.grupoId || ins.GrupoId || "").trim();
        if (!idAlumno || !grupoId) continue;

        const pagoId = crearPagoId(idAlumno, grupoId);
        const grupo = gruposMap.get(grupoId.toUpperCase());

        await Pago.updateOne(
            { pagoId },
            {
                $set: {
                    idAlumno,
                    nombreAlumno: ins.nombreAlumno || idAlumno,
                    grupoId,
                    nombreCurso: grupo?.nombreCurso || "Curso",
                    diaPago: Number(ins.diaPago) || 1,
                    montoPago: Number(ins.montoMensualidad),
                    fechaInicioPago: ins.fechaInicioPago || ins.fechaInscripcion || new Date(),
                    activo: true,
                    fechaBaja: null,
                    estatus: "Pendiente",
                },
            },
            { upsert: true }
        );
    }
}

// ============================================================
// GET /lista-completa – CON CACHÉ Y SIN SINCRONIZACIÓN
// ============================================================
router.get("/lista-completa", async (req, res) => {
    try {
        const {
            mes,
            anio,
            vista = 'control',
            busqueda = '',
            page = 1,
            limit = 50,
            criterioFechaPagados = 'real'
        } = req.query;

        console.log(`📥 [PAGOS] Solicitud: mes=${mes}, anio=${anio}, vista=${vista}, page=${page}`);

        // Clave de caché
        const cacheKey = `pagos-${mes}-${anio}-${vista}-${busqueda}-${page}-${limit}-${criterioFechaPagados}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`✅ Sirviendo desde caché: ${cacheKey}`);
            return res.json(cachedData);
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Filtro base
        const matchBase = { activo: true };
        if (busqueda) {
            matchBase.nombreAlumno = { $regex: busqueda, $options: 'i' };
        }

        // Obtener pagos con abonos (sin sincronización)
        const pagos = await Pago.aggregate([
            { $match: matchBase },
            {
                $lookup: {
                    from: "abonos",
                    let: { idDelPago: "$pagoId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$pagoId", "$$idDelPago"] } } },
                        { $sort: { fechaAbono: 1 } }
                    ],
                    as: "historialAbonos"
                }
            }
        ]);

        console.log(`📊 Pagos encontrados: ${pagos.length}`);

        // Agrupar por alumno+grupo
        const alumnosMap = new Map();
        for (const pago of pagos) {
            const key = `${pago.idAlumno}-${pago.grupoId}`;
            if (!alumnosMap.has(key)) {
                alumnosMap.set(key, {
                    idAlumno: pago.idAlumno,
                    grupoId: pago.grupoId,
                    nombreAlumno: pago.nombreAlumno,
                    nombreCurso: pago.nombreCurso,
                    pagos: [],
                    montoTotal: 0,
                    montoPagado: 0,
                    historialAbonos: [],
                    activo: true,
                    fechaBaja: null,
                });
            }
            const alum = alumnosMap.get(key);
            alum.pagos.push(pago);
            alum.montoTotal += pago.montoPago || 0;
            const abonos = pago.historialAbonos || [];
            const pagado = abonos.reduce((sum, a) => sum + (a.montoAbono || 0), 0);
            alum.montoPagado += pagado;
            alum.historialAbonos = alum.historialAbonos.concat(abonos);
        }

        // Construir periodos y filtrar según vista
        const hoy = new Date();
        const mesActual = mes ? parseInt(mes) : hoy.getMonth() + 1;
        const anioActual = anio ? parseInt(anio) : hoy.getFullYear();
        const totalMesesHoy = anioActual * 12 + mesActual;

        const resultadoCompleto = [];

        for (const [key, alum] of alumnosMap) {
            const pagosOrdenados = alum.pagos.sort((a, b) => new Date(a.fechaInicioPago) - new Date(b.fechaInicioPago));

            const periodosMensuales = pagosOrdenados.map((pago) => {
                const fechaVencimiento = new Date(pago.fechaInicioPago);
                const abonosDelPago = pago.historialAbonos || [];
                const totalAbonado = abonosDelPago.reduce((sum, a) => sum + (a.montoAbono || 0), 0);
                const saldo = Math.max(0, pago.montoPago - totalAbonado);
                const status = totalAbonado >= pago.montoPago ? "Pagado" : (totalAbonado > 0 ? "Parcial" : "Pendiente");

                return {
                    clave: `${fechaVencimiento.getFullYear()}-${String(fechaVencimiento.getMonth() + 1).padStart(2, '0')}`,
                    nombreMes: fechaVencimiento.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
                    vencimiento: fechaVencimiento.toISOString(),
                    monto: pago.montoPago || 0,
                    pagado: totalAbonado,
                    saldo: saldo,
                    status: status,
                    pagoId: pago.pagoId,
                    metodoAbono: abonosDelPago.length > 0 ? abonosDelPago[abonosDelPago.length - 1].metodoAbono : null,
                    fechaPagoReal: abonosDelPago.length > 0 ? abonosDelPago[abonosDelPago.length - 1].fechaAbono : null,
                };
            });

            const tienePendientesPasados = periodosMensuales.some((m) => {
                const v = new Date(m.vencimiento);
                return (v.getFullYear() * 12 + v.getMonth()) <= totalMesesHoy && m.status !== "Pagado";
            });
            const tieneProximosFuturos = periodosMensuales.some((m) => {
                const v = new Date(m.vencimiento);
                return (v.getFullYear() * 12 + v.getMonth()) > totalMesesHoy && m.status !== "Pagado";
            });

            let incluir = false;
            if (vista === 'control') {
                incluir = alum.activo !== false && tienePendientesPasados;
            } else if (vista === 'registro') {
                incluir = periodosMensuales.some(m => m.status === "Pagado") || (!alum.activo && alum.montoPagado > 0);
            } else if (vista === 'proximos') {
                incluir = alum.activo !== false && tieneProximosFuturos;
            }

            if (!incluir) continue;

            const totalMonto = periodosMensuales.reduce((sum, m) => sum + m.monto, 0);
            const totalPagado = periodosMensuales.reduce((sum, m) => sum + m.pagado, 0);
            const saldoTotal = Math.max(0, totalMonto - totalPagado);
            const statusGeneral = saldoTotal === 0 ? "Pagado" : (totalPagado > 0 ? "Parcial" : "Pendiente");

            const mesActualObj = periodosMensuales.find(m => {
                const v = new Date(m.vencimiento);
                return v.getMonth() === (mesActual - 1) && v.getFullYear() === anioActual;
            }) || periodosMensuales.find(m => m.status !== "Pagado") || periodosMensuales[0];

            resultadoCompleto.push({
                id: key,
                idAlumno: alum.idAlumno,
                grupoId: alum.grupoId,
                nombreAlumno: alum.nombreAlumno,
                nombreCurso: alum.nombreCurso,
                montoTotal: totalMonto,
                montoPagado: totalPagado,
                saldo: saldoTotal,
                status: statusGeneral,
                activo: alum.activo,
                fechaBaja: alum.fechaBaja,
                fechaLimite: mesActualObj?.vencimiento || null,
                periodosMensuales: periodosMensuales,
                cobroProgramado: false,
                metodoAbono: alum.historialAbonos.length > 0 ? alum.historialAbonos[alum.historialAbonos.length - 1].metodoAbono : null,
                fechaPagoReal: alum.historialAbonos.length > 0 ? alum.historialAbonos[alum.historialAbonos.length - 1].fechaAbono : null,
            });
        }

        // Paginación
        const total = resultadoCompleto.length;
        const paginatedData = resultadoCompleto.slice(skip, skip + limitNum);

        const totalPorRecolectar = paginatedData
            .filter(p => p.activo !== false)
            .reduce((sum, p) => {
                const mesEnCurso = (p.periodosMensuales || []).find((m) => {
                    if (!m.vencimiento) return false;
                    const v = new Date(m.vencimiento);
                    return v.getMonth() === (mesActual - 1) && v.getFullYear() === anioActual;
                });
                return sum + (mesEnCurso ? (mesEnCurso.saldo || 0) : 0);
            }, 0);

        const totalRecolectado = paginatedData
            .filter(p => p.activo !== false)
            .reduce((sum, p) => {
                const mesEnCurso = (p.periodosMensuales || []).find((m) => {
                    if (!m.vencimiento) return false;
                    const v = new Date(m.vencimiento);
                    return v.getMonth() === (mesActual - 1) && v.getFullYear() === anioActual;
                });
                return sum + (mesEnCurso ? (mesEnCurso.pagado || 0) : 0);
            }, 0);

        const responseData = {
            data: paginatedData,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            totales: {
                totalPorRecolectar,
                totalRecolectado
            }
        };

        // Guardar en caché (5 minutos)
        cache.set(cacheKey, responseData);
        console.log(`✅ Datos guardados en caché: ${cacheKey}`);

        res.json(responseData);

    } catch (error) {
        console.error("❌ Error en /lista-completa:", error);
        res.status(500).json({ error: "Error al obtener pagos" });
    }
});

// ============================================================
// PATCH /actualizar-dia/:id
// ============================================================
router.patch("/actualizar-dia/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoDia } = req.body;

        if (!nuevoDia || nuevoDia < 1 || nuevoDia > 31) {
            return res.status(400).json({ error: "Día de pago inválido (debe ser 1-31)" });
        }

        const pago = await Pago.findOne({ pagoId: id });
        if (!pago) {
            return res.status(404).json({ error: "Pago no encontrado" });
        }

        pago.diaPago = nuevoDia;
        pago.updatedAt = new Date();
        await pago.save();

        // Invalidar caché al actualizar
        cache.flushAll();
        console.log("🗑️ Caché invalidada por actualización de día de pago.");

        res.json({ ok: true, mensaje: "Día de pago actualizado", data: pago });
    } catch (error) {
        console.error("Error PATCH /actualizar-dia:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;