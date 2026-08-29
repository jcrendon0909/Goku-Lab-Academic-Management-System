import express from "express";
import Pago from "../models/Pago.js";
import Inscripcion from "../models/Inscripcion.js";
import Grupo from "../models/Grupo.js";
import { crearPagoId } from "../utils/pagos.js";
import cache from "../utils/cache.js";

const router = express.Router();

// ============================================================
// FUNCIÓN PARA SINCRONIZAR PAGOS (CON PRESERVACIÓN DE DESCUENTOS)
// ============================================================
export async function sincronizarPagosDesdeInscripciones() {
    const inscripciones = await Inscripcion.find({
        estatus: { $ne: "Baja" },
        montoMensualidad: { $gt: 0 },
    }).lean();

    if (!inscripciones.length) {
        console.log('⚠️ No hay inscripciones activas para sincronizar');
        return;
    }

    console.log(`📊 Sincronizando pagos para ${inscripciones.length} inscripciones...`);

    const grupos = await Grupo.find().lean();
    const gruposMap = new Map();
    for (const g of grupos) {
        const id = String(g.IdGrupo || g.idGrupo || "").trim();
        if (id) gruposMap.set(id.toUpperCase(), g);
    }

    let actualizados = 0;
    let preservados = 0;

    for (const ins of inscripciones) {
        const idAlumno = String(ins.idAlumno || "").trim();
        const grupoId = String(ins.grupoId || ins.GrupoId || "").trim();
        if (!idAlumno || !grupoId) continue;

        const fechaInicio = ins.fechaInicioPago || ins.fechaInscripcion || new Date();
        fechaInicio.setHours(12, 0, 0, 0);
        const mesStr = `${fechaInicio.getFullYear()}-${String(fechaInicio.getMonth() + 1).padStart(2, "0")}`;
        const pagoId = crearPagoId(idAlumno, grupoId, mesStr);

        const grupo = gruposMap.get(grupoId.toUpperCase());

        // ✅ Verificar si el pago ya existe
        const pagoExistente = await Pago.findOne({ pagoId }).lean();

        if (pagoExistente) {
            // ✅ SI EL PAGO YA EXISTE, NO MODIFICAR SU MONTO (preservar descuentos manuales)
            preservados++;
            // Solo actualizar los campos que no sean montoPago
            await Pago.updateOne(
                { pagoId },
                {
                    $set: {
                        pagoId,
                        idAlumno,
                        nombreAlumno: ins.nombreAlumno || idAlumno,
                        grupoId,
                        nombreCurso: grupo?.nombreCurso || "Curso",
                        diaPago: Number(ins.diaPago) || 1,
                        fechaInicioPago: fechaInicio,
                        activo: true,
                        fechaBaja: null,
                        estatus: pagoExistente.estatus || "Pendiente", // Mantener estatus existente
                        // ✅ NO ACTUALIZAR montoPago ni descuentoAplicado
                    },
                }
            );
        } else {
            // ✅ Pago nuevo: usar monto de la inscripción
            const montoBase = Number(ins.montoMensualidad);
            await Pago.updateOne(
                { pagoId },
                {
                    $set: {
                        pagoId,
                        idAlumno,
                        nombreAlumno: ins.nombreAlumno || idAlumno,
                        grupoId,
                        nombreCurso: grupo?.nombreCurso || "Curso",
                        diaPago: Number(ins.diaPago) || 1,
                        montoPago: montoBase,
                        fechaInicioPago: fechaInicio,
                        activo: true,
                        fechaBaja: null,
                        estatus: "Pendiente",
                        descuentoAplicado: 0,
                    },
                },
                { upsert: true }
            );
            actualizados++;
        }
    }

    console.log(`✅ Sincronización completada. Nuevos: ${actualizados}, Preservados (sin modificar): ${preservados}`);
}
// ============================================================
// GET /lista-completa – CON FILTRO DE MES Y CACHÉ
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

        const cacheKey = `pagos-${mes}-${anio}-${vista}-${busqueda}-${page}-${limit}-${criterioFechaPagados}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`✅ Sirviendo desde caché: ${cacheKey}`);
            return res.json(cachedData);
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // 🔥 1. Sincronizar pagos (con preservación de descuentos)
        await sincronizarPagosDesdeInscripciones();

        // 🔥 2. Limpiar caché después de sincronizar (para que la consulta use datos frescos)
        cache.flushAll();

        // Filtro base: solo pagos activos Y con formato de mes (terminan en -YYYY-MM)
        const matchBase = {
            activo: true,
            pagoId: { $regex: /-\d{4}-\d{2}$/ }
        };

        if (busqueda) {
            matchBase.nombreAlumno = { $regex: busqueda, $options: 'i' };
        }

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
        hoy.setHours(12, 0, 0, 0);
        const mesActual = mes ? parseInt(mes) : hoy.getMonth() + 1;
        const anioActual = anio ? parseInt(anio) : hoy.getFullYear();
        const totalMesesHoy = anioActual * 12 + mesActual;

        const resultadoCompleto = [];

        for (const [key, alum] of alumnosMap) {
            const pagosOrdenados = alum.pagos.sort((a, b) => new Date(a.fechaInicioPago) - new Date(b.fechaInicioPago));

            const periodosMensuales = pagosOrdenados.map((pago) => {
                const fechaVencimiento = new Date(pago.fechaInicioPago);
                fechaVencimiento.setHours(12, 0, 0, 0);
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

            // ... resto del código sin cambios (filtros, paginación, etc.)
            // (Mantén el resto de la lógica de filtrado y paginación igual a como estaba)
            const tienePendientesPasados = periodosMensuales.some((m) => {
                const v = new Date(m.vencimiento);
                v.setHours(12, 0, 0, 0);
                return (v.getFullYear() * 12 + v.getMonth()) <= totalMesesHoy && m.status !== "Pagado";
            });
            const tieneProximosFuturos = periodosMensuales.some((m) => {
                const v = new Date(m.vencimiento);
                v.setHours(12, 0, 0, 0);
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
                v.setHours(12, 0, 0, 0);
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
                    v.setHours(12, 0, 0, 0);
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
                    v.setHours(12, 0, 0, 0);
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

        cache.set(cacheKey, responseData);
        console.log(`✅ Datos guardados en caché: ${cacheKey}`);

        res.json(responseData);

    } catch (error) {
        console.error("❌ Error en /lista-completa:", error);
        res.status(500).json({ error: "Error al obtener pagos" });
    }
});

// ... resto de rutas (actualizar-dia, etc.)

export default router;