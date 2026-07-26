import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { toast } from 'sonner';
import BackgroundVideo from '../app/components/BackgroundVideo';

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
  modalidad: string;
}

interface Grupo {
  idGrupo: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  cantidadAlumnos: number;
  montoMensualidad: number;
  alumnos: Alumno[];
}

interface ProfesorRentabilidad {
  idProfesor: string;
  nombre: string;
  totalHorasSemana: number;
  totalHorasMes: number;
  salarioPorHora: number;
  tipoPago: 'por_hora' | 'fijo_mensual';
  salarioMensual: number;
  costo: number;
  ingresos: number;
  utilidad: number;
  porcentaje: number;
  cantidadGrupos: number;
  grupos: Grupo[];
}

interface Resumen {
  totalIngresos: number;
  totalCostos: number;
  totalUtilidad: number;
  promedioMargen: number;
}

export default function RentabilidadProfesores() {
  const [data, setData] = useState<ProfesorRentabilidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [profesorExpandido, setProfesorExpandido] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Resumen>({
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
      const dataConArrays = data.map((prof: any) => ({
        ...prof,
        grupos: Array.isArray(prof.grupos) ? prof.grupos : [],
      }));
      setData(dataConArrays);

      const totalIngresos = dataConArrays.reduce((sum: number, p: ProfesorRentabilidad) => sum + (p.ingresos || 0), 0);
      const totalCostos = dataConArrays.reduce((sum: number, p: ProfesorRentabilidad) => sum + (p.costo || 0), 0);
      const totalUtilidad = dataConArrays.reduce((sum: number, p: ProfesorRentabilidad) => sum + (p.utilidad || 0), 0);
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

  const toggleExpandir = (id: string) => {
    setProfesorExpandido(profesorExpandido === id ? null : id);
  };

  // ✅ Función segura: maneja undefined, null y NaN
  const formatearMonto = (monto: number | undefined | null) => {
    const valor = Number(monto) || 0;
    return valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const decorativeVideos: { src: string; position: any }[] = [];

  return (
    <>
      <BackgroundVideo
        videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4"
        decorativeVideos={decorativeVideos}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
          {/* Cabecera */}
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

          {/* Tarjetas de resumen financiero */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
            <div className="bg-gradient-to-br from-[#1E293B] to-[#334155] p-4 rounded-2xl shadow-lg text-white">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total Ingresos</p>
              <p className="text-2xl font-bold mt-1">${formatearMonto(resumen.totalIngresos)}</p>
              <div className="w-full bg-white/20 h-1 mt-2 rounded-full">
                <div className="bg-emerald-400 h-1 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#475569] to-[#64748B] p-4 rounded-2xl shadow-lg text-white">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total Costos</p>
              <p className="text-2xl font-bold mt-1">${formatearMonto(resumen.totalCostos)}</p>
              <div className="w-full bg-white/20 h-1 mt-2 rounded-full">
                <div className="bg-rose-400 h-1 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className={`bg-gradient-to-br p-4 rounded-2xl shadow-lg text-white ${resumen.totalUtilidad >= 0 ? 'from-emerald-600 to-emerald-800' : 'from-rose-600 to-rose-800'}`}>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Utilidad Neta</p>
              <p className="text-2xl font-bold mt-1">${formatearMonto(resumen.totalUtilidad)}</p>
              <div className="w-full bg-white/20 h-1 mt-2 rounded-full">
                <div className="bg-white/60 h-1 rounded-full" style={{ width: `${Math.min(Math.abs(resumen.promedioMargen), 100)}%` }}></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#F8B50E] to-[#F59E0B] p-4 rounded-2xl shadow-lg text-gray-900">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Margen Promedio</p>
              <p className="text-2xl font-bold mt-1">{resumen.promedioMargen.toFixed(1)}%</p>
              <div className="w-full bg-white/30 h-1 mt-2 rounded-full">
                <div className="bg-[#1E293B] h-1 rounded-full" style={{ width: `${Math.min(Math.abs(resumen.promedioMargen), 100)}%` }}></div>
              </div>
            </div>
          </div>

          {/* Lista de profesores */}
          {data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/80 text-lg">
              🧐 No hay datos para el período seleccionado.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {data.map((prof) => {
                const isExpanded = profesorExpandido === prof.idProfesor;
                const utilidadClass = (prof.utilidad || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';

                return (
                  <div
                    key={prof.idProfesor}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 hover:shadow-xl transition-all duration-200 overflow-hidden"
                  >
                    {/* Encabezado del profesor */}
                    <div
                      className="p-4 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => toggleExpandir(prof.idProfesor)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E293B] to-[#334155] flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {prof.nombre.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{prof.nombre}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{prof.cantidadGrupos || 0} grupos</span>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                prof.tipoPago === 'fijo_mensual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {prof.tipoPago === 'fijo_mensual' ? 'Salario fijo' : 'Por hora'}
                              </span>
                              {prof.tipoPago === 'por_hora' && (
                                <span className="text-gray-400">${formatearMonto(prof.salarioPorHora)}/h</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Ingresos</p>
                            <p className="text-sm font-bold text-emerald-600">${formatearMonto(prof.ingresos)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Costo</p>
                            <p className="text-sm font-bold text-rose-600">${formatearMonto(prof.costo)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Utilidad</p>
                            <p className={`text-sm font-bold ${utilidadClass}`}>${formatearMonto(prof.utilidad)}</p>
                          </div>
                          <div className="text-right min-w-[60px]">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Margen</p>
                            <p className={`text-sm font-bold ${utilidadClass}`}>{prof.porcentaje || 0}%</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Barra de utilidad visual */}
                      <div className="mt-2 w-full bg-gray-200/50 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (prof.porcentaje || 0) >= 20 ? 'bg-emerald-500' :
                            (prof.porcentaje || 0) >= 10 ? 'bg-yellow-500' :
                            (prof.porcentaje || 0) >= 0 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(Math.max(prof.porcentaje || 0, 0), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <div className="p-4 bg-gray-50/80 border-t border-gray-200/50">
                        {prof.grupos.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">📭 Este profesor no tiene grupos asignados.</p>
                        ) : (
                          <div className="space-y-3">
                            {prof.grupos.map((grupo) => {
                              // ✅ Valores seguros
                              const cantidadAlumnos = grupo.cantidadAlumnos || 0;
                              const montoMensualidad = grupo.montoMensualidad || 0;
                              const ingresoGrupo = cantidadAlumnos * montoMensualidad;

                              return (
                                <div key={grupo.idGrupo} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <h4 className="font-bold text-gray-900">{grupo.nombreCurso}</h4>
                                      <p className="text-sm text-gray-500">
                                        📅 {grupo.diaClase} {grupo.horaClase}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-400">Alumnos</p>
                                      <p className="text-sm font-bold text-gray-700">{cantidadAlumnos}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-400">Monto mensual</p>
                                      <p className="text-sm font-bold text-gray-700">${formatearMonto(montoMensualidad)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-gray-400">Ingreso grupo</p>
                                      <p className="text-sm font-bold text-emerald-600">
                                        ${formatearMonto(ingresoGrupo)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Alumnos del grupo */}
                                  {grupo.alumnos && grupo.alumnos.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Alumnos:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {grupo.alumnos.map((alumno) => (
                                          <span
                                            key={alumno.idAlumno}
                                            className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-xs"
                                          >
                                            {alumno.nombreAlumno}
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                              alumno.modalidad === 'Virtual'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                              {alumno.modalidad}
                                            </span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pie de página */}
          <div className="mt-2 flex justify-between items-center text-xs text-white/60 flex-shrink-0">
            <span>📋 {data.length} profesores</span>
            <span>Última actualización: {new Date().toLocaleString()}</span>
          </div>
        </div>
      </BackgroundVideo>
    </>
  );
}