import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';

interface InscripcionFormData {
  idAlumno?: string;
  nombreAlumno: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  tutor?: string;
  descuento?: number;
  notasInternas?: string;
  observaciones?: string;
  idCurso: string;
  idProfesor: string;
  grupoId: string;
  diaClase: string;
  horaClase: string;
  duracionClase: string;
  modalidad: string;
  montoMensualidad: number;
  diaPago: number;
  fechaInicioPago: string;
  comentarios?: string;
}

interface InscripcionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  alumnoInicial?: {
    idAlumno: string;
    nombreAlumno: string;
    telefono?: string;
    email?: string;
    fechaNacimiento?: string;
    tutor?: string;
    descuento?: number;
    notasInternas?: string;
    observaciones?: string;
  };
}

const InscripcionForm: React.FC<InscripcionFormProps> = ({ onClose, onSuccess, alumnoInicial }) => {
  const [cursos, setCursos] = useState<any[]>([]);
  const [profesores, setProfesores] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState(1);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InscripcionFormData>({
    defaultValues: {
      idAlumno: alumnoInicial?.idAlumno || '',
      nombreAlumno: alumnoInicial?.nombreAlumno || '',
      telefono: alumnoInicial?.telefono || '',
      email: alumnoInicial?.email || '',
      fechaNacimiento: alumnoInicial?.fechaNacimiento || '',
      tutor: alumnoInicial?.tutor || '',
      descuento: alumnoInicial?.descuento || 0,
      notasInternas: alumnoInicial?.notasInternas || '',
      observaciones: alumnoInicial?.observaciones || '',
      modalidad: 'Presencial',
      diaPago: 1,
      fechaInicioPago: new Date().toISOString().split('T')[0],
      duracionClase: '2 horas',
    }
  });

  const idCursoSeleccionado = watch('idCurso');
  const idProfesorSeleccionado = watch('idProfesor');
  const diaClaseSeleccionado = watch('diaClase');
  const horaClaseSeleccionada = watch('horaClase');

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resCursos, resProfesores, resGrupos] = await Promise.all([
          apiFetch('/cursos'),
          apiFetch('/profesores'),
          apiFetch('/grupos/con-ocupacion')
        ]);
        const cursosData = await resCursos.json();
        const profesoresData = await resProfesores.json();
        const gruposData = await resGrupos.json();
        setCursos(cursosData);
        setProfesores(profesoresData);
        setGrupos(gruposData);
      } catch (error) {
        toast.error('Error al cargar datos iniciales');
      }
    };
    cargarDatos();
  }, []);

  // Auto-completar grupo
  useEffect(() => {
    if (idCursoSeleccionado && idProfesorSeleccionado && diaClaseSeleccionado && horaClaseSeleccionada) {
      const grupoEncontrado = grupos.find(g => 
        g.idCurso === idCursoSeleccionado &&
        g.idProfesor === idProfesorSeleccionado &&
        g.diaClase === diaClaseSeleccionado &&
        g.horaClase === horaClaseSeleccionada
      );
      if (grupoEncontrado) {
        setValue('grupoId', grupoEncontrado.IdGrupo);
        setValue('duracionClase', grupoEncontrado.duracionClase || '2 horas');
      } else {
        setValue('grupoId', '');
      }
    }
  }, [idCursoSeleccionado, idProfesorSeleccionado, diaClaseSeleccionado, horaClaseSeleccionada, grupos, setValue]);

  const onSubmit = async (data: InscripcionFormData) => {
    setCargando(true);
    try {
      // Si es alumno existente, solo creamos la inscripción
      if (alumnoInicial) {
        let grupoId = data.grupoId;
        if (!grupoId) {
          const nuevoGrupo = await apiFetch('/grupos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idCurso: data.idCurso,
              nombreCurso: cursos.find(c => c.idCurso === data.idCurso)?.nombreCurso || '',
              diaClase: data.diaClase,
              horaClase: data.horaClase,
              duracionClase: data.duracionClase,
              idProfesor: data.idProfesor,
              nombreProfesor: profesores.find(p => p.idProfesor === data.idProfesor)?.nombre || '',
              capacidadMaxima: 20,
              Estatus: 'Activo'
            })
          });
          const grupoCreado = await nuevoGrupo.json();
          grupoId = grupoCreado.IdGrupo;
        }

        const res = await apiFetch('/inscripciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idAlumno: alumnoInicial.idAlumno,
            nombreAlumno: alumnoInicial.nombreAlumno,
            grupoId: grupoId,
            modalidad: data.modalidad,
            montoMensualidad: data.montoMensualidad,
            diaPago: data.diaPago,
            fechaInicioPago: data.fechaInicioPago,
            comentarios: data.comentarios || '',
            estatus: 'Activa',
            fechaInscripcion: new Date().toISOString()
          })
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error al crear inscripción');
        }

        toast.success('🎉 ¡Curso agregado correctamente!');
        onSuccess();
        onClose();
        return;
      }

      // Si es alumno nuevo
      const cursoNombre = cursos.find(c => c.idCurso === data.idCurso)?.nombreCurso || '';
      const profesorNombre = profesores.find(p => p.idProfesor === data.idProfesor)?.nombre || '';

      let grupoId = data.grupoId;
      if (!grupoId) {
        const nuevoGrupo = await apiFetch('/grupos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idCurso: data.idCurso,
            nombreCurso: cursoNombre,
            diaClase: data.diaClase,
            horaClase: data.horaClase,
            duracionClase: data.duracionClase,
            idProfesor: data.idProfesor,
            nombreProfesor: profesorNombre,
            capacidadMaxima: 20,
            Estatus: 'Activo'
          })
        });
        const grupoCreado = await nuevoGrupo.json();
        grupoId = grupoCreado.IdGrupo;
      }

      const res = await apiFetch('/grupos/crear-con-alumno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaInscripcion: new Date().toISOString(),
          grupo: {
            idCurso: data.idCurso,
            nombreCurso: cursoNombre,
            diaClase: data.diaClase,
            horaClase: data.horaClase,
            duracionClase: data.duracionClase,
            idProfesor: data.idProfesor,
            nombreProfesor: profesorNombre,
            comentario: '',
            capacidadMaxima: 20,
            Estatus: 'Activo'
          },
          alumnoNuevo: {
            nombreAlumno: data.nombreAlumno,
            telefono: data.telefono || '',
            email: data.email || '',
            fechaNacimiento: data.fechaNacimiento || null,
            tutor: data.tutor || '',
            descuento: data.descuento || 0,
            notasInternas: data.notasInternas || '',
            observaciones: data.observaciones || '',
            estatus: 'Activo',
            modalidad: data.modalidad
          },
          datosPago: {
            montoMensualidad: data.montoMensualidad,
            diaPago: data.diaPago,
            fechaInicioPago: data.fechaInicioPago,
            comentarios: data.comentarios || ''
          }
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al inscribir alumno');
      }

      toast.success('🎉 ¡Alumno inscrito correctamente!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('❌ ' + (error.message || 'Error al procesar la inscripción'));
    } finally {
      setCargando(false);
    }
  };

  const nextStep = () => setPaso(paso + 1);
  const prevStep = () => setPaso(paso - 1);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 border-4 border-blue-200 relative">
        {/* Personaje decorativo */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-yellow-300 rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-400">
          <span className="text-4xl">⭐</span>
        </div>
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-green-300 rounded-full flex items-center justify-center shadow-lg border-4 border-green-400">
          <span className="text-3xl">🐉</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {alumnoInicial ? '🌟 Agregar nuevo curso' : '🌟 ¡Inscribir nuevo alumno!'}
          </h2>
          {/* ✅ Botón de cierre con fondo visible */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-200/80 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-xl transition hover:scale-110"
          >
            ✕
          </button>
        </div>

        {/* Pasos visuales */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
                paso >= num ? 'bg-blue-500 scale-110' : 'bg-gray-300'
              }`}
            >
              {num}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* PASO 1: Datos del alumno */}
          {paso === 1 && (
            <div className="space-y-4">
              <div className="bg-yellow-50/70 p-4 rounded-2xl border-2 border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                  <span>🧑‍🎓</span> Datos del alumno
                </h3>
                {!alumnoInicial && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                      <Controller
                        name="nombreAlumno"
                        control={control}
                        rules={{ required: 'Nombre requerido' }}
                        render={({ field }) => (
                          <input
                            {...field}
                            placeholder="Ej: Mateo Goku"
                            className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                          />
                        )}
                      />
                      {errors.nombreAlumno && <p className="text-xs text-rose-500 mt-1">{errors.nombreAlumno.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                      <Controller
                        name="fechaNacimiento"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="date"
                            {...field}
                            className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <Controller
                        name="telefono"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            placeholder="Ej: 55 1234 5678"
                            className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            placeholder="Ej: mateo@email.com"
                            className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tutor</label>
                      <Controller
                        name="tutor"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            placeholder="Nombre del tutor"
                            className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                      <Controller
                        name="descuento"
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            {...field}
                            placeholder="0"
                            className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                          />
                        )}
                      />
                    </div>
                  </div>
                )}
                {alumnoInicial && (
                  <div className="bg-blue-50 p-3 rounded-xl border-2 border-blue-200">
                    <p className="text-sm text-gray-700">🧑‍🎓 Alumno: <span className="font-bold text-blue-600">{alumnoInicial.nombreAlumno}</span></p>
                    <p className="text-sm text-gray-700">ID: <span className="font-mono text-blue-600">{alumnoInicial.idAlumno}</span></p>
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <button type="button" onClick={nextStep} className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium">
                    Siguiente ➜
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: Datos del curso */}
          {paso === 2 && (
            <div className="space-y-4">
              <div className="bg-pink-50/70 p-4 rounded-2xl border-2 border-pink-200">
                <h3 className="text-lg font-semibold text-pink-700 mb-3 flex items-center gap-2">
                  <span>📚</span> Datos del curso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
                    <Controller
                      name="idCurso"
                      control={control}
                      rules={{ required: 'Curso requerido' }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border-2 border-pink-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80"
                        >
                          <option value="">Seleccionar curso</option>
                          {cursos.map(c => (
                            <option key={c.idCurso} value={c.idCurso}>{c.nombreCurso}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.idCurso && <p className="text-xs text-rose-500 mt-1">{errors.idCurso.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profesor *</label>
                    <Controller
                      name="idProfesor"
                      control={control}
                      rules={{ required: 'Profesor requerido' }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border-2 border-pink-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80"
                        >
                          <option value="">Seleccionar profesor</option>
                          {profesores.map(p => (
                            <option key={p.idProfesor} value={p.idProfesor}>{p.nombre}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.idProfesor && <p className="text-xs text-rose-500 mt-1">{errors.idProfesor.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Día de clase *</label>
                    <Controller
                      name="diaClase"
                      control={control}
                      rules={{ required: 'Día requerido' }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border-2 border-pink-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80"
                        >
                          <option value="">Seleccionar día</option>
                          {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.diaClase && <p className="text-xs text-rose-500 mt-1">{errors.diaClase.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora de clase *</label>
                    <Controller
                      name="horaClase"
                      control={control}
                      rules={{ required: 'Hora requerida' }}
                      render={({ field }) => (
                        <input
                          type="time"
                          {...field}
                          className="w-full border-2 border-pink-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80"
                        />
                      )}
                    />
                    {errors.horaClase && <p className="text-xs text-rose-500 mt-1">{errors.horaClase.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                    <Controller
                      name="duracionClase"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border-2 border-pink-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80"
                        >
                          <option value="1 hora">1 hora</option>
                          <option value="1:30 hr">1:30 horas</option>
                          <option value="2 horas">2 horas</option>
                          <option value="2:30 hr">2:30 horas</option>
                          <option value="3 horas">3 horas</option>
                        </select>
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
                    <Controller
                      name="modalidad"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full border-2 border-pink-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80"
                        >
                          <option value="Presencial">Presencial</option>
                          <option value="Virtual">Virtual</option>
                        </select>
                      )}
                    />
                  </div>
                </div>
                {watch('grupoId') && (
                  <div className="mt-3 bg-emerald-50 p-2 rounded-xl border-2 border-emerald-200">
                    <p className="text-sm text-emerald-700">✅ ¡Grupo existente encontrado! ID: <span className="font-mono">{watch('grupoId')}</span></p>
                  </div>
                )}
                <div className="flex justify-between mt-4">
                  <button type="button" onClick={prevStep} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors font-medium">
                    ← Anterior
                  </button>
                  <button type="button" onClick={nextStep} className="px-6 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors font-medium">
                    Siguiente ➜
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Datos de pago y confirmación */}
          {paso === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50/70 p-4 rounded-2xl border-2 border-green-200">
                <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                  <span>💰</span> Datos de pago
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto mensual *</label>
                    <Controller
                      name="montoMensualidad"
                      control={control}
                      rules={{ required: 'Monto requerido', min: 1 }}
                      render={({ field }) => (
                        <input
                          type="number"
                          {...field}
                          placeholder="0"
                          className="w-full border-2 border-green-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white/80"
                        />
                      )}
                    />
                    {errors.montoMensualidad && <p className="text-xs text-rose-500 mt-1">{errors.montoMensualidad.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Día de pago *</label>
                    <Controller
                      name="diaPago"
                      control={control}
                      rules={{ required: 'Día requerido', min: 1, max: 31 }}
                      render={({ field }) => (
                        <input
                          type="number"
                          {...field}
                          className="w-full border-2 border-green-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white/80"
                          min="1"
                          max="31"
                        />
                      )}
                    />
                    {errors.diaPago && <p className="text-xs text-rose-500 mt-1">{errors.diaPago.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio pago *</label>
                    <Controller
                      name="fechaInicioPago"
                      control={control}
                      rules={{ required: 'Fecha requerida' }}
                      render={({ field }) => (
                        <input
                          type="date"
                          {...field}
                          className="w-full border-2 border-green-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white/80"
                        />
                      )}
                    />
                    {errors.fechaInicioPago && <p className="text-xs text-rose-500 mt-1">{errors.fechaInicioPago.message}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios</label>
                  <Controller
                    name="comentarios"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        placeholder="Notas adicionales"
                        className="w-full border-2 border-green-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white/80"
                      />
                    )}
                  />
                </div>
                <div className="flex justify-between mt-4">
                  <button type="button" onClick={prevStep} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors font-medium">
                    ← Anterior
                  </button>
                  <button
                    type="submit"
                    disabled={cargando}
                    className={`px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-bold text-lg shadow-lg ${cargando ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  >
                    {cargando ? '⏳ Guardando...' : (alumnoInicial ? '✨ Agregar curso' : '🎉 Inscribir alumno')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default InscripcionForm;