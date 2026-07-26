// server/scripts/corregirNombres.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const CSV_PATH = path.join(__dirname, "correcciones_alumnos.csv");

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log("✅ Conectado a MongoDB");

const db = client.db();

// Leer CSV
if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ No se encontró el archivo ${CSV_PATH}`);
  process.exit(1);
}

const lines = fs.readFileSync(CSV_PATH, "utf8").split("\n").filter(line => line.trim());
if (lines.length < 2) {
  console.error("❌ El archivo CSV debe tener al menos una fila de datos.");
  process.exit(1);
}

const header = lines[0].split(",").map(h => h.trim());
const idIdx = header.indexOf("idAlumno");
const nombreIdx = header.indexOf("nuevoNombre");
if (idIdx === -1 || nombreIdx === -1) {
  console.error("❌ El CSV debe tener columnas 'idAlumno' y 'nuevoNombre'");
  process.exit(1);
}

const correcciones = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(",").map(p => p.trim());
  if (parts.length <= Math.max(idIdx, nombreIdx)) continue;
  const idAlumno = parts[idIdx];
  const nuevoNombre = parts[nombreIdx];
  if (idAlumno && nuevoNombre) {
    correcciones.push({ idAlumno, nuevoNombre });
  }
}

console.log(`📋 ${correcciones.length} correcciones encontradas.`);

if (correcciones.length === 0) {
  console.log("ℹ️ No hay correcciones para aplicar.");
  process.exit(0);
}

// Actualizar cada alumno
for (const { idAlumno, nuevoNombre } of correcciones) {
  console.log(`🔄 Actualizando ${idAlumno} -> ${nuevoNombre}`);

  // 1. Actualizar en alumnos
  const result = await db.collection("alumnos").updateOne(
    { idAlumno },
    { $set: { nombreAlumno: nuevoNombre } }
  );
  if (result.matchedCount === 0) {
    console.warn(`⚠️ Alumno ${idAlumno} no encontrado en 'alumnos'. Verifica el ID.`);
    continue;
  }

  // 2. Actualizar en inscripciones
  const insResult = await db.collection("inscripciones").updateMany(
    { idAlumno },
    { $set: { nombreAlumno: nuevoNombre } }
  );
  console.log(`   📝 Inscripciones actualizadas: ${insResult.modifiedCount}`);

  // 3. Actualizar en pagos
  const pagoResult = await db.collection("pago").updateMany(
    { idAlumno },
    { $set: { nombreAlumno: nuevoNombre } }
  );
  console.log(`   💰 Pagos actualizados: ${pagoResult.modifiedCount}`);

  // 4. Actualizar en abonos
  const abonoResult = await db.collection("abonos").updateMany(
    { idAlumno },
    { $set: { nombreAlumno: nuevoNombre } }
  );
  console.log(`   🧾 Abonos actualizados: ${abonoResult.modifiedCount}`);
}

console.log("✅ Correcciones aplicadas.");
await client.close();
console.log("🔌 Desconectado.");