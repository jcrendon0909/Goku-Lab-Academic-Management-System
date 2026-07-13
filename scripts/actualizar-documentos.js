// scripts/actualizar-documentos.js
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta absoluta a la raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = resolve(__dirname, '..');

// Cargar .env desde la raíz (SIN fallar si no existe)
config({ path: resolve(rootPath, '.env') });

// Verificar si se cargó
console.log('🔍 MONGODB_URI:', process.env.MONGODB_URI ? '✅ Cargada' : '❌ No cargada');

import mongoose from "mongoose";
import { connectDB } from "../server/config/db.js";
import Alumno from "../server/models/Alumno.js";
import Pago from "../server/models/Pago.js";

const run = async () => {
  try {
    console.log("🔄 Conectando a MongoDB...");
    await connectDB();
    console.log("✅ Conectado correctamente");

    console.log("🔄 Actualizando documentos existentes...");

    // 1. Actualizar alumnos
    const alumnosOrigen = await Alumno.updateMany(
      { origen: { $exists: false } },
      { $set: { origen: "Naucalpan" } }
    );
    console.log(`✅ Alumnos con origen: ${alumnosOrigen.modifiedCount}`);

    const alumnosSituacion = await Alumno.updateMany(
      { situacion_percibida: { $exists: false } },
      { $set: { situacion_percibida: "Estable" } }
    );
    console.log(`✅ Alumnos con situacion: ${alumnosSituacion.modifiedCount}`);

    // 2. Actualizar pagos
    const pagos = await Pago.find({});
    let actualizados = 0;
    let errores = 0;

    for (const pago of pagos) {
      try {
        const fecha = pago.fechaInicioPago || pago.createdAt || new Date();
        const mes = fecha.toLocaleString("es", { month: "short" });
        const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
        const anio = fecha.getFullYear();

        await Pago.updateOne(
          { _id: pago._id },
          {
            $set: {
              mesCorrespondiente: mesCapitalizado,
              anio: anio,
              periodo: pago.periodo || "Mes"
            }
          }
        );
        actualizados++;
      } catch (error) {
        errores++;
        console.error(`❌ Error en pago ${pago.pagoId}:`, error.message);
      }
    }
    console.log(`✅ Pagos actualizados: ${actualizados}`);
    if (errores > 0) console.warn(`⚠️ ${errores} errores`);

    console.log("🎉 Migración completada");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

run();