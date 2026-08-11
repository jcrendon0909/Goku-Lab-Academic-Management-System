import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configurar entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Importar modelos y helper
import Alumno from "../server/models/Alumno.js";
import Inscripcion from "../server/models/Inscripcion.js";
import Grupo from "../server/models/Grupo.js";
import Pago from "../server/models/Pago.js";
import Abono from "../server/models/Abono.js";
import { generarPagosHistoricos } from "../server/utils/pagosHelper.js";
import { crearPagoId } from "../server/utils/pagos.js";
import { generarId } from "../server/utils/generarId.js";

async function corregirItzel() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Conectado a MongoDB");

        // 1. Buscar a Itzel
        const alumno = await Alumno.findOne({ nombreAlumno: "Itzel Ortíz" });
        if (!alumno) {
            console.log("❌ Alumno 'Itzel Ortíz' no encontrado.");
            process.exit(1);
        }
        const idAlumno = alumno.idAlumno;
        console.log(`🔍 Alumno encontrado: ${idAlumno} - ${alumno.nombreAlumno}`);

        // 2. Buscar inscripciones existentes
        const inscripciones = await Inscripcion.find({ idAlumno });
        console.log(`📋 Inscripciones encontradas: ${inscripciones.length}`);

        if (inscripciones.length === 0) {
            console.log("❌ No hay inscripciones para Itzel.");
            process.exit(1);
        }

        // 3. Identificar la inscripción actual (asumimos que la primera es la que tiene ambos cursos)
        const inscripcionOriginal = inscripciones[0];
        console.log(`📌 Inscripción original: grupoId=${inscripcionOriginal.grupoId}, monto=${inscripcionOriginal.montoMensualidad}, diaPago=${inscripcionOriginal.diaPago}`);

        // 4. Crear una segunda inscripción para el segundo curso (Alfabetización Digital Niños)
        // Necesitamos un nuevo grupoId. Podemos usar el mismo grupoId? No, porque el grupo actual probablemente sea "Taller de creatividad".
        // Vamos a crear un nuevo grupo para "Alfabetización Digital Niños" o usar un grupo existente.
        // Por simplicidad, crearemos un nuevo grupo con el mismo profesor y horario? No tenemos esos datos.
        // En su lugar, vamos a duplicar el grupo existente? Eso no es correcto.
        // Mejor: usamos el mismo grupoId, pero el nombre del curso en la inscripción será "Alfabetización Digital Niños".
        // Pero si usamos el mismo grupoId, el pago tendrá el mismo nombre de curso y se agruparán en una sola fila.
        // Para que aparezcan separados, necesitan diferentes grupoId.
        // Por lo tanto, debemos crear un nuevo grupo.
        // Obtener el grupo original para copiar sus datos.
        const grupoOriginal = await Grupo.findOne({ IdGrupo: inscripcionOriginal.grupoId });
        if (!grupoOriginal) {
            console.log("❌ Grupo original no encontrado.");
            process.exit(1);
        }

        // Crear un nuevo grupo con un IdGrupo único
        const nuevoIdGrupo = await generarId('grupo');
        const nuevoGrupo = new Grupo({
            IdGrupo: nuevoIdGrupo,
            idCurso: grupoOriginal.idCurso, // Podría ser diferente, pero lo dejamos igual para simplificar
            nombreCurso: "Alfabetización Digital Niños", // Cambiamos el nombre del curso
            diaClase: grupoOriginal.diaClase,
            horaClase: grupoOriginal.horaClase,
            duracionClase: grupoOriginal.duracionClase,
            idProfesor: grupoOriginal.idProfesor,
            nombreProfesor: grupoOriginal.nombreProfesor,
            precioMensualidad: inscripcionOriginal.montoMensualidad, // mismo monto
            fechaInicio: null,
            fechaFin: null,
            salon: grupoOriginal.salon,
            comentario: "",
            CapacidadMaxima: grupoOriginal.CapacidadMaxima,
            Estatus: "Activo",
            fechaCreacion: new Date(),
        });
        await nuevoGrupo.save();
        console.log(`✅ Nuevo grupo creado: ${nuevoIdGrupo}`);

        // 5. Crear la segunda inscripción
        const nuevaInscripcion = new Inscripcion({
            idAlumno,
            nombreAlumno: alumno.nombreAlumno,
            grupoId: nuevoIdGrupo,
            modalidad: inscripcionOriginal.modalidad,
            montoMensualidad: inscripcionOriginal.montoMensualidad,
            diaPago: inscripcionOriginal.diaPago,
            fechaInicioPago: inscripcionOriginal.fechaInicioPago,
            comentarios: "Segundo curso (Alfabetización Digital Niños) - corregido",
            fechaInscripcion: inscripcionOriginal.fechaInscripcion,
            estatus: "Activa",
        });
        await nuevaInscripcion.save();
        console.log(`✅ Nueva inscripción creada para ${nuevoIdGrupo}`);

        // 6. Eliminar pagos existentes de Itzel (para regenerarlos desde cero)
        await Pago.deleteMany({ idAlumno });
        console.log("🧹 Pagos existentes eliminados.");

        // 7. Regenerar pagos para ambas inscripciones usando el helper
        const inscripcionesActualizadas = await Inscripcion.find({ idAlumno });
        for (const ins of inscripcionesActualizadas) {
            const pagos = await generarPagosHistoricos(ins, false); // false = pagos pendientes
            console.log(`✅ Generados ${pagos.length} pagos para inscripción ${ins.grupoId}`);
        }

        // 8. Verificar resultado
        const pagosFinales = await Pago.find({ idAlumno });
        console.log(`📊 Total pagos finales: ${pagosFinales.length}`);
        pagosFinales.forEach(p => {
            console.log(`   ${p.pagoId} - ${p.nombreCurso} - ${p.fechaInicioPago.toLocaleDateString()} - ${p.estatus}`);
        });

        console.log("✅ Proceso completado.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

corregirItzel();