import express from "express";
import Grupo from "../models/Grupo.js";
import Inscripcion from "../models/Inscripcion.js";
import Reagendacion from "../models/Reagendacion.js";
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
    const profesoresRaw = await Profesor.find().lean();

    const gruposMap = new Map();
    const profesoresMap = new Map();
    const profesoresNombreMap = new Map();

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

      const alumnosOrigen = reagendacionesRaw
        .filter((r) => {
          const grupoOrigen = normalizar(
            r.idGrupoOrigen || r.IdgrupoOrigen || r.IdGrupoOrigen
          );
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
              fechaHoraOriginal: limpiarFecha(r.fechaHoraOriginal),
              fechaHoraNueva: limpiarFecha(r.fechaHoraNueva),
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
      const idGrupoNuevo =
        r.idGrupoNuevo || r.IdgrupoNuevo || r.IdGrupoNuevo || "";

      const grupoNuevo = gruposMap.get(normalizar(idGrupoNuevo));
      const fechaHoraNueva = limpiarFecha(r.fechaHoraNueva);
      const fechaNuevaObj = parseFechaFlexible(fechaHoraNueva);

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
        obtenerHoraDesdeFecha(fechaHoraNueva) ||
        "";

      const diaClaseNueva =
        (grupoNuevo && grupoNuevo.diaClase) ||
        obtenerDiaDesdeFecha(fechaHoraNueva) ||
        "";

      const fechaKey =
        fechaNuevaObj && !isNaN(fechaNuevaObj.getTime())
          ? `${fechaNuevaObj.getFullYear()}-${fechaNuevaObj.getMonth()}-${fechaNuevaObj.getDate()}`
          : fechaHoraNueva;

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
        normalizar(r.idGrupoOrigen || r.IdgrupoOrigen || r.IdGrupoOrigen || "")
      );

      const idProfesorOriginal =
        r.idProfesorOriginal ||
        r.IdProfesorOriginal ||
        (grupoOrigen &&
          (grupoOrigen.idProfesor ||
            grupoOrigen.IdProfesor ||
            grupoOrigen.profesorId)) ||
        "";

      reagendacionesAgrupadas[key].alumnos.push({
        idAlumno: r.idAlumno || "",
        nombreAlumno: r.nombreAlumno || "",
        modalidad: r.modalidad || "Presencial",
        reagendacion: {
          tipo: "destino",
          reagendacionId,
          comentario: r.comentario || r.comentarios || "",
          fechaHoraOriginal: limpiarFecha(r.fechaHoraOriginal),
          fechaHoraNueva: limpiarFecha(r.fechaHoraNueva),
          idProfesorOriginal: idProfesorOriginal,
          horaClaseOriginal:
            (grupoOrigen &&
              (grupoOrigen.horaClase || grupoOrigen["horaClase "])) ||
            obtenerHoraDesdeFecha(r.fechaHoraOriginal) ||
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
    });
  } catch (error) {
    console.error("Error al construir calendario:", error);
    res.status(500).json({ error: "Error al construir calendario" });
  }
});

export default router;
