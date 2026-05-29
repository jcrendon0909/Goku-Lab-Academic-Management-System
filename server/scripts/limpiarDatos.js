/**
 * Limpia los datos TRANSACCIONALES del sistema para dejarlo listo
 * para cargar la información real del plan académico.
 *
 * CONSERVA: usuarios (cuentas), cursos y profesores (catálogos).
 * BORRA:    grupos, alumnos, inscripciones, pago, reagendaciones, clases-canceladas.
 * REINICIA: los contadores de alumno, grupo y reagendacion (los IDs vuelven a 001).
 *
 * Por seguridad NO borra nada a menos que pases --confirm.
 *
 * Uso:
 *   1) Vista previa (no borra):   node server/scripts/limpiarDatos.js
 *   2) Ejecutar de verdad:        node server/scripts/limpiarDatos.js --confirm
 *
 * IMPORTANTE: haz un respaldo antes (mongodump) por si necesitas revertir.
 */
import "dotenv/config";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";

import Grupo from "../models/Grupo.js";
import Alumno from "../models/Alumno.js";
import Inscripcion from "../models/Inscripcion.js";
import Pago from "../models/Pago.js";
import Reagendacion from "../models/Reagendacion.js";
import ClaseCancelada from "../models/ClaseCancelada.js";
import Counter from "../models/Counter.js";

dotenv.config({ path: "./server/.env" });

// Colecciones que se vacían (en orden de hijos → padres)
const MODELOS_A_BORRAR = [
  { nombre: "reagendaciones", modelo: Reagendacion },
  { nombre: "clases-canceladas", modelo: ClaseCancelada },
  { nombre: "pago", modelo: Pago },
  { nombre: "inscripciones", modelo: Inscripcion },
  { nombre: "grupos", modelo: Grupo },
  { nombre: "alumnos", modelo: Alumno },
];

// Contadores que se reinician (se conservan curso y profesor)
const COUNTERS_A_REINICIAR = ["alumno", "grupo", "reagendacion"];

async function main() {
  const confirmar = process.argv.includes("--confirm");

  await connectDB();

  console.log("\n=== Estado actual de las colecciones ===");
  for (const { nombre, modelo } of MODELOS_A_BORRAR) {
    const total = await modelo.countDocuments();
    console.log(`  ${nombre.padEnd(20)} ${total} documentos`);
  }

  if (!confirmar) {
    console.log(
      "\n[VISTA PREVIA] No se borró nada.\n" +
        "Para ejecutar de verdad vuelve a correr con --confirm:\n" +
        "  node server/scripts/limpiarDatos.js --confirm\n" +
        "(Recuerda hacer un respaldo con mongodump antes.)\n"
    );
    await mongoose.connection.close();
    process.exit(0);
  }

  console.log("\n=== Borrando datos transaccionales ===");
  for (const { nombre, modelo } of MODELOS_A_BORRAR) {
    const { deletedCount } = await modelo.deleteMany({});
    console.log(`  ${nombre.padEnd(20)} ${deletedCount} eliminados`);
  }

  console.log("\n=== Reiniciando contadores de IDs ===");
  for (const nombre of COUNTERS_A_REINICIAR) {
    await Counter.findOneAndUpdate(
      { nombre },
      { $set: { secuencia: 0 } },
      { upsert: true }
    );
    console.log(`  ${nombre.padEnd(20)} → secuencia 0`);
  }

  console.log(
    "\nListo. Se conservaron usuarios, cursos y profesores.\n" +
      "Ya puedes registrar la información real desde la app.\n"
  );

  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Error durante la limpieza:", err.message);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
