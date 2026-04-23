import express from "express";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";

const router = express.Router();

const normalizar = (valor) => String(valor || "").trim().toUpperCase();

const limpiarFecha = (valor) => {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (!isNaN(fecha.getTime())) return fecha.toISOString();
  return String(valor);
};

router.get("/", async (req, res) => {
  try {
    const gruposRaw = await Grupo.find().lean();
    const inscripcionesRaw = await Inscripcion.find().lean();
    const reagendacionesRaw = await Reagendacion.find().lean();

    const gruposMap = new Map();

    for (const grupo of gruposRaw) {
      const key = normalizar(grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId);
      if (key && !gruposMap.has(key)) {
        gruposMap.set(key, grupo);
      }
    }

    const grupos = Array.from(gruposMap.values());

    const clasesBase = grupos.map((grupo) => {
      const grupoKey = normalizar(
        grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId
      );

      const alumnosBase = inscripcionesRaw
        .filter((ins) => {
          const grupoInscripcion = normalizar(
            ins.GrupoId || ins.grupoId || ins.idGrupo || ins.IdGrupo
          );
          return grupoInscripcion === grupoKey;
        })
        .map((a) => ({
          idAlumno: a.idAlumno || a.id_alumno || "",
          nombreAlumno: a.nombreAlumno || a.nombre || a.Alumno || "",
          reagendacion: null,
        }));

      // Alumnos que salen de este grupo por reagendación
      const alumnosOrigen = reagendacionesRaw
        .filter((r) => {
          const grupoOrigen = normalizar(
            r.idGrupoOrigen || r.IdgrupoOrigen || r.IdGrupoOrigen
          );
          return grupoOrigen === grupoKey;
        })
        .map((r) => {
          const grupoNuevo = gruposMap.get(
            normalizar(r.idGrupoNuevo || r.IdgrupoNuevo || r.IdGrupoNuevo)
          );

          return {
            idAlumno: r.idAlumno || "",
            nombreAlumno: r.nombreAlumno || "",
            reagendacion: {
              tipo: "origen",
              fechaHoraOriginal: limpiarFecha(r.fechaHoraOriginal),
              fechaHoraNueva: limpiarFecha(r.fechaHoraNueva),
              horaClaseNueva:
                (grupoNuevo &&
                  (grupoNuevo.horaClase || grupoNuevo["horaClase "])) ||
                "",
            },
          };
        });

      // Alumnos que llegan a este grupo por reagendación
      const alumnosDestino = reagendacionesRaw
        .filter((r) => {
          const grupoDestino = normalizar(
            r.idGrupoNuevo || r.IdgrupoNuevo || r.IdGrupoNuevo
          );
          return grupoDestino === grupoKey;
        })
        .map((r) => {
          const grupoOrigen = gruposMap.get(
            normalizar(r.idGrupoOrigen || r.IdgrupoOrigen || r.IdGrupoOrigen)
          );

          return {
            idAlumno: r.idAlumno || "",
            nombreAlumno: r.nombreAlumno || "",
            reagendacion: {
              tipo: "destino",
              fechaHoraOriginal: limpiarFecha(r.fechaHoraOriginal),
              fechaHoraNueva: limpiarFecha(r.fechaHoraNueva),
              horaClaseOriginal:
                (grupoOrigen &&
                  (grupoOrigen.horaClase || grupoOrigen["horaClase "])) ||
                "",
            },
          };
        });

      // Unir sin duplicar alumnos
      const alumnosMap = new Map();

      for (const alumno of alumnosBase) {
        alumnosMap.set(normalizar(alumno.idAlumno), alumno);
      }

      for (const alumno of alumnosOrigen) {
        const keyAlumno = normalizar(alumno.idAlumno);
        alumnosMap.set(keyAlumno, alumno);
      }

      for (const alumno of alumnosDestino) {
        const keyAlumno = normalizar(alumno.idAlumno);
        alumnosMap.set(keyAlumno, alumno);
      }

      const alumnos = Array.from(alumnosMap.values());

      return {
        tipo: "base",
        idGrupo: grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId,
        nombreCurso: grupo.nombreCurso,
        diaClase: grupo.diaClase,
        horaClase: grupo.horaClase || grupo["horaClase "] || "",
        nombreProfesor: grupo.nombreProfesor,
        modalidad: grupo.modalidad,
        capacidadMaxima: grupo.CapacidadMaxima,
        alumnosInscritos: alumnos.length,
        alumnos,
        estatus: grupo.Estatus,
      };
    });

    const eventosReagendados = reagendacionesRaw.map((r) => {
      const grupoNuevo = gruposMap.get(
        normalizar(r.idGrupoNuevo || r.IdgrupoNuevo || r.IdGrupoNuevo)
      );
      const grupoOrigen = gruposMap.get(
        normalizar(r.idGrupoOrigen || r.IdgrupoOrigen || r.IdGrupoOrigen)
      );

      return {
        tipo: "reagendacion",
        reagendacionId: r.ReagendacionId || r.reagendacionId || "",
        idAlumno: r.idAlumno || "",
        nombreAlumno: r.nombreAlumno || "",
        idGrupoOrigen:
          r.idGrupoOrigen || r.IdgrupoOrigen || r.IdGrupoOrigen || "",
        idGrupoNuevo:
          r.idGrupoNuevo || r.IdgrupoNuevo || r.IdGrupoNuevo || "",
        nombreCurso: r.nombreCurso || "",
        profesorOriginal:
          r.profesorOriginal ||
          (grupoOrigen && grupoOrigen.nombreProfesor) ||
          "",
        profesorNuevo:
          r.profesorNuevo ||
          (grupoNuevo && grupoNuevo.nombreProfesor) ||
          "",
        fechaHoraOriginal: limpiarFecha(r.fechaHoraOriginal),
        fechaHoraNueva: limpiarFecha(r.fechaHoraNueva),
        horaClaseOriginal:
          (grupoOrigen && (grupoOrigen.horaClase || grupoOrigen["horaClase "])) ||
          "",
        horaClaseNueva:
          (grupoNuevo && (grupoNuevo.horaClase || grupoNuevo["horaClase "])) ||
          "",
        motivo: r.motivo || "",
        estatus: r.estatus || "reagendado",
      };
    });

    res.json({
      clasesBase,
      reagendaciones: eventosReagendados,
    });
  } catch (error) {
    console.error("Error al construir calendario:", error);
    res.status(500).json({ error: "Error al construir calendario" });
  }
});

export default router;