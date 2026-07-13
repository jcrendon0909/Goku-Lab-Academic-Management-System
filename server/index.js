import mongoose from "mongoose";
import { connectDB } from "../server/db.js";
import Pago from "../server/models/Pago.js";
import Alumno from "../server/models/Alumno.js";

const run = async () => {
  await connectDB();

  // 1. Actualizar todos los pagos: asignar anio, mesCorrespondiente y periodo
  const pagos = await Pago.find({});
  console.log(`📊 Procesando ${pagos.length} pagos...`);
  for (const pago of pagos) {
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
          periodo: "Mes"
        }
      }
    );
  }
  console.log(`✅ ${pagos.length} pagos actualizados`);

  // 2. Actualizar alumnos: asignar origen y situacion_percibida si están vacíos
  const alumnos = await Alumno.updateMany(
    { origen: { $exists: false } },
    { $set: { origen: "Naucalpan" } }
  );
  console.log(`✅ Alumnos actualizados con origen: ${alumnos.modifiedCount}`);

  const alumnos2 = await Alumno.updateMany(
    { situacion_percibida: { $exists: false } },
    { $set: { situacion_percibida: "Estable" } }
  );
  console.log(`✅ Alumnos actualizados con situacion_percibida: ${alumnos2.modifiedCount}`);

  process.exit(0);
};

run().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});