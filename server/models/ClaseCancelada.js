import mongoose from "mongoose";

const claseCanceladaSchema = new mongoose.Schema(
  {
    claseCanceladaId: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },

    // Qué grupo y qué fecha se cancela
    idGrupo: { 
      type: String, 
      required: true, 
      index: true 
    },
    
    // Fecha de la clase que se cancela (YYYY-MM-DD)
    fecha: { 
      type: Date, 
      required: true, 
      index: true 
    },

    // Información sobre la cancelación
    motivo: { 
      type: String, 
      default: "Clase cancelada" 
    },

    // Quién canceló la clase
    canceladoPor: { 
      type: String, 
      default: "" 
    },

    // Nota/comentario adicional
    nota: { 
      type: String, 
      default: "" 
    },

    // Estado de la cancelación
    estatus: { 
      type: String, 
      enum: ["activa", "revertida"], 
      default: "activa",
      index: true
    },

  },
  {
    timestamps: true,
    collection: "clases_canceladas",
    versionKey: false
  }
);

// ✅ Índices para búsquedas rápidas
// Encontrar todas las cancelaciones de un grupo
claseCanceladaSchema.index({ idGrupo: 1, estatus: 1 });

// Encontrar cancelaciones en un rango de fechas
claseCanceladaSchema.index({ idGrupo: 1, fecha: 1 });

// Encontrar si una clase específica está cancelada
claseCanceladaSchema.index({ idGrupo: 1, fecha: 1, estatus: 1 });

export default mongoose.model("ClaseCancelada", claseCanceladaSchema);
