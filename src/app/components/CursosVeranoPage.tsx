import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { Plus, Users, DollarSign, Edit, Trash2 } from 'lucide-react';

interface CursoVerano {
  idCursoVerano: string;
  nombre: string;
  modalidad: 'verano' | 'preverano';
  año: number;
  fechaInicio: string;
  fechaFin: string;
  descripcion: string;
  estatus: 'activo' | 'finalizado' | 'cancelado';
  profesorPrincipal: string;
}

export function CursosVeranoPage() {
  const [cursos, setCursos] = useState<CursoVerano[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarCursos = async () => {
    try {
      setCargando(true);
      const res = await apiFetch('/cursos-verano');
      if (!res.ok) throw new Error('Error al cargar cursos');
      const data = await res.json();
      setCursos(data);
    } catch (error) {
      toast.error('Error al cargar cursos de verano');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  const cambiarEstatus = async (id: string, nuevoEstatus: string) => {
    try {
      const res = await apiFetch(`/cursos-verano/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus })
      });
      if (!res.ok) throw new Error('Error al cambiar estatus');
      toast.success(`Curso ${nuevoEstatus === 'finalizado' ? 'finalizado' : 'activado'}`);
      cargarCursos();
    } catch (error) {
      toast.error('Error al cambiar estatus');
      console.error(error);
    }
  };

  const eliminarCurso = async (id: string) => {
    if (!confirm('¿Eliminar este curso? (Solo si no tiene alumnos inscritos)')) return;
    try {
      const res = await apiFetch(`/cursos-verano/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al eliminar');
      }
      toast.success('Curso eliminado');
      cargarCursos();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  // ✅ Eliminar videos decorativos - array vacío
  const decorativeVideos: { src: string; position: any }[] = [];

  if (cargando) {
    return <div className="p-8 text-center text-gray-500">⏳ Cargando cursos de verano...</div>;
  }

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/codyanimado.mp4"  // ✅ Nuevo video de fondo
      decorativeVideos={decorativeVideos}  // ✅ Sin videos decorativos
    >
      <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg flex items-center gap-2">
            <span className="bg-yellow-300 p-2 rounded-full shadow-lg">☀️</span>
            Cursos de Verano
          </h1>
          <Link
            to="/cursos-verano/nuevo"
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl hover:scale-105 transition-all font-bold shadow-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Curso
          </Link>
        </div>

        {cursos.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border-2 border-yellow-200">
            <p className="text-2xl text-gray-600">🏖️ No hay cursos de verano registrados</p>
            <p className="text-sm text-gray-500 mt-2">¡Crea el primero para empezar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursos.map((curso) => (
              <div
                key={curso.idCursoVerano}
                className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border-2 border-yellow-200 hover:scale-[1.02] transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        curso.modalidad === 'verano' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
                      }`}>
                        {curso.modalidad === 'verano' ? '☀️ Verano' : '🌊 Preverano'}
                      </span>
                      <h2 className="text-xl font-bold text-gray-900 mt-2">{curso.nombre}</h2>
                      <p className="text-sm text-gray-600">📅 {curso.año}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      curso.estatus === 'activo' ? 'bg-green-100 text-green-700' :
                      curso.estatus === 'finalizado' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {curso.estatus === 'activo' ? '✅ Activo' :
                       curso.estatus === 'finalizado' ? '📌 Finalizado' : '⛔ Cancelado'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p>📆 Inicio: {new Date(curso.fechaInicio).toLocaleDateString()}</p>
                    <p>📆 Fin: {new Date(curso.fechaFin).toLocaleDateString()}</p>
                    {curso.profesorPrincipal && (
                      <p>👨‍🏫 Profesor principal: {curso.profesorPrincipal}</p>
                    )}
                    {curso.descripcion && (
                      <p className="text-gray-500 text-xs">{curso.descripcion}</p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/cursos-verano/${curso.idCursoVerano}`}
                      className="px-3 py-1 bg-cyan-500 text-white rounded-lg text-xs font-bold hover:bg-cyan-600 transition"
                    >
                      <Users className="h-3 w-3 inline mr-1" />
                      Alumnos
                    </Link>
                    <Link
                      to={`/cursos-verano/${curso.idCursoVerano}/rentabilidad`}
                      className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition"
                    >
                      <DollarSign className="h-3 w-3 inline mr-1" />
                      Rentabilidad
                    </Link>
                    <Link
                      to={`/cursos-verano/${curso.idCursoVerano}/editar`}
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition"
                    >
                      <Edit className="h-3 w-3 inline mr-1" />
                      Editar
                    </Link>
                    <button
                      onClick={() => cambiarEstatus(curso.idCursoVerano, curso.estatus === 'activo' ? 'finalizado' : 'activo')}
                      className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition"
                    >
                      {curso.estatus === 'activo' ? 'Finalizar' : 'Activar'}
                    </button>
                    <button
                      onClick={() => eliminarCurso(curso.idCursoVerano)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition"
                    >
                      <Trash2 className="h-3 w-3 inline" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BackgroundVideo>
  );
}