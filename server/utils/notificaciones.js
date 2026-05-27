/**
 * Servicio de Notificaciones para Profesores
 * 
 * Maneja el envío de notificaciones cuando ocurren eventos importantes:
 * - Reagendación de clases de alumnos
 * - Cancelación de clases individuales
 * - Cambios en grupos
 */

import Reagendacion from "../models/Reagendacion.js";
import ClaseCancelada from "../models/ClaseCancelada.js";
import Profesor from "../models/Profesor.js";

/**
 * Notificar al profesor sobre una reagendación
 * Actualiza el documento y marca como notificado
 */
export async function notificarReagendacionProfesor(reagendacionId, idProfesor) {
  try {
    if (!reagendacionId || !idProfesor) {
      console.warn("notificarReagendacionProfesor: faltan parámetros", {
        reagendacionId,
        idProfesor,
      });
      return false;
    }

    const reagendacion = await Reagendacion.findOne({
      ReagendacionId: String(reagendacionId).trim(),
    });

    if (!reagendacion) {
      console.warn(`Reagendación no encontrada: ${reagendacionId}`);
      return false;
    }

    // ✅ Marcar como notificado
    reagendacion.notificacionProfesor = {
      enviada: true,
      fechaEnvio: new Date(),
      idProfesor: String(idProfesor).trim(),
    };

    await reagendacion.save();

    // En un sistema real aquí iría:
    // - Enviar email al profesor
    // - Enviar notificación push
    // - Registrar en log de auditoría
    // - Enviar a cola de mensajes

    console.log(`✅ Notificación de reagendación marcada para profesor ${idProfesor}`);

    return true;
  } catch (error) {
    console.error("ERROR notificarReagendacionProfesor:", error);
    return false;
  }
}

/**
 * Notificar al profesor sobre cancelación de clase
 */
export async function notificarCancelacionProfesor(
  claseCanceladaId,
  idProfesor
) {
  try {
    if (!claseCanceladaId || !idProfesor) {
      console.warn("notificarCancelacionProfesor: faltan parámetros", {
        claseCanceladaId,
        idProfesor,
      });
      return false;
    }

    const cancelacion = await ClaseCancelada.findOne({
      claseCanceladaId: String(claseCanceladaId).trim(),
    });

    if (!cancelacion) {
      console.warn(`Cancelación no encontrada: ${claseCanceladaId}`);
      return false;
    }

    // Aquí iría el envío real de notificación
    // Por ahora solo lo registramos
    console.log(
      `✅ Notificación de cancelación enviada a profesor ${idProfesor} para clase del ${cancelacion.fecha.toISOString()}`
    );

    return true;
  } catch (error) {
    console.error("ERROR notificarCancelacionProfesor:", error);
    return false;
  }
}

/**
 * Obtener todas las notificaciones pendientes de un profesor
 */
export async function obtenerNotificacionesPendientes(idProfesor) {
  try {
    // Reagendaciones no notificadas para este profesor
    const reagendacionesPendientes = await Reagendacion.find({
      $or: [
        { idProfesorOriginal: idProfesor },
        { idProfesorNuevo: idProfesor },
      ],
      "notificacionProfesor.enviada": false,
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      reagendaciones: reagendacionesPendientes || [],
      total: reagendacionesPendientes?.length || 0,
    };
  } catch (error) {
    console.error("ERROR obtenerNotificacionesPendientes:", error);
    return {
      reagendaciones: [],
      total: 0,
    };
  }
}

/**
 * Marcar notificación como leída por el profesor
 */
export async function marcarNotificacionComoLeida(reagendacionId) {
  try {
    await Reagendacion.updateOne(
      { ReagendacionId: String(reagendacionId).trim() },
      {
        $set: {
          "notificacionProfesor.leida": true,
          "notificacionProfesor.fechaLectura": new Date(),
        },
      }
    );

    return true;
  } catch (error) {
    console.error("ERROR marcarNotificacionComoLeida:", error);
    return false;
  }
}
