// server/scripts/fusionarDuplicados.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log("✅ Conectado a MongoDB");
const db = client.db();

const alumnos = await db.collection("alumnos").find({}).toArray();
const grupos = {};

for (const a of alumnos) {
  const nombreKey = a.nombreAlumno.trim().toLowerCase().replace(/\s+/g, " ");
  if (!grupos[nombreKey]) grupos[nombreKey] = [];
  grupos[nombreKey].push(a);
}

const duplicados = Object.values(grupos).filter(g => g.length > 1);
console.log(`📋 ${duplicados.length} grupos de duplicados encontrados.`);

for (const grupo of duplicados) {
  grupo.sort((a, b) => a.createdAt - b.createdAt);
  const [principal, ...repetidos] = grupo;

  console.log(`🔄 Fusionando ${principal.idAlumno} (principal) con ${repetidos.map(r => r.idAlumno).join(", ")}`);

  await db.collection("inscripciones").updateMany(
    { idAlumno: { $in: repetidos.map(r => r.idAlumno) } },
    { $set: { idAlumno: principal.idAlumno, nombreAlumno: principal.nombreAlumno } }
  );
  await db.collection("pago").updateMany(
    { idAlumno: { $in: repetidos.map(r => r.idAlumno) } },
    { $set: { idAlumno: principal.idAlumno, nombreAlumno: principal.nombreAlumno } }
  );
  await db.collection("abonos").updateMany(
    { idAlumno: { $in: repetidos.map(r => r.idAlumno) } },
    { $set: { idAlumno: principal.idAlumno, nombreAlumno: principal.nombreAlumno } }
  );
  await db.collection("alumnos").deleteMany(
    { _id: { $in: repetidos.map(r => r._id) } }
  );
  console.log(`   ✅ Fusionado en ${principal.idAlumno}`);
}

console.log("✅ Fusión completada.");
await client.close();