import express from "express";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";
import ClaseCancelada from "../models/ClaseCancelada.js";
import Profesor from "../models/Profesor.js";

const router = express.Router();

const normalizar = (valor) => String(valor || "").trim().toUpperCase();

const limpiarFecha = (valor) => {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (!isNaN(fecha.getTime())) return fecha.toISOString();
  return String(valor);
};

const parseFechaFlexible = (valor) => {
  if (!valor) return null;

  const directa = new Date(valor);
  if (!isNaN(directa.getTime())) return directa;

  const matchRaro = String(valor).match(
    /([A-Za-z]{3}\s[A-Za-z]{3}\s\d{1,2}\s\d{4}).*?(\d{1,2}:\d{2})$/
  );

  if (matchRaro) {
    const fechaTexto = matchRaro[1];
    const horaTexto = matchRaro[2];
    const base = new Date(fechaTexto);

    if (!isNaN(base.getTime())) {
      const [h, m] = horaTexto.split(":").map(Number);
      base.setHours(h, m, 0, 0);
      return base;
    }
  }

  const matchSql = String(valor).match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  );

  if (matchSql) {
    const [, y, mo, d, h, mi] = matchSql;
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      0,
      0
    );
  }

  return null;
};

const obtenerHoraDesdeFecha = (valor) => {
  const fecha = parseFechaFlexible(valor);
  if (!fecha) return "";

  return `${fecha.getHours().toString().padStart(2, "0")}:${fecha
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const obtenerDiaDesdeFecha = (valor) => {
  const fecha = parseFechaFlexible(valor);
  if (!fecha) return "";

  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  return dias[fecha.getDay()];
};

router.get("/", async (req, res) => {
  try {
    const gruposRaw = await Grupo.find().lean();
    const inscripcionesRaw = await Inscripcion.find().lean();
    const reagendacionesRaw = await Reagendacion.find().lean();
    const clasesCanceladasRaw = await ClaseCancelada.find({ estatus: "activa" }).lean();
    const profesoresRaw = await Profesor.find().lean();

    const gruposMap = new Map();
    const profesoresMap = new Map();
    const profesoresNombreMap = new Map();
    
    // ✅ CAMBIO 5: Crear mapa de clases canceladas para búsqueda rápida
    // Estructura: "${grupoId}|YYYY-MM-DD" → true
    const clasesCanceladasMap = new Map();
    for (const cancelacion of clasesCanceladasRaw) {
      const fechaStr = cancelacion.fecha.toISOString().split("T")[0];
      const key = `${normalizar(cancelacion.idGrupo)}|${fechaStr}`;
      clasesCanceladasMap.set(key, true);
    }

    for (const profesor of profesoresRaw) {
      const idProfesor = profesor.idProfesor || profesor.IdProfesor || "";
      const nombreProfesor = profesor.nombre || profesor.nombreProfesor || "";

      if (idProfesor) {
        profesoresMap.set(normalizar(idProfesor), profesor);
      }

      if (nombreProfesor) {
        profesoresNombreMap.set(normalizar(nombreProfesor), profesor);
      }
    }

    for (const grupo of gruposRaw) {
      const key = normalizar(grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId);
      if (key && !gruposMap.has(key)) {
        gruposMap.set(key, grupo);
      }
    }

    const grupos = Array.from(gruposMap.values());

    const obtenerNombreProfesorCompleto = ({
      idProfesor,
      nombreProfesor,
    }) => {
      const profesorPorId = profesoresMap.get(normalizar(idProfesor || ""));
      if (profesorPorId?.nombre) {
        return profesorPorId.nombre;
      }

      const profesorPorNombre = profesoresNombreMap.get(
        normalizar(nombreProfesor || "")
      );
      if (profesorPorNombre?.nombre) {
        return profesorPorNombre.nombre;
      }

      return nombreProfesor || "";
    };

    const clasesBase = grupos.map((grupo) => {
      const grupoKey = normalizar(
        grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId
      );

      const idProfesorGrupo =
        grupo.idProfesor || grupo.IdProfesor || grupo.profesorId || "";

      const nombreProfesorCompleto = obtenerNombreProfesorCompleto({
        idProfesor: idProfesorGrupo,
        nombreProfesor: grupo.nombreProfesor,
      });

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
          modalidad: a.modalidad || "Presencial",
          comentarios: a.comentarios || "",
          inscripcionCreadaEn: a.fechaInscripcion || a.createdAt || a.updatedAt || null,
          reagendacion: null,
        }));

      // ✅ CAMBIO 1: Usar normalización consistente de idGrupoOrigen
      const alumnosOrigen = reagendacionesRaw
        .filter((r) => {
          const grupoOrigen = normalizar(r.idGrupoOrigen); // ✅ Solo usa idGrupoOrigen (normalizado)
          return grupoOrigen === grupoKey;
        })
        .map((r) => {
          const grupoNuevo = gruposMap.get(
            normalizar(
              r.idGrupoNuevo || r.IdgrupoNuevo || r.IdGrupoNuevo || ""
            )
          );

          return {
            idAlumno: r.idAlumno || "",
            nombreAlumno: r.nombreAlumno || "",
            reagendacion: {
              tipo: "origen",
              reagendacionId: String(r._id || r.ReagendacionId || ""),
              comentario: r.comentario || r.comentarios || "",
              // ✅ CAMBIO: Ahora fechas son Date objects, procesar directamente
              fechaHoraOriginal: r.fechaHoraOriginal ? new Date(r.fechaHoraOriginal).toISOString() : "",
              fechaHoraNueva: r.fechaHoraNueva ? new Date(r.fechaHoraNueva).toISOString() : "",
              horaClaseNueva:
                (grupoNuevo &&
                  (grupoNuevo.horaClase || grupoNuevo["horaClase "])) ||
                obtenerHoraDesdeFecha(r.fechaHoraNueva) ||
                "",
            },
          };
        });

      const alumnosMap = new Map();

      for (const alumno of alumnosBase) {
        alumnosMap.set(normalizar(alumno.idAlumno), alumno);
      }

      for (const alumno of alumnosOrigen) {
        const keyAlumno = normalizar(alumno.idAlumno);

        if (alumnosMap.has(keyAlumno)) {
          const existente = alumnosMap.get(keyAlumno);
          alumnosMap.set(keyAlumno, {
            ...existente,
            reagendacion: alumno.reagendacion,
          });
        } else {
          alumnosMap.set(keyAlumno, alumno);
        }
      }

      const alumnos = Array.from(alumnosMap.values());

      return {
        tipo: "base",
        idGrupo: grupo.IdGrupo || grupo.idGrupo || grupo.GrupoId,
        nombreCurso: grupo.nombreCurso,
        diaClase: grupo.diaClase || "",
        horaClase: grupo.horaClase || grupo["horaClase "] || "",
        fechaCreacion: grupo.fechaCreacion || null,
        comentarioGrupo: grupo.comentario || grupo.comentarioGrupo || "",
        idProfesor: idProfesorGrupo,
        nombreProfesor: nombreProfesorCompleto,
        capacidadMaxima: grupo.CapacidadMaxima,
        alumnosInscritos: alumnos.length,
        alumnos,
        estatus: grupo.Estatus,
      };
    });

    const reagendacionesAgrupadas = {};

    for (const r of reagendacionesRaw) {
      const idGrupoNuevo = r.idGrupoNuevo || ""; // ✅ Normalizado

      const grupoNuevo = gruposMap.get(normalizar(idGrupoNuevo));
      
      // ✅ CAMBIO: Ahora r.fechaHoraNueva es un Date object
      const fechaNuevaObj = r.fechaHoraNueva ? new Date(r.fechaHoraNueva) : null;
      
      const idProfesorNuevo =
        r.idProfesorNuevo ||
        r.IdProfesorNuevo ||
        (grupoNuevo &&
          (grupoNuevo.idProfesor ||
            grupoNuevo.IdProfesor ||
            grupoNuevo.profesorId)) ||
        "";

      const nombreProfesorNuevo = obtenerNombreProfesorCompleto({
        idProfesor: idProfesorNuevo,
        nombreProfesor:
          r.profesorNuevo || (grupoNuevo && grupoNuevo.nombreProfesor) || "",
      });

      const horaClaseNueva =
        (grupoNuevo &&
          (grupoNuevo.horaClase || grupoNuevo["horaClase "])) ||
        (fechaNuevaObj && !isNaN(fechaNuevaObj.getTime()) 
          ? `${String(fechaNuevaObj.getHours()).padStart(2, "0")}:${String(fechaNuevaObj.getMinutes()).padStart(2, "0")}`
          : "") ||
        "";

      const diaClaseNueva =
        (grupoNuevo && grupoNuevo.diaClase) ||
        (fechaNuevaObj && !isNaN(fechaNuevaObj.getTime())
          ? ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][fechaNuevaObj.getDay()]
          : "") ||
        "";

      const fechaKey =
        fechaNuevaObj && !isNaN(fechaNuevaObj.getTime())
          ? `${fechaNuevaObj.getFullYear()}-${String(fechaNuevaObj.getMonth() + 1).padStart(2, "0")}-${String(fechaNuevaObj.getDate()).padStart(2, "0")}`
          : "";

      const key = `${normalizar(idGrupoNuevo)}|${fechaKey}|${horaClaseNueva}`;

      if (!reagendacionesAgrupadas[key]) {
        reagendacionesAgrupadas[key] = {
          tipo: "reagendacion",
          idGrupo:
            idGrupoNuevo ||
            `REAGENDACION_${Object.keys(reagendacionesAgrupadas).length}`,
          nombreCurso:
            r.nombreCurso || (grupoNuevo && grupoNuevo.nombreCurso) || "",
          diaClase: diaClaseNueva,
          horaClase: horaClaseNueva,
          comentarioGrupo:
            (grupoNuevo &&
              (grupoNuevo.comentario || grupoNuevo.comentarioGrupo)) ||
            "",
          idProfesor: idProfesorNuevo,
          nombreProfesor: nombreProfesorNuevo,
          capacidadMaxima: (grupoNuevo && grupoNuevo.CapacidadMaxima) || 8,
          alumnos: [],
          reagendacionIds: [],
          reagendacionId: "",
          estatus: "Reagendado",
          esVirtual: !grupoNuevo,
        };
      }

      const reagendacionId = String(r._id || r.ReagendacionId || "");
      if (
        reagendacionId &&
        !reagendacionesAgrupadas[key].reagendacionIds.includes(reagendacionId)
      ) {
        reagendacionesAgrupadas[key].reagendacionIds.push(reagendacionId);
        if (!reagendacionesAgrupadas[key].reagendacionId) {
          reagendacionesAgrupadas[key].reagendacionId = reagendacionId;
        }
      }

      const grupoOrigen = gruposMap.get(
        normalizar(r.idGrupoOrigen || "") // ✅ Normalizado
      );

      const idProfesorOriginal =
        r.idProfesorOriginal ||
        r.IdProfesorOriginal ||
        (grupoOrigen &&
          (grupoOrigen.idProfesor ||
            grupoOrigen.IdProfesor ||
            grupoOrigen.profesorId)) ||
        "";

      // ✅ CAMBIO: Parsear fechas que ahora son Date objects
      reagendacionesAgrupadas[key].alumnos.push({
        idAlumno: r.idAlumno || "",
        nombreAlumno: r.nombreAlumno || "",
        modalidad: r.modalidad || "Presencial",
        reagendacion: {
          tipo: "destino",
          reagendacionId,
          comentario: r.comentario || r.comentarios || "",
          fechaHoraOriginal: r.fechaHoraOriginal ? new Date(r.fechaHoraOriginal).toISOString() : "",
          fechaHoraNueva: r.fechaHoraNueva ? new Date(r.fechaHoraNueva).toISOString() : "",
          idProfesorOriginal: idProfesorOriginal,
          horaClaseOriginal:
            (grupoOrigen &&
              (grupoOrigen.horaClase || grupoOrigen["horaClase "])) ||
            (r.fechaHoraOriginal && new Date(r.fechaHoraOriginal) 
              ? `${String(new Date(r.fechaHoraOriginal).getHours()).padStart(2, "0")}:${String(new Date(r.fechaHoraOriginal).getMinutes()).padStart(2, "0")}`
              : "") ||
            "",
        },
      });
    }

    const clasesReagendadas = Object.values(reagendacionesAgrupadas).map(
      (grupo) => ({
        ...grupo,
        alumnosInscritos: grupo.alumnos.length,
      })
    );

    res.json({
      clasesBase,
      reagendaciones: clasesReagendadas,
      clasesCanceladas: Array.from(clasesCanceladasMap.entries()).map(([key, _]) => {
        const [grupoId, fechaStr] = key.split("|");
        return { grupoId, fecha: fechaStr };
      }),
    });
  } catch (error) {
    console.error("Error al construir calendario:", error);
    res.status(500).json({ error: "Error al construir calendario" });
  }
});

export default router;
