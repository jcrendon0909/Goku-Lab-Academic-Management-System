import express from "express";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const gruposRaw = await Grupo.find().lean();
    const inscripcionesRaw = await Inscripcion.find().lean();

    const normalizar = (valor) =>
      String(valor ?? "")
        .trim()
        .toUpperCase();

    // Quitar duplicados por grupo
    const gruposMap = new Map();

    for (const grupo of gruposRaw) {
      const key = normalizar(grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId);
      if (key && !gruposMap.has(key)) {
        gruposMap.set(key, grupo);
      }
    }

    const grupos = Array.from(gruposMap.values());

    const calendario = grupos.map((grupo) => {
      const grupoKey = normalizar(grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId);

      const alumnosDelGrupo = inscripcionesRaw.filter((ins) => {
        const grupoInscripcion = normalizar(
          ins.GrupoId || ins.grupoId || ins.idGrupo || ins.IdGrupo
        );

        return grupoInscripcion === grupoKey;
      });

      return {
        idGrupo: grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId,
        nombreCurso: grupo.nombreCurso,
        diaClase: grupo.diaClase,
        horaClase: grupo.horaClase || grupo["horaClase "] || "",
        nombreProfesor: grupo.nombreProfesor,
        modalidad: grupo.modalidad,
        capacidadMaxima: grupo.CapacidadMaxima,
        alumnosInscritos: alumnosDelGrupo.length,
        alumnos: alumnosDelGrupo.map((a) => ({
          idAlumno: a.idAlumno || a.id_alumno || "",
          nombreAlumno: a.nombreAlumno || a.nombre || a.Alumno || ""
        })),
        estatus: grupo.Estatus
      };
    });

    console.log("GRUPOS RAW:", gruposRaw.slice(0, 3));
    console.log("INSCRIPCIONES RAW:", inscripcionesRaw.slice(0, 3));
    console.log("CALENDARIO:", calendario.slice(0, 3));

    res.json(calendario);
  } catch (error) {
    console.error("Error al construir calendario:", error);
    res.status(500).json({ error: "Error al construir calendario" });
  }
});

export default router;