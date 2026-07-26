// server/scripts/diagnosticoGrupos.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();

const grupos = await db.collection("grupos").find({}).toArray();
const inscripciones = await db.collection("inscripciones").find({ estatus: "Activa" }).toArray();

console.log("📊 DIAGNÓSTICO DE GRUPOS Y ALUMNOS\n");

for (const g of grupos) {
  const id = g.IdGrupo || g.idGrupo;
  const alumnos = inscripciones.filter(ins => ins.grupoId === id);
  console.log(`Grupo: ${id} | Curso: ${g.nombreCurso} | Profesor: ${g.nombreProfesor} | Horario: ${g.diaClase} ${g.horaClase} | Capacidad: ${g.CapacidadMaxima || 20} | Alumnos: ${alumnos.length}`);
  if (alumnos.length > 0) {
    console.log("   Alumnos:", alumnos.map(a => a.nombreAlumno).join(", "));
  }
}

await client.close();