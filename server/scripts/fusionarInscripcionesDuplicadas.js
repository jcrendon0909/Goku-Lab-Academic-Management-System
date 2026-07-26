// server/scripts/fusionarInscripcionesDuplicadas.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log("✅ Conectado a MongoDB");
const db = client.db();

// 1. Obtener todos los grupos (para tener sus datos)
const grupos = await db.collection("grupos").find({}).toArray();
const gruposMap = {};
for (const g of grupos) {
  const id = g.IdGrupo || g.idGrupo;
  if (!id) continue;
  gruposMap[id] = g;
}

// 2. Obtener todas las inscripciones activas
const inscripciones = await db.collection("inscripciones").find({ estatus: "Activa" }).toArray();
console.log(`📋 Inscripciones activas encontradas: ${inscripciones.length}`);

// 3. Agrupar inscripciones por alumno
const inscPorAlumno = {};
for (const ins of inscripciones) {
  const idAlumno = ins.idAlumno;
  if (!inscPorAlumno[idAlumno]) inscPorAlumno[idAlumno] = [];
  inscPorAlumno[idAlumno].push(ins);
}

let totalEliminadas = 0;
let totalMigradas = 0;

// 4. Procesar cada alumno
for (const [idAlumno, listaIns] of Object.entries(inscPorAlumno)) {
  if (listaIns.length <= 1) continue;

  // Agrupar inscripciones por "clave de grupo equivalente" (nombreCurso + diaClase + horaClase + idProfesor)
  // Si no se puede obtener del grupo, usamos los datos de la inscripción (que tienen nombreCurso, etc.)
  const gruposEquivalentes = {};
  for (const ins of listaIns) {
    // Intentar obtener el grupo desde gruposMap
    const grupo = gruposMap[ins.grupoId];
    let key;
    if (grupo) {
      key = `${grupo.nombreCurso || ''}|${grupo.diaClase || ''}|${grupo.horaClase || ''}|${grupo.idProfesor || ''}`;
    } else {
      // Fallback: usar datos de la inscripción (pueden ser menos precisos)
      key = `${ins.nombreCurso || ''}|${ins.diaClase || ''}|${ins.horaClase || ''}|${ins.idProfesor || ''}`;
    }
    if (!gruposEquivalentes[key]) gruposEquivalentes[key] = [];
    gruposEquivalentes[key].push(ins);
  }

  // Para cada grupo equivalente, fusionar las inscripciones (mantener la más antigua)
  for (const [key, insList] of Object.entries(gruposEquivalentes)) {
    if (insList.length <= 1) continue;

    // Ordenar por fechaInscripcion (la más antigua primero)
    insList.sort((a, b) => new Date(a.fechaInscripcion || 0) - new Date(b.fechaInscripcion || 0));
    const [principal, ...repetidas] = insList;

    const principalId = principal._id;
    const repetidasIds = repetidas.map(r => r._id);

    console.log(`\n🔄 Alumno ${idAlumno}: fusionando ${repetidas.length} inscripciones en ${principal._id}`);

    // 1. Migrar pagos: actualizar idAlumno y grupoId al principal (aunque idAlumno es el mismo)
    // Pero los pagos apuntan a un grupoId específico. Si los grupos son equivalentes, podemos migrar los pagos al grupo de la inscripción principal.
    const grupoPrincipal = gruposMap[principal.grupoId];
    if (grupoPrincipal) {
      // Migrar pagos que apuntan a los grupos de las inscripciones repetidas
      for (const rep of repetidas) {
        const resultPagos = await db.collection("pago").updateMany(
          { idAlumno: idAlumno, grupoId: rep.grupoId },
          { $set: { grupoId: principal.grupoId } }
        );
        totalMigradas += resultPagos.modifiedCount;
        // También migrar abonos
        const resultAbonos = await db.collection("abonos").updateMany(
          { idAlumno: idAlumno, grupoId: rep.grupoId },
          { $set: { grupoId: principal.grupoId } }
        );
        totalMigradas += resultAbonos.modifiedCount;
      }
    }

    // 2. Eliminar inscripciones repetidas
    const deleteResult = await db.collection("inscripciones").deleteMany(
      { _id: { $in: repetidasIds } }
    );
    totalEliminadas += deleteResult.deletedCount;
    console.log(`   🗑️ Inscripciones eliminadas: ${deleteResult.deletedCount}`);
  }
}

console.log(`\n✅ Fusión completada.`);
console.log(`   Inscripciones eliminadas: ${totalEliminadas}`);
console.log(`   Pagos/Abonos migrados: ${totalMigradas}`);
await client.close();
console.log("🔌 Desconectado.");