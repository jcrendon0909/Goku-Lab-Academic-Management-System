import Pago from '../models/Pago.js';
import Grupo from '../models/Grupo.js';
import { crearPagoId } from './pagos.js';
import { generarId } from './generarId.js';

export const generarPagosHistoricos = async (inscripcion, marcarComoPagado = true) => {
  try {
    const { 
      idAlumno, 
      grupoId, 
      _id: idInscripcion, 
      fechaInscripcion, 
      diaPago, 
      nombreAlumno, 
      fechaBaja, 
      montoMensualidad 
    } = inscripcion;

    console.log(`🔍 [pagosHelper] Iniciando para ${nombreAlumno || idAlumno}`);
    console.log(`🔍 [pagosHelper] montoMensualidad: ${montoMensualidad}`);

    const grupo = await Grupo.findOne({ IdGrupo: grupoId });
    if (!grupo) throw new Error(`Grupo ${grupoId} no encontrado`);

    console.log(`🔍 [pagosHelper] precioMensualidad del grupo: ${grupo.precioMensualidad}`);

    let precioMensual = 0;
    if (montoMensualidad && montoMensualidad > 0) {
      precioMensual = montoMensualidad;
      console.log(`✅ Usando monto de inscripción: ${precioMensual}`);
    } else if (grupo.precioMensualidad && grupo.precioMensualidad > 0) {
      precioMensual = grupo.precioMensualidad;
      console.log(`ℹ️ Usando precio del grupo: ${precioMensual}`);
    } else {
      console.warn(`⚠️ No se puede generar pagos: sin precio.`);
      return [];
    }

    const nombreCurso = grupo.nombreCurso || 'Curso sin nombre';
    const diaPagoAlumno = diaPago || 5;

    // ✅ Fecha del primer pago: ajustar al último día del mes si es necesario
    let fechaPrimerPago = new Date(fechaInscripcion);
    const ultimoDiaMesInicio = new Date(fechaPrimerPago.getFullYear(), fechaPrimerPago.getMonth() + 1, 0).getDate();
    const diaRealInicio = Math.min(diaPagoAlumno, ultimoDiaMesInicio);
    fechaPrimerPago.setDate(diaRealInicio);
    if (fechaPrimerPago < fechaInscripcion) {
      fechaPrimerPago = new Date(fechaInscripcion);
    }

    const pagoIdInicial = crearPagoId(idAlumno, grupoId);
    const pagoInicial = new Pago({
      pagoId: pagoIdInicial,
      idAlumno,
      grupoId,
      nombreAlumno,
      nombreCurso,
      diaPago: diaPagoAlumno,
      montoPago: precioMensual,
      fechaInicioPago: fechaPrimerPago,
      activo: true,
      estatus: marcarComoPagado ? 'Pagado' : 'Pendiente',
      fechaPago: marcarComoPagado ? fechaPrimerPago : null,
      metodoPago: 'Efectivo',
      notas: 'Pago generado automáticamente (carga histórica)',
    });
    await pagoInicial.save();
    console.log(`✅ Pago inicial creado: ${fechaPrimerPago.toLocaleDateString()} - $${precioMensual} - ID: ${pagoIdInicial}`);

    // ✅ Meses siguientes: ajustar al último día del mes si es necesario
    let fechaInicio = new Date(fechaPrimerPago);
    fechaInicio.setDate(1);
    fechaInicio.setMonth(fechaInicio.getMonth() + 1);
    fechaInicio.setHours(0, 0, 0, 0);

    let fechaLimite = new Date();
    fechaLimite.setDate(1);
    fechaLimite.setMonth(fechaLimite.getMonth() + 1);
    fechaLimite.setDate(0);
    fechaLimite.setHours(23, 59, 59, 999);

    let currentDate = new Date(fechaInicio);
    const pagosCreados = [pagoInicial];

    while (currentDate <= fechaLimite) {
      // ✅ Calcular el día real (último día del mes si el día de pago no existe)
      const ultimoDiaMes = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const diaReal = Math.min(diaPagoAlumno, ultimoDiaMes);
      const fechaVencimiento = new Date(currentDate.getFullYear(), currentDate.getMonth(), diaReal);
      
      const pagoId = await generarId('pago');
      const pago = new Pago({
        pagoId,
        idAlumno,
        grupoId,
        nombreAlumno,
        nombreCurso,
        diaPago: diaPagoAlumno,
        montoPago: precioMensual,
        fechaInicioPago: fechaVencimiento,
        activo: true,
        estatus: marcarComoPagado ? 'Pagado' : 'Pendiente',
        fechaPago: marcarComoPagado ? fechaVencimiento : null,
        metodoPago: 'Efectivo',
        notas: 'Pago generado automáticamente (carga histórica)',
      });

      await pago.save();
      pagosCreados.push(pago);
      console.log(`✅ Pago creado: ${fechaVencimiento.toLocaleDateString()} - $${precioMensual} - ID: ${pagoId}`);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    console.log(`📊 Total pagos generados: ${pagosCreados.length}`);
    return pagosCreados;
  } catch (error) {
    console.error('❌ Error en generarPagosHistoricos:', error);
    throw error;
  }
};