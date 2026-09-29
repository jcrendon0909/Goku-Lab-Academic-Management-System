import mongoose from 'mongoose';

/**
 * SesionClase
 * -----------
 * Representa UNA clase que ocurre (o debería ocurrir) en UNA fecha y hora concretas.
 * Es la unidad atómica del sistema de asistencias:
 *   - Aquí vive el estado de la clase (dada / cancelada / no_asistio / programada)
 *   - Aquí vive la asistencia del profesor (idProfesorReal vs idProfesorTitular)
 *   - Aquí se cuelgan las asistencias de los alumnos (Asistencia.idSesion)
 *   - Aquí se cuelgan las reagendaciones (Reagendacion.idSesionOrigen / idSesionDestino)
 */
const sesionClaseSchema = new mongoose.Schema(
  {
    // ===== Identificación de la clase =====
    idGrupo: { type: String, required: true, index: true },
    fecha: { type: Date, required: true, index: true },   // normalizada a 00:00 UTC
    horaInicio: { type: String, default: '' },            // "16:00"
    horaFin: { type: String, default: '' },               // "17:30"
    duracionClase: { type: String, default: '1:30 hr' },

    // ===== Profesor (titular y real) =====
    idProfesorTitular: { type: String, default: '', index: true },
    nombreProfesorTitular: { type: String, default: '' },
    idProfesorReal: { type: String, default: '', index: true },
    nombreProfesorReal: { type: String, default: '' },
    esSustitucion: { type: Boolean, default: false },
    motivoSustitucion: { type: String, default: '' },

    // ===== Estado de la clase =====
    estado: {
      type: String,
      enum: ['programada', 'dada', 'cancelada', 'no_asistio'],
      default: 'programada',
      index: true,
    },
    motivo: { type: String, default: '' },                // razón de cancelación / no asistencia
    canceladoPor: {
      type: String,
      enum: ['', 'alumno', 'profesor', 'institucional'],
      default: '',
    },

    // ===== Reagendación =====
    esReagendacion: { type: Boolean, default: false, index: true },
    idReagendacion: { type: String, default: '' },

    // ===== Contadores denormalizados (para reportes rápidos) =====
    totalAlumnos: { type: Number, default: 0 },
    totalPresentes: { type: Number, default: 0 },
    totalAusentes: { type: Number, default: 0 },
    totalReagendados: { type: Number, default: 0 },

    // ===== Auditoría =====
    observaciones: { type: String, default: '' },
    registradoPor: { type: String, default: '' },         // id del usuario que cerró la lista
    cerrada: { type: Boolean, default: false },           // true cuando el admin la dio por cerrada
  },
  {
    timestamps: true,
    collection: 'sesiones_clase',
    versionKey: false,
  }
);

// ===== Índices =====
// Una sesión por (grupo, fecha, hora) — evita duplicados
sesionClaseSchema.index({ idGrupo: 1, fecha: 1, horaInicio: 1 }, { unique: true });
// Búsquedas por profesor (para calendario y horas)
sesionClaseSchema.index({ idProfesorReal: 1, fecha: 1 });
sesionClaseSchema.index({ idProfesorTitular: 1, fecha: 1 });
// Búsquedas por estado y fecha (para reportes globales)
sesionClaseSchema.index({ fecha: 1, estado: 1 });

export default mongoose.model('SesionClase', sesionClaseSchema);