import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Obtener directorio actual (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde la raíz
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Importar modelos con rutas correctas
import Inscripcion from "../server/models/Inscripcion.js";
import Pago from "../server/models/Pago.js";
import { generarPagosHistoricos } from "../server/utils/pagosHelper.js";

const generar = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Conectado a MongoDB");

        const inscripcion = await Inscripcion.findOne({ idAlumno: "ALU176" });
        if (!inscripcion) {
            console.log("❌ Inscripción no encontrada para ALU176");
            process.exit(1);
        }

        // Eliminar pagos existentes de ese alumno
        await Pago.deleteMany({ idAlumno: "ALU176" });
        console.log("🧹 Pagos anteriores eliminados");

        // Generar pagos históricos (false = quedan como Pendientes)
        const pagos = await generarPagosHistoricos(inscripcion, false);
        console.log(`✅ ${pagos.length} pagos generados`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

generar();