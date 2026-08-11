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
  grupoId: string;
  idProfesor?: string;
  diaClase?: string;
  horaClase?: string;
  duracionClase?: string;
  modalidad: string;
  montoMensualidad: number;
  diaPago: number;
  fechaInicioPago: string;
  fechaInscripcion: string;
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
  const [gruposFiltrados, setGruposFiltrados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [paso, setPaso] = useState(1);
  const [crearNuevoGrupo, setCrearNuevoGrupo] = useState(false);

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
      diaPago: 5,
      fechaInicioPago: new Date().toISOString().split('T')[0],
      fechaInscripcion: new Date().toISOString().split('T')[0],
      duracionClase: '2 horas',
      grupoId: '',
      idCurso: '',
      idProfesor: '',
      diaClase: '',
      horaClase: '',
      montoMensualidad: 0, // ← inicialmente 0, se actualizará al seleccionar curso
    }
  });

  const idCursoSeleccionado = watch('idCurso');
  const grupoIdSeleccionado = watch('grupoId');
  const montoMensualidadWatch = watch('montoMensualidad');

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
        if (idCursoSeleccionado) {
          const filtrados = gruposData.filter((g: any) => g.idCurso === idCursoSeleccionado);
          setGruposFiltrados(filtrados);
        }
      } catch (error) {
        toast.error('Error al cargar datos iniciales');
      }
    };
    cargarDatos();
  }, []);

  // Filtrar grupos cuando cambia el curso
  useEffect(() => {
    if (idCursoSeleccionado) {
      const filtrados = grupos.filter(g => g.idCurso === idCursoSeleccionado);
      setGruposFiltrados(filtrados);
      if (filtrados.length > 0) {
        setValue('grupoId', filtrados[0].IdGrupo);
      } else {
        setValue('grupoId', '');
        setCrearNuevoGrupo(true);
      }
    } else {
      setGruposFiltrados([]);
      setValue('grupoId', '');
    }
  }, [idCursoSeleccionado, grupos, setValue]);

  // ✅ NUEVO: Cuando se selecciona un curso, actualizar el monto mensual con el precio del curso (solo si está vacío o es 0)
  useEffect(() => {
    if (idCursoSeleccionado) {
      const curso = cursos.find(c => c.idCurso === idCursoSeleccionado);
      if (curso && curso.precioMensualidad) {
        const currentValue = watch('montoMensualidad');
        // Si el campo está vacío o es 0, establecer el precio del curso
        if (!currentValue || currentValue === 0) {
          setValue('montoMensualidad', curso.precioMensualidad);
          console.log(`💰 Precio del curso establecido: ${curso.precioMensualidad}`);
        }
      }
    }
  }, [idCursoSeleccionado, cursos, setValue, watch]);

  // ✅ NUEVO: Log para ver el valor del campo montoMensualidad cuando cambia
  useEffect(() => {
    console.log(`🔄 Monto mensual actual: ${montoMensualidadWatch}`);
  }, [montoMensualidadWatch]);

  const onSubmit = async (data: InscripcionFormData) => {
    setCargando(true);
    try {
      let alumnoId = data.idAlumno;

      // === PASO 1: Si es alumno NUEVO, lo creamos primero ===
      if (!alumnoInicial) {
        const resAlumno = await apiFetch('/alumnos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          })
        });

        if (!resAlumno.ok) {
          const error = await resAlumno.json();
          throw new Error(error.error || 'Error al crear el alumno');
        }

        const alumnoCreado = await resAlumno.json();
        alumnoId = alumnoCreado.idAlumno || alumnoCreado._id;
      }

      // === PASO 2: Obtener o crear el grupo ===
      let grupoId = data.grupoId;
      if (!grupoId || crearNuevoGrupo) {
        const cursoNombre = cursos.find(c => c.idCurso === data.idCurso)?.nombreCurso || '';
        const profesorNombre = profesores.find(p => p.idProfesor === data.idProfesor)?.nombre || '';

        const resGrupo = await apiFetch('/grupos', {
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
            Estatus: 'Activo',
            precioMensualidad: data.montoMensualidad
          })
        });

        if (!resGrupo.ok) {
          const error = await resGrupo.json();
          throw new Error(error.error || 'Error al crear el grupo');
        }

        const grupoCreado = await resGrupo.json();
        grupoId = grupoCreado.IdGrupo || grupoCreado._id;
      }

      // === PASO 3: Crear la inscripción ===
      const payload = {
        idAlumno: alumnoId,
        nombreAlumno: data.nombreAlumno || alumnoInicial?.nombreAlumno || '',
        grupoId: grupoId,
        modalidad: data.modalidad,
        montoMensualidad: data.montoMensualidad,
        diaPago: data.diaPago,
        fechaInicioPago: data.fechaInicioPago,
        comentarios: data.comentarios || '',
        estatus: 'Activa',
        fechaInscripcion: data.fechaInscripcion
      };

      // ✅ LOG PARA VER QUÉ SE ESTÁ ENVIANDO
      console.log('📤 Payload a enviar:', {
        ...payload,
        montoMensualidad: payload.montoMensualidad,
        tipo: typeof payload.montoMensualidad
      });

      const res = await apiFetch('/inscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al crear inscripción');
      }

      toast.success('🎉 ¡Inscripción creada correctamente!');
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
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-200/80 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-xl transition hover:scale-110"
          >
            ✕
          </button>
        </div>

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

          {/* PASO 2: Datos del curso y grupo */}
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

                  {idCursoSeleccionado && gruposFiltrados.length > 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grupo existente</label>
                        <Controller
                          name="grupoId"
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="w-full border-2 border-pink-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/80"
                            >
                              <option value="">Seleccionar grupo existente</option>
                              {gruposFiltrados.map(g => (
                                <option key={g.IdGrupo} value={g.IdGrupo}>
                                  {g.IdGrupo} - {g.diaClase} {g.horaClase} (Prof. {g.nombreProfesor}) - {g.alumnosInscritos || 0}/{g.CapacidadMaxima}
                                </option>
                              ))}
                            </select>
                          )}
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="text-sm text-gray-600 mr-2">¿Crear nuevo grupo?</label>
                        <button
                          type="button"
                          onClick={() => setCrearNuevoGrupo(!crearNuevoGrupo)}
                          className="px-3 py-1 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition"
                        >
                          {crearNuevoGrupo ? 'Cancelar' : 'Crear nuevo'}
                        </button>
                      </div>
                    </>
                  )}

                  {(!gruposFiltrados.length || crearNuevoGrupo) && (
                    <>
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
                    </>
                  )}

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
                          value={field.value || ''}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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

                <div className="mt-4 border-t-2 border-dashed border-green-300 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📅 Fecha de inscripción <span className="text-xs text-gray-500">(si es histórica, cámbiala)</span>
                  </label>
                  <Controller
                    name="fechaInscripcion"
                    control={control}
                    rules={{ required: 'Fecha de inscripción requerida' }}
                    render={({ field }) => (
                      <input
                        type="date"
                        {...field}
                        className="w-full border-2 border-green-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white/80"
                      />
                    )}
                  />
                  {errors.fechaInscripcion && <p className="text-xs text-rose-500 mt-1">{errors.fechaInscripcion.message}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Si la inscripción es de un mes anterior, cambia esta fecha. Se generarán automáticamente los pagos desde ese mes.
                  </p>
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