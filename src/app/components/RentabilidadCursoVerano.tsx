import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Users, Calendar, Clock } from 'lucide-react';

interface CostoDetalle {
  idProfesor: string;
  nombre: string;
  total: number;
  dias: number[];
  horasPorDia: number;
  semanas: number;
  totalHoras: number;
  costoHora: number;
}

interface Inscripcion {
  _id: string;
  idAlumno: string;
  nombreAlumno: string;
  montoPago: number;
  semanasPagadas: number;
  fechaInicio: string;
  fechaFin: string;
}

interface RentabilidadData {
  idCursoVerano: string;
  nombre: string;
  modalidad: string;
  año: number;
  ingresosTotales: number;
  costosTotales: number;
  ganancia: number;
  numeroAlumnos: number;
  costosDetalle: CostoDetalle[];
  inscripciones?: Inscripcion[];
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function RentabilidadCursoVerano() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RentabilidadData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarRentabilidad = async () => {
      if (!id) return;
      try {
        setCargando(true);
        const res = await apiFetch(`/cursos-verano/${id}/rentabilidad`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error al cargar rentabilidad');
        }
        const data = await res.json();
        setData({ ...data, inscripciones: data.inscripciones || [] });
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message);
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    cargarRentabilidad();
  }, [id]);

  const decorativeVideos = [
    { src: 'https://media.gokulab.mx/Galery/videos/lummyanimado.mp4', position: 'top-left' as const },
    { src: 'https://media.gokulab.mx/Galery/videos/codyanimado.mp4', position: 'top-right' as const },
    { src: 'https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4', position: 'bottom-left' as const },
    { src: 'https://media.gokulab.mx/Galery/videos/lummyanimado.mp4', position: 'bottom-right' as const },
  ];

  if (cargando) {
    return (
      <BackgroundVideo videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4" decorativeVideos={decorativeVideos}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">⏳ Cargando rentabilidad...</div>
        </div>
      </BackgroundVideo>
    );
  }

  if (error || !data) {
    return (
      <BackgroundVideo videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4" decorativeVideos={decorativeVideos}>
        <div className="p-8 text-center text-red-500">
          <p className="text-xl">❌ Error al cargar los datos</p>
          <p className="text-sm mt-2">{error || 'No se encontraron datos'}</p>
          <Link to="/cursos-verano" className="mt-4 inline-block text-white hover:text-yellow-300 transition">
            ← Volver a la lista
          </Link>
        </div>
      </BackgroundVideo>
    );
  }

  const { ingresosTotales, costosTotales, ganancia, numeroAlumnos, costosDetalle, inscripciones = [] } = data;
  const esGanancia = ganancia >= 0;

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      <div className="p-4 md:p-6 w-full max-w-6xl mx-auto">
        <Link
          to="/cursos-verano"
          className="inline-flex items-center gap-2 text-white hover:text-yellow-300 transition-colors mb-4 group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver a la lista</span>
        </Link>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-yellow-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 Rentabilidad: {data.nombre}</h1>
          <p className="text-sm text-gray-600">
            {data.modalidad === 'verano' ? '☀️ Verano' : '🌊 Preverano'} - {data.año}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ingresos</p>
                <p className="text-2xl font-bold text-green-600">${ingresosTotales.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Costos</p>
                <p className="text-2xl font-bold text-red-600">${costosTotales.toFixed(2)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className={`bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border-2 ${esGanancia ? 'border-emerald-200' : 'border-rose-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ganancia</p>
                <p className={`text-2xl font-bold ${esGanancia ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${ganancia.toFixed(2)}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${esGanancia ? 'text-emerald-500' : 'text-rose-500'}`} />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-lg border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Alumnos</p>
                <p className="text-2xl font-bold text-blue-600">{numeroAlumnos}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {costosDetalle && costosDetalle.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-blue-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Costos por profesor
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Profesor</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Días</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Horas/día</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Semanas</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Total horas</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Costo/hora</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costosDetalle.map((prof) => (
                    <tr key={prof.idProfesor} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{prof.nombre}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {prof.dias.map(d => DIAS_SEMANA[d]).join(', ')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{prof.horasPorDia}h</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{prof.semanas}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{prof.totalHoras}h</td>
                      <td className="px-4 py-2 text-sm text-gray-600">${prof.costoHora}/h</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-bold">${prof.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">Total costos:</td>
                    <td className="px-4 py-2 text-sm font-bold text-red-600 text-right">${costosTotales.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {inscripciones && inscripciones.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-green-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Inscripciones ({inscripciones.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Alumno</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Monto</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Semanas</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Inicio</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-700 uppercase">Fin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inscripciones.map((ins) => (
                    <tr key={ins._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{ins.nombreAlumno}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">${ins.montoPago.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{ins.semanasPagadas}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{new Date(ins.fechaInicio).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{new Date(ins.fechaFin).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={1} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">Total ingresos:</td>
                    <td className="px-4 py-2 text-sm font-bold text-green-600">${ingresosTotales.toFixed(2)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </BackgroundVideo>
  );
}