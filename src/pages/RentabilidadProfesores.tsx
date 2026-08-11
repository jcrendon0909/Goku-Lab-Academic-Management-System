import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { toast } from 'sonner';
import BackgroundVideo from '../app/components/BackgroundVideo';

interface GrupoRentabilidad {
  idGrupo: string;
  nombreCurso: string;
  ingresosGrupo: number;
  cantidadAlumnos: number;
}

interface ProfesorRentabilidad {
  idProfesor: string;
  nombre: string;
  ingresos: number;
  costo: number;
  utilidad: number;
  porcentaje: number;
  cantidadGrupos: number;
  cantidadAlumnos: number;
  grupos: GrupoRentabilidad[];
}

export default function RentabilidadProfesores() {
  const [data, setData] = useState<ProfesorRentabilidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [resumen, setResumen] = useState({
    totalIngresos: 0,
    totalCostos: 0,
    totalUtilidad: 0,
    promedioMargen: 0,
  });

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (mes) params.append('mes', mes);
      if (anio) params.append('anio', anio);
      const res = await apiFetch(`/reportes/rentabilidad-profesores?${params.toString()}`);
      const data = await res.json();

      // data es un array de profesores
      setData(data);

      // Calcular resumen general
      const totalIngresos = data.reduce((sum: number, p: ProfesorRentabilidad) => sum + (p.ingresos || 0), 0);
      const totalCostos = data.reduce((sum: number, p: ProfesorRentabilidad) => sum + (p.costo || 0), 0);
      const totalUtilidad = data.reduce((sum: number, p: ProfesorRentabilidad) => sum + (p.utilidad || 0), 0);
      const promedioMargen = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;

      setResumen({ totalIngresos, totalCostos, totalUtilidad, promedioMargen });
    } catch (error) {
      toast.error('Error al cargar rentabilidad');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const formatearMonto = (monto: number) => {
    return monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#1E293B] mx-auto mb-4"></div>
          <p className="text-lg font-bold">📊 Calculando rentabilidad...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BackgroundVideo videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4" decorativeVideos={[]}>
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
          {/* Cabecera con filtros (sin cambios) */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3 flex-shrink-0">
            <h1 className="text-lg md:text-xl font-extrabold text-white drop-shadow-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#1E293B] to-[#334155] p-1.5 rounded-full shadow-lg text-sm inline-flex items-center justify-center w-8 h-8">
                📈
              </span>
              <span className="bg-gradient-to-r from-[#CBD5E1] via-[#94A3B8] to-[#F8B50E] text-transparent bg-clip-text">
                Rentabilidad de Profesores
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                <span className="text-white text-xs font-medium">📅</span>
                <input
                  type="number"
                  placeholder="Mes"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-12 bg-transparent text-white placeholder-white/60 text-sm focus:outline-none"
                  min="1"
                  max="12"
                />
                <span className="text-white/40">/</span>
                <input
                  type="number"
                  placeholder="Año"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  className="w-16 bg-transparent text-white placeholder-white/60 text-sm focus:outline-none"
                  min="2020"
                />
              </div>
              <button
                onClick={cargarDatos}
                className="px-4 py-1.5 bg-gradient-to-r from-[#1E293B] to-[#334155] text-white rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5"
              >
                <span>🔍</span> Filtrar
              </button>
              <button
                onClick={() => { setMes(''); setAnio(''); cargarDatos(); }}
                className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/30 transition-all border border-white/20"
              >
                <span>↺</span> Limpiar
              </button>
            </div>
          </div>

          {/* Resumen general (sin cambios) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
            <div className="bg-gradient-to-br from-[#1E293B] to-[#334155] p-4 rounded-2xl shadow-lg text-white">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total Ingresos</p>
              <p className="text-2xl font-bold mt-1">${formatearMonto(resumen.totalIngresos)}</p>
              <p className="text-xs opacity-60 mt-1">{data.length} profesores</p>
            </div>
            <div className="bg-gradient-to-br from-[#475569] to-[#64748B] p-4 rounded-2xl shadow-lg text-white">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total Costos</p>
              <p className="text-2xl font-bold mt-1">${formatearMonto(resumen.totalCostos)}</p>
              <p className="text-xs opacity-60 mt-1">Pagos reales a profesores</p>
            </div>
            <div className={`bg-gradient-to-br p-4 rounded-2xl shadow-lg text-white ${resumen.totalUtilidad >= 0 ? 'from-emerald-600 to-emerald-800' : 'from-rose-600 to-rose-800'}`}>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Utilidad Neta</p>
              <p className="text-2xl font-bold mt-1">${formatearMonto(resumen.totalUtilidad)}</p>
              <p className="text-xs opacity-60 mt-1">Ingresos - Costos</p>
            </div>
            <div className="bg-gradient-to-br from-[#F8B50E] to-[#F59E0B] p-4 rounded-2xl shadow-lg text-gray-900">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Margen Promedio</p>
              <p className="text-2xl font-bold mt-1">{resumen.promedioMargen.toFixed(1)}%</p>
              <p className="text-xs opacity-70 mt-1">Promedio general</p>
            </div>
          </div>

          {/* Lista de profesores con tarjetas mejoradas */}
          {data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/80 text-lg">
              🧐 No hay datos para el período seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto pr-1 pb-4">
              {data.map((prof) => (
                <div
                  key={prof.idProfesor}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 hover:shadow-xl transition-all duration-200 flex flex-col max-h-[420px] overflow-hidden"
                >
                  {/* Encabezado del profesor - fijo */}
                  <div className="p-4 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E293B] to-[#334155] flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                        {prof.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{prof.nombre}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>📚 {prof.cantidadGrupos} grupos</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>👨‍🎓 {prof.cantidadAlumnos} alumnos</span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${prof.porcentaje >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {prof.porcentaje.toFixed(0)}%
                      </div>
                    </div>

                    {/* Métricas rápidas */}
                    <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-1.5">
                        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Ingresos</p>
                        <p className="text-sm font-bold text-emerald-600">${formatearMonto(prof.ingresos)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-1.5">
                        <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Costo</p>
                        <p className="text-sm font-bold text-rose-600">${formatearMonto(prof.costo)}</p>
                      </div>
                    </div>

                    {/* Barra de margen */}
                    <div className="mt-2 w-full bg-gray-200/50 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          prof.porcentaje >= 20 ? 'bg-emerald-500' :
                          prof.porcentaje >= 10 ? 'bg-yellow-500' :
                          prof.porcentaje >= 0 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(Math.max(prof.porcentaje, 0), 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Lista de grupos - scrolleable */}
                  <div className="flex-1 overflow-y-auto p-3 pt-2 space-y-1.5">
                    {prof.grupos.length > 0 ? (
                      <>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider sticky top-0 bg-white/80 backdrop-blur-sm py-1">
                          Grupos
                        </p>
                        {prof.grupos.map((grupo) => (
                          <div
                            key={grupo.idGrupo}
                            className="flex items-center justify-between bg-gray-50/80 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            <span className="text-xs font-medium text-gray-700 truncate mr-2">
                              {grupo.nombreCurso}
                            </span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-[10px] text-gray-500">
                                {grupo.cantidadAlumnos} {grupo.cantidadAlumnos === 1 ? 'alumno' : 'alumnos'}
                              </span>
                              <span className="text-[10px] font-semibold text-emerald-600">
                                ${formatearMonto(grupo.ingresosGrupo)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 italic text-center py-2">Sin grupos asignados</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex justify-between items-center text-xs text-white/60 flex-shrink-0">
            <span>📋 {data.length} profesores</span>
            <span>Última actualización: {new Date().toLocaleString()}</span>
          </div>
        </div>
      </BackgroundVideo>
    </>
  );
}