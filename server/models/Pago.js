import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema(
    {
        pagoId: { type: String, required: true, unique: true, index: true },
        idAlumno: { type: String, default: "", index: true },
        grupoId: { type: String, default: "", index: true },
        nombreAlumno: { type: String, required: true },
        nombreCurso: { type: String, required: true },
        diaPago: { 
            type: Number, 
            required: true,
            min: 1,
            max: 31,
            description: "Día del mes en que vence el pago"
        },
        montoPago: { type: Number, required: true },
        fechaInicioPago: { 
            type: Date,
            description: "Primer mes desde el cual aplica el pago"
        },
        activo: { type: Boolean, default: true, index: true },
        fechaBaja: { type: Date, default: null },

        // ===== NUEVOS CAMPOS =====
        mesCorrespondiente: {
            type: String,
            enum: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
            description: "Mes al que corresponde el pago (para reportes)"
        },
        periodo: {
            type: String,
            enum: ["Semana", "Quincena", "Mes"],
            default: "Mes",
            description: "Periodo de pago"
        },
        anio: {
            type: Number,
            description: "Año del pago (para filtros)"
        }
    },
    {
        collection: 'pago',
        versionKey: false,
        timestamps: true,
    }
);

// 👇 MIDDLEWARE: se ejecuta antes de guardar
pagoSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('fechaInicioPago')) {
        const fecha = this.fechaInicioPago || new Date();
        const mes = fecha.toLocaleString('es', { month: 'short' });
        this.mesCorrespondiente = mes.charAt(0).toUpperCase() + mes.slice(1);
        this.anio = fecha.getFullYear();
        if (!this.periodo) this.periodo = "Mes";
    }
    next();
});

export default mongoose.model('Pago', pagoSchema, 'pago');