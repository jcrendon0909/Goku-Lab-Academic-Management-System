import express from 'express';
import mongoose from 'mongoose';
import Asistencia from '../models/Asistencia.js';
import SesionClase from '../models/SesionClase.js';
import Grupo from '../models/Grupo.js';
import Inscripcion from '../models/Inscripcion.js';
import Reagendacion from '../models/Reagendacion.js';
import ClaseCancelada from '../models/ClaseCancelada.js';

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

/**
 * Convierte "YYYY-MM-DD" a un Date normalizado a 00:00:00 UTC.
 */
function parseFechaUTC(fechaStr) {
  return new Date(fechaStr + 'T00:00:00.000Z');
}

/**
 * Devuelve { inicio, fin } del día en UTC a partir de "YYYY-MM-DD".
 */
function rangoDiaUTC(fechaStr) {
  const inicio = new Date(fechaStr + 'T00:00:00.000Z');
  const fin = new Date(fechaStr + 'T23:59:59.999Z');
  return { inicio, fin };
}

/**
 * Devuelve el nombre del día de la semana en español, capitalizado.
 * Ej: "2026-09-28" → "Lunes"
 */
function getDiaSemanaCapitalizado(fechaStr) {
  const fechaLocal = new Date(fechaStr + 'T12:00:00');
  const dia = fechaLocal.toLocaleDateString('es-ES', { weekday: 'long' });
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

/**
 * Calcula horaFin a partir de horaInicio ("16:00") y duración ("1:30 hr").
 * Si no puede parsear, devuelve ''.
 */
function calcularHoraFin(horaInicio, duracion) {
  if (!horaInicio || !duracion) return '';
  try {
    const [h, m] = horaInicio.split(':').map(Number);
    let minutosDur = 0;
    const matchHM = duracion.match(/^(\d+):(\d+)/);
    const matchH = duracion.match(/^(\d+)\s*(hora|hr)/i);
    const matchM = duracion.match(/^(\d+)\s*min/i);
    if (matchHM) minutosDur = parseInt(matchHM[1]) * 60 + parseInt(matchHM[2]);
    else if (matchH) minutosDur = parseInt(matchH[1]) * 60;
    else if (matchM) minutosDur = parseInt(matchM[1]);
    else return '';

    const totalMin = h * 60 + m + minutosDur;
    const hFin = Math.floor(totalMin / 60) % 24;
    const mFin = totalMin % 60;
    return `${String(hFin).padStart(2, '0')}:${String(mFin).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Devuelve los alumnos vigentes en un grupo a una fecha dada.
 * Regla: inscripción con estatus 'Activa' O ('Finalizada' pero fechaFin >= fecha).
 * También excluye 'Baja' e 'Inactiva'.
 */
async function alumnosVigentesEnGrupo(idGrupo, fecha) {
  const inscripciones = await Inscripcion.find({
    grupoId: idGrupo,
    $or: [
      { estatus: 'Activa' },
      { estatus: 'Finalizada', fechaFin: { $gte: fecha } },
    ],
  })
    .lean()
    .select('idAlumno nombreAlumno modalidad estatus fechaInicioPago fechaFin -_id');

  return inscripciones;
}

/**
 * Crea (o devuelve) la SesionClase para un grupo en una fecha.
 * Idempotente: si ya existe, la devuelve tal cual.
 */
async function obtenerOCrearSesion(grupo, fechaStr) {
  const fecha = parseFechaUTC(fechaStr);
  const horaInicio = grupo.horaClase || '';
  const horaFin = calcularHoraFin(horaInicio, grupo.duracionClase);

  // Buscar existente
  let sesion = await SesionClase.findOne({
    idGrupo: grupo.IdGrupo,
    fecha,
    horaInicio,
  });

  if (sesion) return sesion;

  // Crear nueva
  sesion = await SesionClase.create({
    idGrupo: grupo.IdGrupo,
    fecha,
    horaInicio,
    horaFin,
    duracionClase: grupo.duracionClase || '1:30 hr',
    idProfesorTitular: grupo.idProfesor || '',
    nombreProfesorTitular: grupo.nombreProfesor || '',
    idProfesorReal: grupo.idProfesor || '',
    nombreProfesorReal: grupo.nombreProfesor || '',
    estado: 'programada',
  });

  return sesion;
}

/**
 * Sincroniza ClaseCancelada con el estado de una SesionClase.
 * - Si estado === 'cancelada'  → upsert ClaseCancelada con estatus 'activa'
 * - Si estado !== 'cancelada'  → marcar ClaseCancelada existente como 'revertida'
 *
 * El claseCanceladaId se deriva del idSesion para que sea idempotente.
 */
async function sincronizarClaseCancelada(sesion, motivo = '', canceladoPor = '') {
  const fechaStr = sesion.fecha.toISOString().split('T')[0];
  const filtro = {
    idGrupo: sesion.idGrupo,
    fecha: new Date(fechaStr + 'T00:00:00.000Z'),
  };

  if (sesion.estado === 'cancelada') {
    // Upsert: si ya existe una cancelación activa para ese grupo/fecha, actualizarla
    const existente = await ClaseCancelada.findOne({ ...filtro, estatus: 'activa' });
    if (existente) {
      existente.motivo = motivo || existente.motivo || 'Clase cancelada';
      existente.canceladoPor = canceladoPor || existente.canceladoPor;
      existente.nota = `Sesión ${sesion._id} marcada como cancelada`;
      await existente.save();
      return existente;
    }

    const claseCanceladaId = `CC-${sesion._id}`;
    const nueva = await ClaseCancelada.create({
      claseCanceladaId,
      idGrupo: sesion.idGrupo,
      fecha: new Date(fechaStr + 'T00:00:00.000Z'),
      motivo: motivo || 'Clase cancelada',
      canceladoPor: canceladoPor || '',
      nota: `Sesión ${sesion._id} marcada como cancelada`,
      estatus: 'activa',
    });
    return nueva;
  }

  // Si el estado ya no es 'cancelada', revertir la cancelación si existía
  await ClaseCancelada.updateMany(
    { ...filtro, estatus: 'activa' },
    { $set: { estatus: 'revertida', nota: `Revertida: sesión pasó a estado '${sesion.estado}'` } }
  );
}

// ============================================================
// GET /profesor/:idProfesor
// Devuelve los grupos del profesor con la lista de alumnos para una fecha.
// AHORA también incluye estado de la sesión y reagendaciones correctamente.
// ============================================================
router.get('/profesor/:idProfesor', async (req, res) => {
  try {
    const { idProfesor } = req.params;
    let { fecha } = req.query;

    if (!idProfesor) {
      return res.status(400).json({ error: 'ID de profesor requerido' });
    }
    if (!fecha) {
      fecha = new Date().toISOString().split('T')[0];
    }

    const { inicio, fin } = rangoDiaUTC(fecha);
    const diaSemana = getDiaSemanaCapitalizado(fecha);

    // 1. Grupos activos del profesor que dan clase ese día
    const grupos = await Grupo.find({
      idProfesor,
      Estatus: 'Activo',
      diaClase: diaSemana,
    }).lean();

    // 2. Para cada grupo: alumnos vigentes + asistencias + estado de sesión
    const gruposConAlumnos = await Promise.all(
      grupos.map(async (grupo) => {
        const sesion = await obtenerOCrearSesion(grupo, fecha);

        const inscripciones = await alumnosVigentesEnGrupo(grupo.IdGrupo, parseFechaUTC(fecha));
        const idsAlumnos = inscripciones.map((i) => i.idAlumno);

        const asistencias = await Asistencia.find({
          idAlumno: { $in: idsAlumnos },
          idGrupo: grupo.IdGrupo,
          fecha: { $gte: inicio, $lte: fin },
          tipoRegistro: 'regular',
        }).lean();

        const asistMap = {};
        asistencias.forEach((a) => {
          asistMap[a.idAlumno] = a;
        });

        return {
          idGrupo: grupo.IdGrupo,
          nombreCurso: grupo.nombreCurso,
          diaClase: grupo.diaClase,
          horaClase: grupo.horaClase,
          duracionClase: grupo.duracionClase,
          idSesion: sesion._id,
          estadoSesion: sesion.estado,
          esSustitucion: sesion.esSustitucion,
          idProfesorReal: sesion.idProfesorReal,
          nombreProfesorReal: sesion.nombreProfesorReal,
          alumnos: inscripciones.map((ins) => ({
            idAlumno: ins.idAlumno,
            nombreAlumno: ins.nombreAlumno,
            modalidad: ins.modalidad || 'Presencial',
            estadoAsistencia: asistMap[ins.idAlumno]?.estado || 'ausente',
            comentario: asistMap[ins.idAlumno]?.comentario || '',
          })),
          esReagendacion: false,
        };
      })
    );

    // 3. Reagendaciones que este profesor debe atender ese día
    // FIX BUG: antes buscaba por idProfesor (campo inexistente), ahora idProfesorNuevo
    const reagendaciones = await Reagendacion.find({
      idProfesorNuevo: idProfesor,
      fechaHoraNueva: { $gte: inicio, $lte: fin },
      estatus: 'reagendado',
    }).lean();

    // 3b. Excluir las que ya fueron atendidas (asistioAlDestino = true)
    const reagendacionesPendientes = reagendaciones.filter((r) => !r.asistioAlDestino);

    const reagendacionesConAlumno = await Promise.all(
      reagendacionesPendientes.map(async (reag) => {
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
          idSesion: reag.idSesionDestino || null,
          estadoSesion: 'programada',
          alumnos: [
            {
              idAlumno: reag.idAlumno,
              nombreAlumno:
                reag.nombreAlumno || inscripcion?.nombreAlumno || 'Alumno',
              modalidad: reag.modalidad || 'Presencial',
              estadoAsistencia: 'pendiente',
            },
          ],
          esReagendacion: true,
          reagendacionId: reag._id,
        };
      })
    );

    // 4. Devolver todo junto (compatible con el frontend actual)
    const resultado = [...gruposConAlumnos, ...reagendacionesConAlumno];
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error GET /asistencia/profesor/:idProfesor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /guardar
// Guarda asistencias en lote (compatibilidad con frontend actual).
// Internamente también actualiza la SesionClase correspondiente.
// ============================================================
router.post('/guardar', async (req, res) => {
  try {
    const { asistencias, estadoSesion, observaciones, registradoPor } = req.body;

    if (!asistencias || !Array.isArray(asistencias) || asistencias.length === 0) {
      return res.status(400).json({ error: 'No se enviaron asistencias' });
    }

    // Agrupar por (idGrupo, fecha) para actualizar la sesión
    const gruposFechas = new Set();
    asistencias.forEach((a) => {
      gruposFechas.add(`${a.idGrupo}::${a.fecha}`);
    });

    // 1. Upsert de asistencias
    const ops = asistencias.map((a) => ({
      updateOne: {
        filter: {
          idAlumno: a.idAlumno,
          idGrupo: a.idGrupo,
          fecha: parseFechaUTC(a.fecha),
          tipoRegistro: a.tipoRegistro || 'regular',
        },
        update: {
          $set: {
            idProfesor: a.idProfesor,
            estado: a.estado || 'ausente',
            comentario: a.comentario || '',
            horaInicio: a.horaInicio || '',
            horaFin: a.horaFin || '',
            tipoRegistro: a.tipoRegistro || 'regular',
            idGrupoRegular: a.idGrupoRegular || a.idGrupo,
            idReagendacion: a.idReagendacion || '',
            registradoPor: registradoPor || '',
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await Asistencia.bulkWrite(ops);

    // 2. Actualizar/cerrar la sesión por cada (grupo, fecha)
    for (const clave of gruposFechas) {
      const [idGrupo, fecha] = clave.split('::');
      const grupo = await Grupo.findOne({ IdGrupo: idGrupo }).lean();
      if (!grupo) continue;

      const sesion = await obtenerOCrearSesion(grupo, fecha);

      // Recalcular contadores desde las asistencias guardadas
      const { inicio, fin } = rangoDiaUTC(fecha);
      const asistenciasDelDia = await Asistencia.find({
        idGrupo,
        fecha: { $gte: inicio, $lte: fin },
        tipoRegistro: 'regular',
      }).lean();

      const totalPresentes = asistenciasDelDia.filter((a) => a.estado === 'presente').length;
      const totalAusentes = asistenciasDelDia.filter((a) => a.estado === 'ausente').length;
      const totalReagendados = asistenciasDelDia.filter((a) => a.estado === 'reagendado').length;

      sesion.totalAlumnos = asistenciasDelDia.length;
      sesion.totalPresentes = totalPresentes;
      sesion.totalAusentes = totalAusentes;
      sesion.totalReagendados = totalReagendados;

      // Estado de sesión: si el cliente lo manda, lo respetamos; si no, 'dada'
      if (estadoSesion && ['programada', 'dada', 'cancelada', 'no_asistio'].includes(estadoSesion)) {
        sesion.estado = estadoSesion;
      } else if (sesion.estado === 'programada') {
        sesion.estado = 'dada';
      }

      if (observaciones !== undefined) sesion.observaciones = observaciones;
      if (registradoPor) sesion.registradoPor = registradoPor;

      await sesion.save();

      // Puente con el sistema viejo
      await sincronizarClaseCancelada(sesion, sesion.motivo, sesion.canceladoPor);

      // 3. Vincular cada asistencia a su sesión
      await Asistencia.updateMany(
        { idGrupo, fecha: { $gte: inicio, $lte: fin }, tipoRegistro: 'regular', idSesion: null },
        { $set: { idSesion: sesion._id } }
      );
    }

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
// GET /alumno/:idAlumno
// Historial de asistencias de un alumno.
// ============================================================
router.get('/alumno/:idAlumno', async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { desde, hasta, tipoRegistro } = req.query;

    const filtro = { idAlumno };
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = parseFechaUTC(desde);
      if (hasta) filtro.fecha.$lte = rangoDiaUTC(hasta).fin;
    }
    if (tipoRegistro) filtro.tipoRegistro = tipoRegistro;

    const asistencias = await Asistencia.find(filtro)
      .sort({ fecha: -1 })
      .populate('idSesion', 'estado idProfesorReal nombreProfesorReal')
      .lean();

    res.json(asistencias);
  } catch (error) {
    console.error('❌ Error GET /asistencia/alumno/:idAlumno:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /sesion?idGrupo=...&fecha=YYYY-MM-DD
// Obtiene (o crea) la sesión de un grupo en una fecha.
// ============================================================
router.get('/sesion', async (req, res) => {
  try {
    const { idGrupo, fecha } = req.query;
    if (!idGrupo || !fecha) {
      return res.status(400).json({ error: 'idGrupo y fecha son requeridos' });
    }

    const grupo = await Grupo.findOne({ IdGrupo: idGrupo }).lean();
    if (!grupo) {
      return res.status(404).json({ error: `Grupo no encontrado: ${idGrupo}` });
    }

    const sesion = await obtenerOCrearSesion(grupo, fecha);

    const { inicio, fin } = rangoDiaUTC(fecha);
    const asistencias = await Asistencia.find({
      idSesion: sesion._id,
      fecha: { $gte: inicio, $lte: fin },
    }).lean();

    res.json({ sesion, asistencias });
  } catch (error) {
    console.error('❌ Error GET /asistencia/sesion:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /sesion/:id
// Detalle completo de una sesión, incluyendo alumnos vigentes.
// ============================================================
router.get('/sesion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de sesión inválido' });
    }

    const sesion = await SesionClase.findById(id).lean();
    if (!sesion) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const grupo = await Grupo.findOne({ IdGrupo: sesion.idGrupo }).lean();
    const inscripciones = await alumnosVigentesEnGrupo(sesion.idGrupo, sesion.fecha);

    const { inicio, fin } = rangoDiaUTC(sesion.fecha.toISOString().split('T')[0]);
    const asistencias = await Asistencia.find({
      idSesion: sesion._id,
      fecha: { $gte: inicio, $lte: fin },
    }).lean();

    const asistMap = {};
    asistencias.forEach((a) => {
      asistMap[a.idAlumno] = a;
    });

    // Alumnos regulares + alumnos en reagendación hacia esta sesión
    const reagendacionesHacia = await Reagendacion.find({
      idSesionDestino: sesion._id,
      estatus: 'reagendado',
    }).lean();

    const alumnos = inscripciones.map((ins) => ({
      idAlumno: ins.idAlumno,
      nombreAlumno: ins.nombreAlumno,
      modalidad: ins.modalidad,
      tipoRegistro: 'regular',
      estado: asistMap[ins.idAlumno]?.estado || 'ausente',
      comentario: asistMap[ins.idAlumno]?.comentario || '',
    }));

    for (const reag of reagendacionesHacia) {
      alumnos.push({
        idAlumno: reag.idAlumno,
        nombreAlumno: reag.nombreAlumno,
        modalidad: reag.modalidad || 'Presencial',
        tipoRegistro: 'reagendacion',
        idReagendacion: reag.ReagendacionId,
        estado: asistMap[reag.idAlumno]?.estado || 'pendiente',
        comentario: asistMap[reag.idAlumno]?.comentario || '',
      });
    }

    res.json({ sesion, grupo, alumnos });
  } catch (error) {
    console.error('❌ Error GET /asistencia/sesion/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PUT /sesion/:id/lista
// Guarda la lista completa de una sesión (reemplaza lo existente).
// ============================================================
router.put('/sesion/:id/lista', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de sesión inválido' });
    }

    const { alumnos, estadoSesion, observaciones, registradoPor } = req.body;

    const sesion = await SesionClase.findById(id);
    if (!sesion) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const fechaStr = sesion.fecha.toISOString().split('T')[0];
    const { inicio, fin } = rangoDiaUTC(fechaStr);

    // 1. Upsert por alumno
    if (Array.isArray(alumnos) && alumnos.length > 0) {
      const ops = alumnos.map((a) => ({
        updateOne: {
          filter: {
            idAlumno: a.idAlumno,
            idSesion: sesion._id,
          },
          update: {
            $set: {
              idGrupo: sesion.idGrupo,
              idProfesor: sesion.idProfesorReal || sesion.idProfesorTitular,
              fecha: sesion.fecha,
              estado: a.estado || 'ausente',
              comentario: a.comentario || '',
              horaInicio: sesion.horaInicio,
              horaFin: sesion.horaFin,
              tipoRegistro: a.tipoRegistro || 'regular',
              idGrupoRegular: a.idGrupoRegular || sesion.idGrupo,
              idReagendacion: a.idReagendacion || '',
              registradoPor: registradoPor || '',
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      }));
      await Asistencia.bulkWrite(ops);

      // 2. Si hubo reagendaciones, marcar asistioAlDestino
      const reagIds = alumnos
        .filter((a) => a.tipoRegistro === 'reagendacion' && a.idReagendacion)
        .map((a) => a.idReagendacion);
      if (reagIds.length > 0) {
        await Reagendacion.updateMany(
          { ReagendacionId: { $in: reagIds } },
          { $set: { asistioAlDestino: true, idSesionDestino: sesion._id } }
        );
      }
    }

    // 3. Recalcular contadores y actualizar estado de la sesión
    const asistenciasDelDia = await Asistencia.find({
      idSesion: sesion._id,
      fecha: { $gte: inicio, $lte: fin },
    }).lean();

    sesion.totalAlumnos = asistenciasDelDia.length;
    sesion.totalPresentes = asistenciasDelDia.filter((a) => a.estado === 'presente').length;
    sesion.totalAusentes = asistenciasDelDia.filter((a) => a.estado === 'ausente').length;
    sesion.totalReagendados = asistenciasDelDia.filter((a) => a.estado === 'reagendado').length;

    if (estadoSesion && ['programada', 'dada', 'cancelada', 'no_asistio'].includes(estadoSesion)) {
      sesion.estado = estadoSesion;
    } else if (sesion.estado === 'programada') {
      sesion.estado = 'dada';
    }
    if (observaciones !== undefined) sesion.observaciones = observaciones;
    if (registradoPor) sesion.registradoPor = registradoPor;

    await sesion.save();

    // Puente con el sistema viejo
    await sincronizarClaseCancelada(sesion, sesion.motivo, sesion.canceladoPor);

    res.json({ ok: true, sesion });
  } catch (error) {
    console.error('❌ Error PUT /asistencia/sesion/:id/lista:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /sesion/:id/estado
// Cambia el estado de la sesión (dada / cancelada / no_asistio).
// ============================================================
router.patch('/sesion/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo, canceladoPor, observaciones, registradoPor } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de sesión inválido' });
    }
    if (!['programada', 'dada', 'cancelada', 'no_asistio'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const sesion = await SesionClase.findById(id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    sesion.estado = estado;
    if (motivo !== undefined) sesion.motivo = motivo;
    if (canceladoPor !== undefined) sesion.canceladoPor = canceladoPor;
    if (observaciones !== undefined) sesion.observaciones = observaciones;
    if (registradoPor) sesion.registradoPor = registradoPor;

    await sesion.save();

    // Puente con el sistema viejo (calendario y notificaciones)
    await sincronizarClaseCancelada(sesion, motivo, canceladoPor);

    res.json({ ok: true, sesion });
  } catch (error) {
    console.error('❌ Error PATCH /asistencia/sesion/:id/estado:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PATCH /sesion/:id/sustituto
// Cambia el profesor REAL de UNA sesión (sustituto de un día).
// No afecta al Grupo.
// ============================================================
router.patch('/sesion/:id/sustituto', async (req, res) => {
  try {
    const { id } = req.params;
    const { idProfesorReal, nombreProfesorReal, motivoSustitucion } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de sesión inválido' });
    }
    if (!idProfesorReal) {
      return res.status(400).json({ error: 'idProfesorReal es requerido' });
    }

    const sesion = await SesionClase.findById(id);
    if (!sesion) return res.status(404).json({ error: 'Sesión no encontrada' });

    sesion.idProfesorReal = idProfesorReal;
    sesion.nombreProfesorReal = nombreProfesorReal || '';
    sesion.esSustitucion = idProfesorReal !== sesion.idProfesorTitular;
    sesion.motivoSustitucion = motivoSustitucion || '';

    await sesion.save();
    res.json({ ok: true, sesion });
  } catch (error) {
    console.error('❌ Error PATCH /asistencia/sesion/:id/sustituto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /grupo/:grupoId
// Historial de sesiones de un grupo (con filtro de fechas opcional).
// ============================================================
router.get('/grupo/:grupoId', async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { desde, hasta, estado } = req.query;

    const filtro = { idGrupo: grupoId };
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = parseFechaUTC(desde);
      if (hasta) filtro.fecha.$lte = rangoDiaUTC(hasta).fin;
    }
    if (estado) filtro.estado = estado;

    const sesiones = await SesionClase.find(filtro).sort({ fecha: -1 }).lean();
    res.json(sesiones);
  } catch (error) {
    console.error('❌ Error GET /asistencia/grupo/:grupoId:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /reportes/alumno/:idAlumno
// Timeline del alumno: cada clase, estado, si fue reagendación, profe.
// ============================================================
router.get('/reportes/alumno/:idAlumno', async (req, res) => {
  try {
    const { idAlumno } = req.params;
    const { desde, hasta } = req.query;

    const filtro = { idAlumno };
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = parseFechaUTC(desde);
      if (hasta) filtro.fecha.$lte = rangoDiaUTC(hasta).fin;
    }

    const asistencias = await Asistencia.find(filtro)
      .sort({ fecha: -1 })
      .populate('idSesion', 'estado idProfesorReal nombreProfesorReal esSustitucion')
      .lean();

    // Traer reagendaciones del alumno para enriquecer
    const reagendaciones = await Reagendacion.find({ idAlumno })
      .sort({ fechaHoraOriginal: -1 })
      .lean();

    const reagPorFecha = {};
    reagendaciones.forEach((r) => {
      if (r.fechaHoraOriginal) {
        const key = new Date(r.fechaHoraOriginal).toISOString().split('T')[0];
        reagPorFecha[key] = r;
      }
    });

    const timeline = asistencias.map((a) => {
      const fechaStr = new Date(a.fecha).toISOString().split('T')[0];
      return {
        fecha: fechaStr,
        idGrupo: a.idGrupo,
        idGrupoRegular: a.idGrupoRegular || a.idGrupo,
        tipoRegistro: a.tipoRegistro,
        estado: a.estado,
        comentario: a.comentario,
        horaInicio: a.horaInicio,
        horaFin: a.horaFin,
        estadoSesion: a.idSesion?.estado || 'desconocido',
        profesorReal: a.idSesion?.nombreProfesorReal || '',
        esSustitucion: a.idSesion?.esSustitucion || false,
        reagendacion: reagPorFecha[fechaStr] || null,
      };
    });

    // Totales
    const totales = {
      total: asistencias.length,
      presentes: asistencias.filter((a) => a.estado === 'presente').length,
      ausentes: asistencias.filter((a) => a.estado === 'ausente').length,
      justificados: asistencias.filter((a) => a.estado === 'justificado').length,
      retardos: asistencias.filter((a) => a.estado === 'retardo').length,
      reagendados: asistencias.filter((a) => a.estado === 'reagendado').length,
    };

    res.json({ timeline, totales });
  } catch (error) {
    console.error('❌ Error GET /asistencia/reportes/alumno/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /reportes/grupo/:grupoId
// Matriz alumno × fecha para un grupo en un rango.
// ============================================================
router.get('/reportes/grupo/:grupoId', async (req, res) => {
  try {
    const { grupoId } = req.params;
    const { desde, hasta } = req.query;

    const filtro = { idGrupo: grupoId };
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = parseFechaUTC(desde);
      if (hasta) filtro.fecha.$lte = rangoDiaUTC(hasta).fin;
    }

    const asistencias = await Asistencia.find({ ...filtro, tipoRegistro: 'regular' })
      .sort({ fecha: 1 })
      .lean();

    // Fechas únicas
    const fechas = [...new Set(asistencias.map((a) => new Date(a.fecha).toISOString().split('T')[0]))];

    // Alumnos únicos
    const alumnosMap = {};
    asistencias.forEach((a) => {
      if (!alumnosMap[a.idAlumno]) {
        alumnosMap[a.idAlumno] = { idAlumno: a.idAlumno, asistencias: {} };
      }
      const fechaStr = new Date(a.fecha).toISOString().split('T')[0];
      alumnosMap[a.idAlumno].asistencias[fechaStr] = a.estado;
    });

    const alumnos = Object.values(alumnosMap);

    res.json({ fechas, alumnos });
  } catch (error) {
    console.error('❌ Error GET /asistencia/reportes/grupo/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /reportes/profesor/:idProfesor
// Resumen: clases dadas/canceladas/no_asistio + horas trabajadas.
// ============================================================
router.get('/reportes/profesor/:idProfesor', async (req, res) => {
  try {
    const { idProfesor } = req.params;
    const { desde, hasta } = req.query;

    const filtro = { idProfesorReal: idProfesor };
    if (desde || hasta) {
      filtro.fecha = {};
      if (desde) filtro.fecha.$gte = parseFechaUTC(desde);
      if (hasta) filtro.fecha.$lte = rangoDiaUTC(hasta).fin;
    }

    const sesiones = await SesionClase.find(filtro).sort({ fecha: -1 }).lean();

    const dadas = sesiones.filter((s) => s.estado === 'dada');
    const canceladas = sesiones.filter((s) => s.estado === 'cancelada');
    const noAsistio = sesiones.filter((s) => s.estado === 'no_asistio');

    // Calcular horas trabajadas (solo en 'dada')
    let minutosTotales = 0;
    dadas.forEach((s) => {
      if (!s.horaInicio || !s.horaFin) return;
      const [h1, m1] = s.horaInicio.split(':').map(Number);
      const [h2, m2] = s.horaFin.split(':').map(Number);
      minutosTotales += (h2 * 60 + m2) - (h1 * 60 + m1);
    });
    const horasTrabajadas = Math.round((minutosTotales / 60) * 100) / 100;

    res.json({
      totalSesiones: sesiones.length,
      dadas: dadas.length,
      canceladas: canceladas.length,
      noAsistio: noAsistio.length,
      horasTrabajadas,
      sesiones,
    });
  } catch (error) {
    console.error('❌ Error GET /asistencia/reportes/profesor/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;