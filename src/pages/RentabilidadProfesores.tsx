import React, { useEffect, useState, useMemo } from 'react';
// 🆕 CORREGIDO: Ahora sube solo un nivel porque está en src/pages/
import { apiFetch } from '../services/api';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Wallet, Target, ChevronDown, ChevronUp, 
  Award, BookOpen, User, Loader2, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Search
} from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

interface GrupoRentabilidad {
  idGrupo: string;
  nombreCurso: string;
  ingresosGrupo: number;
  cantidadAlumnos: number;
  tipo: 'regular' | 'extra';
}

interface ProfesorRentabilidad {
  idProfesor: string;
  nombre: string;
  ingresos: number;
  ingresosRegulares: number;
  ingresosExtras: number;
  costo: number;
  costoRegular: number;
  costoExtras: number;
  utilidad: number;
  porcentaje: number;
  cantidadGrupos: number;
  cantidadAlumnos: number;
  grupos: GrupoRentabilidad[];
}

// ============================================================
// HELPERS
// ============================================================

const fmt = (n: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

function getMesString(fecha: Date = new Date()): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMesAnteriorString(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return getMesString(d);
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function RentabilidadProfesores() {
  const [data, setData] = useState<ProfesorRentabilidad[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Filtros
  const [filtroMes, setFiltroMes] = useState(getMesString());
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'utilidad' | 'ingresos' | 'margen'>('utilidad');
  
  // Acordeón
  const [expandido, setExpandido] = useState<string | null>(null);

  const [resumen, setResumen] = useState({
    totalIngresos: 0,
    totalCostos: 0,
    totalUtilidad: 0,
    promedioMargen: 0,
  });

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [anio, mes] = filtroMes.split('-');
      const res = await apiFetch(`/reportes/rentabilidad-profesores?mes=${mes}&anio=${anio}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      
      const dataRes: ProfesorRentabilidad[] = await res.json();
      setData(dataRes);

      const totalIngresos = dataRes.reduce((sum, p) => sum + (p.ingresos || 0), 0);
      const totalCostos = dataRes.reduce((sum, p) => sum + (p.costo || 0), 0);
      const totalUtilidad = dataRes.reduce((sum, p) => sum + (p.utilidad || 0), 0);
      const promedioMargen = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;

      setResumen({ totalIngresos, totalCostos, totalUtilidad, promedioMargen });
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar rentabilidad');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroMes]);

  // Filtrado y Ordenamiento
  const dataProcesada = useMemo(() => {
    let filtrada = data.filter(p => 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    filtrada.sort((a, b) => {
      if (orden === 'utilidad') return b.utilidad - a.utilidad;
      if (orden === 'ingresos') return b.ingresos - a.ingresos;
      if (orden === 'margen') return b.porcentaje - a.porcentaje;
      return 0;
    });

    return filtrada;
  }, [data, busqueda, orden]);

  const toggleAcordeon = (id: string) => {
    setExpandido(prev => prev === id ? null : id);
  };

  if (cargando && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#26AAA3] mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-600">Calculando rentabilidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#26AAA3]" />
            Rentabilidad por Profesor
          </h1>
          <p className="text-gray-500 text-sm mt-1">Inteligencia de negocio y rendimiento docente</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-[#26AAA3]" />
            </div>
            <input
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="pl-9 pr-3 py-1.5 border-none bg-transparent text-sm font-bold text-gray-700 focus:outline-none focus:ring-0 cursor-pointer"
            />
          </div>
          <div className="w-px h-6 bg-gray-200"></div>
          <button onClick={() => setFiltroMes(getMesString())} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filtroMes === getMesString() ? 'bg-[#26AAA3]/10 text-[#26AAA3]' : 'text-gray-500 hover:bg-gray-100'}`}>
            Mes Actual
          </button>
          <button onClick={() => setFiltroMes(getMesAnteriorString())} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filtroMes === getMesAnteriorString() ? 'bg-[#26AAA3]/10 text-[#26AAA3]' : 'text-gray-500 hover:bg-gray-100'}`}>
            Anterior
          </button>
        </div>
      </div>

      {/* KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard titulo="Ingresos Totales" valor={fmt(resumen.totalIngresos)} icon={<ArrowUpRight className="w-5 h-5" />} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard titulo="Costos Totales" valor={fmt(resumen.totalCostos)} icon={<ArrowDownRight className="w-5 h-5" />} color="text-rose-600" bg="bg-rose-50" />
        <KpiCard titulo="Utilidad Neta" valor={fmt(resumen.totalUtilidad)} icon={<Wallet className="w-5 h-5" />} color={resumen.totalUtilidad >= 0 ? "text-[#26AAA3]" : "text-rose-600"} bg={resumen.totalUtilidad >= 0 ? "bg-[#26AAA3]/10" : "bg-rose-50"} />
        <KpiCard titulo="Margen Promedio" valor={`${resumen.promedioMargen.toFixed(1)}%`} icon={<Target className="w-5 h-5" />} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Controles de Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar profesor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-500 uppercase">Ordenar por:</span>
          <select 
            value={orden} 
            onChange={(e) => setOrden(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#26AAA3] bg-white"
          >
            <option value="utilidad">Mayor Utilidad</option>
            <option value="ingresos">Mayor Ingreso</option>
            <option value="margen">Mayor Margen (%)</option>
          </select>
        </div>
      </div>

      {/* Tabla Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-4 py-4 w-12 text-center">#</th>
                <th className="px-4 py-4">Profesor</th>
                <th className="px-4 py-4 text-right">Ingresos</th>
                <th className="px-4 py-4 text-right">Costos</th>
                <th className="px-4 py-4 text-right">Utilidad</th>
                <th className="px-4 py-4 w-48">Margen</th>
                <th className="px-4 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dataProcesada.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Filter className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p>No hay datos para el período seleccionado.</p>
                  </td>
                </tr>
              ) : (
                dataProcesada.map((prof, index) => {
                  const isExpanded = expandido === prof.idProfesor;
                  const isTop = index === 0 && orden === 'utilidad';

                  return (
                    <React.Fragment key={prof.idProfesor}>
                      {/* Fila Principal */}
                      <tr 
                        onClick={() => toggleAcordeon(prof.idProfesor)}
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-[#26AAA3]/5' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-4 text-center font-bold text-gray-400">
                          {isTop ? <Award className="h-5 w-5 text-yellow-500 mx-auto" title="Top Rentabilidad" /> : index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs shadow-sm">
                              {prof.nombre.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{prof.nombre}</div>
                              <div className="text-[11px] text-gray-500 flex gap-2">
                                <span>📚 {prof.cantidadGrupos} cursos</span>
                                <span>👨‍🎓 {prof.cantidadAlumnos} alumnos</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-emerald-600">{fmt(prof.ingresos)}</div>
                          {prof.ingresosExtras > 0 && (
                            <div className="text-[10px] text-orange-500 font-medium mt-0.5" title="Incluye Cursos Extras">
                              + {fmt(prof.ingresosExtras)} extras
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold text-rose-500">{fmt(prof.costo)}</div>
                          {prof.costoExtras > 0 && (
                            <div className="text-[10px] text-gray-400 font-medium mt-0.5" title="Incluye Nómina de Extras">
                              + {fmt(prof.costoExtras)} extras
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className={`font-bold text-lg ${prof.utilidad >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
                            {fmt(prof.utilidad)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  prof.porcentaje >= 30 ? 'bg-emerald-500' : 
                                  prof.porcentaje >= 15 ? 'bg-yellow-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(Math.max(prof.porcentaje, 0), 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-600 w-10 text-right">{prof.porcentaje.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-400">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </td>
                      </tr>

                      {/* Fila Expandida (Detalle de Cursos) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-gray-200 bg-gray-50/50">
                            <div className="p-4 pl-16">
                              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" /> Desglose de Cursos y Grupos
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {prof.grupos.map((grupo, idx) => (
                                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-1.5">
                                        {grupo.tipo === 'extra' ? (
                                          <Award className="h-4 w-4 text-orange-500" />
                                        ) : (
                                          <BookOpen className="h-4 w-4 text-blue-500" />
                                        )}
                                        <span className="font-bold text-gray-800 text-sm truncate" title={grupo.nombreCurso}>
                                          {grupo.nombreCurso}
                                        </span>
                                      </div>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${grupo.tipo === 'extra' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {grupo.tipo}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-gray-50">
                                      <span className="text-xs text-gray-500">{grupo.cantidadAlumnos} alumnos</span>
                                      <span className="font-bold text-emerald-600">{fmt(grupo.ingresosGrupo)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Componentes Auxiliares ---

function KpiCard({ titulo, valor, icon, color, bg }: { titulo: string, valor: string, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{titulo}</p>
        <h3 className={`text-2xl font-bold ${color}`}>{valor}</h3>
      </div>
      <div className={`p-2.5 rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
    </div>
  );
}