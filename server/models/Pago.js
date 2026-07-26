import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema(
    {
        pagoId: { type: String, required: true, unique: true, index: true },
        idAlumno: { type: String, default: "", index: true },
        grupoId: { type: String, default: "", index: true },
        nombreAlumno: { type: String, required: true },
        nombreCurso: { type: String, required: true },
        diaPago: { type: Number, required: true, min: 1, max: 31 },
        montoPago: { type: Number, required: true },
        fechaInicioPago: { type: Date, default: Date.now },
        activo: { type: Boolean, default: true, index: true },
        fechaBaja: { type: Date, default: null },

        mesCorrespondiente: {
            type: String,
            enum: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
            description: "Mes al que corresponde el pago"
        },
        periodo: {
            type: String,
            default: "Mes",
            description: "Periodo de pago (ej. 2026-01)"
        },
        anio: {
            type: Number,
            description: "Año del pago"
        },

        fechaPago: { type: Date, default: Date.now },
        metodoPago: { type: String, default: 'Efectivo' },
        estatus: { type: String, enum: ['Pagado', 'Pendiente', 'Parcial', 'Cancelado'], default: 'Pagado' },
        notas: { type: String, default: '' },
        facturaRequerida: { type: Boolean, default: false },
        facturaEmitida: { type: Boolean, default: false },
        folioFactura: { type: String, default: '' },
    },
    {
        collection: 'pago',
        versionKey: false,
        timestamps: true,
    }
);

// 👇 MIDDLEWARE pre('save') CORREGIDO
pagoSchema.pre('save', function(next) {
    // Si no es nuevo y no se modifican fechas, saltar
    if (!this.isNew && !this.isModified('fechaInicioPago') && !this.isModified('fechaPago')) {
        return next();
    }

    const fecha = this.fechaInicioPago || this.fechaPago || new Date();
    
    // Asignar mesCorrespondiente y anio
    const mes = fecha.toLocaleString('es', { month: 'short' });
    this.mesCorrespondiente = mes.charAt(0).toUpperCase() + mes.slice(1);
    this.anio = fecha.getFullYear();

    // Asignar periodo en formato YYYY-MM si es "Mes" o no está definido
    if (!this.periodo || this.periodo === "Mes") {
        this.periodo = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2, "0")}`;
    }

    // Asignar diaPago si no existe
    if (!this.diaPago) {
        this.diaPago = fecha.getDate();
    }

    // Asignar fechaPago si no existe
    if (!this.fechaPago) this.fechaPago = new Date();

    next();
});

// Índices
pagoSchema.index({ idAlumno: 1, anio: 1, mesCorrespondiente: 1 });
pagoSchema.index({ grupoId: 1, anio: 1 });

export default mongoose.model('Pago', pagoSchema, 'pago');