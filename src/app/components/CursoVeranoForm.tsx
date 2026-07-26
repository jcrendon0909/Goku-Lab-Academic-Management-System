import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { ArrowLeft, Save, X, Sun } from 'lucide-react';

interface CursoVeranoFormData {
  nombre: string;
  modalidad: 'verano' | 'preverano';
  año: number;
  fechaInicio: string;
  fechaFin: string;
  descripcion: string;
  profesorPrincipal: string;
}

interface Profesor {
  idProfesor: string;
  nombre: string;
}

export function CursoVeranoForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [esEdicion, setEsEdicion] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CursoVeranoFormData>({
    defaultValues: {
      modalidad: 'verano',
      año: new Date().getFullYear(),
      fechaInicio: '',
      fechaFin: '',
      descripcion: '',
      profesorPrincipal: '',
    }
  });

  useEffect(() => {
    const cargarProfesores = async () => {
      try {
        const res = await apiFetch('/profesores');
        if (!res.ok) throw new Error('Error al cargar profesores');
        const data = await res.json();
        setProfesores(data);
      } catch (error) {
        toast.error('Error al cargar profesores');
        console.error(error);
      }
    };
    cargarProfesores();
  }, []);

  useEffect(() => {
    if (id) {
      setEsEdicion(true);
      const cargarCurso = async () => {
        setCargandoDatos(true);
        try {
          const res = await apiFetch(`/cursos-verano/${id}`);
          if (!res.ok) throw new Error('Error al cargar curso');
          const data = await res.json();
          reset({
            nombre: data.nombre,
            modalidad: data.modalidad,
            año: data.año,
            fechaInicio: data.fechaInicio.split('T')[0],
            fechaFin: data.fechaFin.split('T')[0],
            descripcion: data.descripcion || '',
            profesorPrincipal: data.profesorPrincipal || '',
          });
        } catch (error) {
          toast.error('Error al cargar curso');
          console.error(error);
          navigate('/cursos-verano');
        } finally {
          setCargandoDatos(false);
        }
      };
      cargarCurso();
    }
  }, [id, reset, navigate]);

  const onSubmit = async (data: CursoVeranoFormData) => {
    setCargando(true);
    try {
      const payload = {
        ...data,
        año: parseInt(data.año as any),
        fechaInicio: new Date(data.fechaInicio).toISOString(),
        fechaFin: new Date(data.fechaFin).toISOString(),
      };

      const url = esEdicion ? `/cursos-verano/${id}` : '/cursos-verano';
      const method = esEdicion ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar curso');
      }

      toast.success(esEdicion ? '✅ Curso actualizado' : '✅ Curso creado');
      navigate('/cursos-verano');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  const decorativeVideos = [
    { src: 'https://media.gokulab.mx/Galery/videos/lummyanimado.mp4', position: 'top-left' as const },
    { src: 'https://media.gokulab.mx/Galery/videos/codyanimado.mp4', position: 'top-right' as const },
    { src: 'https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4', position: 'bottom-left' as const },
    { src: 'https://media.gokulab.mx/Galery/videos/lummyanimado.mp4', position: 'bottom-right' as const },
  ];

  if (cargandoDatos) {
    return (
      <BackgroundVideo videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4" decorativeVideos={decorativeVideos}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">⏳ Cargando curso...</div>
        </div>
      </BackgroundVideo>
    );
  }

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      <div className="p-4 md:p-6 w-full max-w-3xl mx-auto">
        <Link
          to="/cursos-verano"
          className="inline-flex items-center gap-2 text-white hover:text-yellow-300 transition-colors mb-4 group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver a la lista</span>
        </Link>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-yellow-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-yellow-300 p-3 rounded-full shadow-lg">
              <Sun className="h-8 w-8 text-yellow-800" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {esEdicion ? '✏️ Editar Curso de Verano' : '☀️ Nuevo Curso de Verano'}
              </h1>
              <p className="text-sm text-gray-600">
                {esEdicion ? 'Actualiza la información del curso' : 'Registra un nuevo curso de verano'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del curso <span className="text-red-500">*</span>
              </label>
              <input
                {...register('nombre', { required: 'El nombre es obligatorio' })}
                placeholder="Ej: Aventura de Verano 2026"
                className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
              />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modalidad <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('modalidad', { required: 'Modalidad requerida' })}
                  className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                >
                  <option value="verano">☀️ Verano</option>
                  <option value="preverano">🌊 Preverano</option>
                </select>
                {errors.modalidad && <p className="text-xs text-red-500 mt-1">{errors.modalidad.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Año <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  {...register('año', { 
                    required: 'Año requerido',
                    min: { value: 2000, message: 'Año mínimo 2000' },
                    max: { value: 2100, message: 'Año máximo 2100' }
                  })}
                  className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                />
                {errors.año && <p className="text-xs text-red-500 mt-1">{errors.año.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('fechaInicio', { required: 'Fecha de inicio requerida' })}
                  className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                />
                {errors.fechaInicio && <p className="text-xs text-red-500 mt-1">{errors.fechaInicio.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('fechaFin', { required: 'Fecha de fin requerida' })}
                  className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
                />
                {errors.fechaFin && <p className="text-xs text-red-500 mt-1">{errors.fechaFin.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profesor principal
              </label>
              <select
                {...register('profesorPrincipal')}
                className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
              >
                <option value="">Seleccionar profesor</option>
                {profesores.map((p) => (
                  <option key={p.idProfesor} value={p.idProfesor}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                {...register('descripcion')}
                rows={3}
                placeholder="Descripción del curso (opcional)"
                className="w-full border-2 border-yellow-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80 resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-yellow-200">
              <button
                type="submit"
                disabled={cargando}
                className={`px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl hover:scale-105 transition-all font-bold shadow-lg flex items-center gap-2 ${
                  cargando ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {cargando ? (
                  '⏳ Guardando...'
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {esEdicion ? 'Actualizar' : 'Crear'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/cursos-verano')}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium flex items-center gap-2"
              >
                <X className="h-5 w-5" />
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </BackgroundVideo>
  );
}