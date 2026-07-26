// server/scripts/limpiarCursos.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log("✅ Conectado a MongoDB");
const db = client.db();

// ===== 1. Obtener todos los cursos =====
const cursos = await db.collection("cursos").find({}).toArray();
console.log(`📚 Cursos encontrados: ${cursos.length}`);

// ===== 2. Agrupar por nombre normalizado =====
const grupos = {};
for (const curso of cursos) {
  const nombreKey = curso.nombreCurso.trim().toLowerCase().replace(/\s+/g, " ");
  if (!grupos[nombreKey]) grupos[nombreKey] = [];
  grupos[nombreKey].push(curso);
}

// ===== 3. Procesar cada grupo =====
let totalEliminados = 0;
for (const [nombre, lista] of Object.entries(grupos)) {
  if (lista.length <= 1) continue; // No hay duplicados

  // Ordenar por fecha de creación (el más antiguo primero)
  lista.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const [principal, ...duplicados] = lista;

  console.log(`\n🔄 Procesando "${nombre}" (${lista.length} cursos)`);
  console.log(`   Principal: ${principal.idCurso} (creado: ${principal.createdAt})`);
  console.log(`   Duplicados: ${duplicados.map(d => d.idCurso).join(", ")}`);

  // 3.1 Actualizar grupos que usen cursos duplicados
  for (const dup of duplicados) {
    const result = await db.collection("grupos").updateMany(
      { idCurso: dup.idCurso },
      { $set: { idCurso: principal.idCurso } }
    );
    console.log(`   ✅ Grupos actualizados de ${dup.idCurso} a ${principal.idCurso}: ${result.modifiedCount}`);
  }

  // 3.2 Eliminar cursos duplicados
  const idsDuplicados = duplicados.map(d => d.idCurso);
  const deleteResult = await db.collection("cursos").deleteMany(
    { idCurso: { $in: idsDuplicados } }
  );
  totalEliminados += deleteResult.deletedCount;
  console.log(`   🗑️ Cursos eliminados: ${deleteResult.deletedCount}`);
}

// ===== 4. Verificar que todos los grupos tengan un curso válido =====
const gruposSinCurso = await db.collection("grupos").find({
  $or: [
    { idCurso: { $exists: false } },
    { idCurso: "" },
    { idCurso: null }
  ]
}).toArray();

if (gruposSinCurso.length > 0) {
  console.log(`\n⚠️ Grupos sin curso válido: ${gruposSinCurso.length}`);
  // Asignar un curso por defecto (el primer curso activo que encuentre)
  const cursoDefault = await db.collection("cursos").findOne({ estatus: "Activo" });
  if (cursoDefault) {
    for (const grupo of gruposSinCurso) {
      await db.collection("grupos").updateOne(
        { _id: grupo._id },
        { $set: { idCurso: cursoDefault.idCurso } }
      );
    }
    console.log(`✅ Asignado curso ${cursoDefault.idCurso} a ${gruposSinCurso.length} grupos.`);
  } else {
    console.warn("⚠️ No hay cursos activos para asignar. Crea al menos un curso activo.");
  }
} else {
  console.log("\n✅ Todos los grupos tienen un curso válido.");
}

console.log(`\n✅ Limpieza completada. Total cursos eliminados: ${totalEliminados}`);
await client.close();
console.log("🔌 Desconectado.");