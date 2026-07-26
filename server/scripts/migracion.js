// server/scripts/migracion.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Alumno from "../models/Alumno.js";
import Curso from "../models/Curso.js";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";
import Abono from "../models/Abono.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    // ===== 1. Alumnos =====
    await Alumno.updateMany(
      { email: { $exists: false } },
      { $set: { email: "", fechaNacimiento: null, descuento: 0, notasInternas: "" } }
    );
    console.log("✅ Alumnos actualizados");

    // ===== 2. Cursos =====
    await Curso.updateMany(
      { precioMensualidad: { $exists: false } },
      { $set: { precioMensualidad: 0, duracionMeses: 1, nivel: "Básico", categoria: "" } }
    );
    console.log("✅ Cursos actualizados");

    // ===== 3. Grupos =====
    await Grupo.updateMany(
      { precioMensualidad: { $exists: false } },
      { $set: { precioMensualidad: 0, fechaInicio: null, fechaFin: null, salon: "" } }
    );
    console.log("✅ Grupos actualizados");

    // ===== 4. Inscripciones =====
    await Inscripcion.updateMany(
      { metodoPagoPreferido: { $exists: false } },
      { $set: { metodoPagoPreferido: "", fechaProximoPago: null } }
    );
    console.log("✅ Inscripciones actualizadas");

    // ===== 5. Abonos (migrar idAlumno y grupoId desde pagoId) =====
    const abonos = await Abono.find({});
    let count = 0;
    for (const a of abonos) {
      const pagoId = a.pagoId || '';
      const match = pagoId.match(/(ALU[A-Za-z0-9]+)-GRU([A-Za-z0-9]+)/);
      if (match) {
        const idAlumno = match[1];
        const grupoId = `GRU${match[2]}`;
        await Abono.updateOne(
          { _id: a._id },
          { $set: { idAlumno, grupoId } }
        );
        count++;
      }
    }
    console.log(`✅ Abonos migrados: ${count} documentos actualizados`);

    // ===== 6. Verificar grupos huérfanos en inscripciones =====
    const gruposExistentes = await Grupo.distinct("IdGrupo");
    const inscGrupos = await Inscripcion.distinct("grupoId");
    const huerfanos = inscGrupos.filter(g => !gruposExistentes.includes(g));
    if (huerfanos.length) {
      console.warn("⚠️ Grupos huérfanos en inscripciones:", huerfanos);
      console.warn("   Debes crearlos manualmente o reasignar las inscripciones.");
    } else {
      console.log("✅ Todos los grupos referenciados en inscripciones existen.");
    }

    await mongoose.disconnect();
    console.log("✅ Migración completada");
  } catch (error) {
    console.error("❌ Error en migración:", error);
    process.exit(1);
  }
};

run();