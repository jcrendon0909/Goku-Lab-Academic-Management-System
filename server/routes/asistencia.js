import express from 'express';
import Asistencia from '../models/Asistencia.js';
import Grupo from '../models/Grupo.js';
import Inscripcion from '../models/Inscripcion.js';
import Reagendacion from '../models/Reagendacion.js';

const router = express.Router();

// ============================================================
// GET /profesor/:idProfesor - Obtener grupos y asistencias del día
// ============================================================
router.get('/profesor/:idProfesor', async (req, res) => {
  try {
    const { idProfesor } = req.params;
    let { fecha } = req.query;

    console.log(`🔍 Asistencia - Profesor: ${idProfesor}, Fecha: ${fecha || 'hoy'}`);

    if (!idProfesor) {
      return res.status(400).json({ error: 'ID de profesor requerido' });
    }

    if (!fecha) {
      fecha = new Date().toISOString().split('T')[0];
    }

    // ✅ CREAR FECHAS UTC PARA LA CONSULTA
    const fechaStr = fecha; // "YYYY-MM-DD"
    const inicioDia = new Date(fechaStr + 'T00:00:00.000Z');
    const finDia = new Date(fechaStr + 'T23:59:59.999Z');

    // ✅ OBTENER EL DÍA DE LA SEMANA USANDO LA FECHA LOCAL (MÉXICO)
    // Para obtener el día de la semana, usamos la fecha en zona horaria local
    const fechaLocal = new Date(fechaStr + 'T00:00:00');
    const diaSemana = fechaLocal.toLocaleDateString('es-ES', { weekday: 'long' });
    const diaSemanaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    // 1. Obtener grupos activos del profesor que coinciden con el día de la semana
    const grupos = await Grupo.find({
      idProfesor,
      Estatus: 'Activo',
      diaClase: diaSemanaCapitalized,
    }).lean();

    console.log(`   📚 Grupos encontrados: ${grupos.length}`);

    // 2. Para cada grupo, obtener alumnos inscritos activos y sus asistencias para la fecha (UTC)
    const gruposConAlumnos = await Promise.all(
      grupos.map(async (grupo) => {
        const inscripciones = await Inscripcion.find({
          grupoId: grupo.IdGrupo,
          estatus: 'Activa',
        })
          .lean()
          .select('idAlumno nombreAlumno modalidad -_id');

        // Obtener asistencias de estos alumnos para la fecha (usando UTC)
        const idsAlumnos = inscripciones.map(ins => ins.idAlumno);
        const asistencias = await Asistencia.find({
          idAlumno: { $in: idsAlumnos },
          idGrupo: grupo.IdGrupo,
          fecha: {
            $gte: inicioDia,
            $lt: finDia,
          },
        }).lean();

        const asistenciasMap = {};
        asistencias.forEach(a => {
          asistenciasMap[a.idAlumno] = a.estado;
        });

        return {
          idGrupo: grupo.IdGrupo,
          nombreCurso: grupo.nombreCurso,
          diaClase: grupo.diaClase,
          horaClase: grupo.horaClase,
          duracionClase: grupo.duracionClase,
          alumnos: inscripciones.map((ins) => ({
            idAlumno: ins.idAlumno,
            nombreAlumno: ins.nombreAlumno,
            modalidad: ins.modalidad || 'Presencial',
            estadoAsistencia: asistenciasMap[ins.idAlumno] || 'ausente',
          })),
          esReagendacion: false,
        };
      })
    );

    // 3. Obtener reagendaciones para ese día (usando UTC)
    const reagendaciones = await Reagendacion.find({
      idProfesor: idProfesor,
      fechaHoraNueva: { $gte: inicioDia, $lte: finDia },
      estatus: 'reagendado',
    }).lean();

    console.log(`   🔄 Reagendaciones: ${reagendaciones.length}`);

    const reagendacionesConAlumno = await Promise.all(
      reagendaciones.map(async (reag) => {
        const inscripcion = await Inscripcion.findOne({
          idAlumno: reag.idAlumno,
          grupoId: reag.idGrupoNuevo,
        })
          .lean()
          .select('nombreAlumno -_id');
        return {
          idGrupo: reag.idGrupoNuevo || `REAG-${reag._id}`,
          nombreCurso: reag.nombreCurso || 'Clase reagendada',
          diaClase: 'Reagendación',
          horaClase: reag.fechaHoraNueva
            ? new Date(reag.fechaHoraNueva).toTimeString().slice(0, 5)
            : '',
          duracionClase: reag.duracion || '2 horas',
          alumnos: [
            {
              idAlumno: reag.idAlumno,
              nombreAlumno: reag.nombreAlumno || inscripcion?.nombreAlumno || 'Alumno',
              modalidad: reag.modalidad || 'Presencial',
              estadoAsistencia: 'pendiente',
            },
          ],
          esReagendacion: true,
          reagendacionId: reag._id,
        };
      })
    );

    // 4. Combinar y devolver
    const resultado = [...gruposConAlumnos, ...reagendacionesConAlumno];
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error GET /asistencia/profesor/:idProfesor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /guardar - Guardar asistencias (lote) con UTC
// ============================================================
router.post('/guardar', async (req, res) => {
  try {
    const { asistencias } = req.body;
    if (!asistencias || !Array.isArray(asistencias) || asistencias.length === 0) {
      return res.status(400).json({ error: 'No se enviaron asistencias' });
    }

    const ops = asistencias.map((a) => ({
      updateOne: {
        filter: {
          idAlumno: a.idAlumno,
          idGrupo: a.idGrupo,
          fecha: new Date(a.fecha + 'T00:00:00.000Z'), // ✅ UTC
        },
        update: {
          $set: {
            idProfesor: a.idProfesor,
            estado: a.estado || 'ausente',
            comentario: a.comentario || '',
            horaInicio: a.horaInicio || '',
            horaFin: a.horaFin || '',
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await Asistencia.bulkWrite(ops);
    res.json({
      ok: true,
      mensaje: 'Asistencias guardadas',
      modificadas: result.modifiedCount,
      insertadas: result.upsertedCount,
    });
  } catch (error) {
    console.error('❌ Error POST /asistencia/guardar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /alumno/:idAlumno - Obtener asistencias de un alumno
// ============================================================
router.get('/alumno/:idAlumno', async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { desde, hasta } = req.query;
    const filtro = { idAlumno };
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = new Date(desde + 'T00:00:00.000Z');
      if (hasta) filtro.fecha.$lte = new Date(hasta + 'T23:59:59.999Z');
    }
    const asistencias = await Asistencia.find(filtro).sort({ fecha: -1 }).lean();
    res.json(asistencias);
  } catch (error) {
    console.error('❌ Error GET /asistencia/alumno/:idAlumno:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;