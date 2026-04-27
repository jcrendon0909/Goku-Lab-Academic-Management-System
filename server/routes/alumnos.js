import express from "express";
import Alumno from "../models/Alumno.js";
import { generarId } from "../utils/generarId.js";

const router = express.Router();

function normalizar(valor) {
  return String(valor || "").trim().toUpperCase();
}

router.get("/", async (req, res) => {
  try {
    const { q } = req.query;

    let filtro = {};

    if (q) {
      filtro = {
        $or: [
          { nombreAlumno: { $regex: q, $options: "i" } },
          { nombre: { $regex: q, $options: "i" } },
          { idAlumno: { $regex: q, $options: "i" } },
          { "idAlumno ": { $regex: q, $options: "i" } },
          { id_alumno: { $regex: q, $options: "i" } },
        ],
      };
    }

    const alumnosRaw = await Alumno.find(filtro).lean();

    const alumnosNormalizados = alumnosRaw.map((alumno) => ({
      ...alumno,
      idAlumno:
        alumno.idAlumno ||
        alumno["idAlumno "] ||
        alumno.IdAlumno ||
        alumno.id_alumno ||
        "",
      nombreAlumno:
        alumno.nombreAlumno ||
        alumno.nombre ||
        alumno.Alumno ||
        "",
    }));

    const mapaUnicos = new Map();

    for (const alumno of alumnosNormalizados) {
      const key = normalizar(alumno.nombreAlumno);

      if (!mapaUnicos.has(key)) {
        mapaUnicos.set(key, alumno);
        continue;
      }

      const existente = mapaUnicos.get(key);
      const existenteTieneId = Boolean(existente?.idAlumno);
      const actualTieneId = Boolean(alumno?.idAlumno);

      if (!existenteTieneId && actualTieneId) {
        mapaUnicos.set(key, alumno);
      }
    }

    const alumnosUnicos = Array.from(mapaUnicos.values()).filter(
      (alumno) => alumno.nombreAlumno
    );

    res.status(200).json(alumnosUnicos);
  } catch (error) {
    console.error("ERROR GET ALUMNOS:", error);
    res.status(500).json({
      error: "Error al obtener alumnos",
      detalle: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { nombreAlumno, telefono, tutor, observaciones, estatus } = req.body;

    if (!nombreAlumno || !String(nombreAlumno).trim()) {
      return res.status(400).json({
        error: "Falta nombreAlumno",
      });
    }

    const nuevoIdAlumno = await generarId("alumno");
    const nombreLimpio = String(nombreAlumno).trim();

    const nuevoAlumno = new Alumno({
      idAlumno: nuevoIdAlumno,
      nombreAlumno: nombreLimpio,
      nombre: nombreLimpio,
      telefono: telefono || "",
      tutor: tutor || "",
      observaciones: observaciones || "",
      estatus: estatus || "Activo",
    });

    const guardado = await nuevoAlumno.save();

    res.status(201).json({
      ...guardado.toObject(),
      idAlumno: guardado.idAlumno || "",
      nombreAlumno: guardado.nombreAlumno || guardado.nombre || "",
    });
  } catch (error) {
    console.error("ERROR POST ALUMNOS:", error);
    res.status(500).json({
      error: "Error al crear alumno",
      detalle: error.message,
    });
  }
});

export default router;