import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { ArrowLeft, DollarSign, Users, User, TrendingUp, TrendingDown } from 'lucide-react';

interface RentabilidadData {
  idCursoVerano: string;
  nombre: string;
  ingresos: number;
  costos: number;
  utilidad: number;
  alumnosInscritos: number;
  profesoresAsignados: number;
  detalle: {
    inscripciones: Array<{
      id: string;
      alumno: string;
      monto: number;
      semanas: number;
      fechaInicio: string;
      fechaFin: string;
    }>;
    asignaciones: Array<{
      profesor: string;
      dias: number[];
      horasPorDia: number;
      costoHora: number;
      semanas: number;
      costoTotal: number;
    }>;
  };
}

export function RentabilidadCursoVerano() {
  const { id } = useParams<{ id: string }>();
  const [cargando, setCargando] = useState(true);
  const [data, setData] = useState<RentabilidadData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!id) return;
      try {
        setCargando(true);
        setError(null);
        const res = await apiFetch(`/cursos-verano/${id}/rentabilidad`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error al cargar rentabilidad');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los datos');
        toast.error('Error al cargar rentabilidad');
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [id]);

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
  };

  const decorativeVideos: { src: string; position: any }[] = [];

  if (cargando) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
        <p className="mt-4">Cargando rentabilidad...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>❌ {error}</p>
        <Link to={`/cursos-verano/${id}`} className="mt-4 inline-block text-blue-500 hover:underline">
          Volver al curso
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No se encontraron datos de rentabilidad</p>
      </div>
    );
  }

  const ingresos = data.ingresos || 0;
  const costos = data.costos || 0;
  const utilidad = data.utilidad || 0;
  const alumnosInscritos = data.alumnosInscritos || 0;
  const profesoresAsignados = data.profesoresAsignados || 0;
  const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/codyanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
        <Link
          to={`/cursos-verano/${id}`}
          className="inline-flex items-center gap-2 text-white hover:text-yellow-300 transition-colors mb-4 group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver al curso</span>
        </Link>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border-2 border-yellow-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">💰 Rentabilidad</h1>
          <p className="text-gray-600 mb-6">{data.nombre}</p>

          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-sm text-gray-600">Ingresos</p>
              <p className="text-2xl font-bold text-green-700">{formatearMoneda(ingresos)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-sm text-gray-600">Costos</p>
              <p className="text-2xl font-bold text-red-700">{formatearMoneda(costos)}</p>
            </div>
            <div className={`rounded-xl p-4 border ${utilidad >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className="text-sm text-gray-600">Utilidad</p>
              <p className={`text-2xl font-bold ${utilidad >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {formatearMoneda(utilidad)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-sm text-gray-600">Margen</p>
              <p className="text-2xl font-bold text-purple-700">
                {margen.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Detalle de alumnos */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-green-600" />
              Alumnos inscritos ({alumnosInscritos})
            </h2>
            {data.detalle.inscripciones.length === 0 ? (
              <p className="text-gray-500">No hay alumnos inscritos.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Alumno</th>
                      <th className="px-4 py-2 text-left">Monto</th>
                      <th className="px-4 py-2 text-left">Semanas</th>
                      <th className="px-4 py-2 text-left">Inicio</th>
                      <th className="px-4 py-2 text-left">Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detalle.inscripciones.map((ins) => (
                      <tr key={ins.id} className="border-t border-gray-100">
                        <td className="px-4 py-2">{ins.alumno}</td>
                        <td className="px-4 py-2 font-bold text-green-700">{formatearMoneda(ins.monto)}</td>
                        <td className="px-4 py-2">{ins.semanas}</td>
                        <td className="px-4 py-2">{new Date(ins.fechaInicio).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{new Date(ins.fechaFin).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detalle de profesores */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-blue-600" />
              Profesores asignados ({profesoresAsignados})
            </h2>
            {data.detalle.asignaciones.length === 0 ? (
              <p className="text-gray-500">No hay profesores asignados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Profesor</th>
                      <th className="px-4 py-2 text-left">Días</th>
                      <th className="px-4 py-2 text-left">Horas/día</th>
                      <th className="px-4 py-2 text-left">Costo/hora</th>
                      <th className="px-4 py-2 text-left">Semanas</th>
                      <th className="px-4 py-2 text-left">Costo total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.detalle.asignaciones.map((asig, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="px-4 py-2">{asig.profesor}</td>
                        <td className="px-4 py-2">{asig.dias.join(', ')}</td>
                        <td className="px-4 py-2">{asig.horasPorDia}</td>
                        <td className="px-4 py-2">{formatearMoneda(asig.costoHora)}</td>
                        <td className="px-4 py-2">{asig.semanas}</td>
                        <td className="px-4 py-2 font-bold text-red-700">{formatearMoneda(asig.costoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </BackgroundVideo>
  );
}