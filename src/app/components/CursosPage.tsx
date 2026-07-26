import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { useSyncDataReload } from '../../utils/dataSync';
import BackgroundVideo from './BackgroundVideo';

interface Curso {
  idCurso: string;
  nombreCurso: string;
  precioMensualidad: number;
  duracionMeses: number;
  nivel: string;
  categoria: string;
  estatus: string;
  createdAt?: string;
  updatedAt?: string;
}

export function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cursoEditando, setCursoEditando] = useState<Curso | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [nuevoCurso, setNuevoCurso] = useState<Partial<Curso>>({
    nombreCurso: '',
    precioMensualidad: 0,
    duracionMeses: 1,
    nivel: 'Básico',
    categoria: '',
    estatus: 'Activo',
  });

  // Estados para búsqueda, filtro y ordenamiento
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState<'Activo' | 'Inactivo' | 'Todos'>('Todos');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Curso; direction: 'asc' | 'desc' } | null>(null);

  const cargarCursos = async () => {
    try {
      setCargando(true);
      const res = await apiFetch('/cursos');
      const data = await res.json();
      setCursos(data);
    } catch (error) {
      toast.error('Error al cargar cursos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  useSyncDataReload(cargarCursos);

  const handleEditar = (curso: Curso) => {
    setCursoEditando({ ...curso });
    setShowModal(true);
  };

  const handleGuardar = async () => {
    if (!cursoEditando) return;

    if (!cursoEditando.nombreCurso || cursoEditando.nombreCurso.trim() === '') {
      toast.error('El nombre del curso es obligatorio');
      return;
    }
    if (cursoEditando.precioMensualidad < 0) {
      toast.error('El precio no puede ser negativo');
      return;
    }
    if (cursoEditando.duracionMeses < 1) {
      toast.error('La duración debe ser al menos 1 mes');
      return;
    }

    try {
      const res = await apiFetch(`/cursos/${cursoEditando.idCurso}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreCurso: cursoEditando.nombreCurso.trim(),
          precioMensualidad: cursoEditando.precioMensualidad,
          duracionMeses: cursoEditando.duracionMeses,
          nivel: cursoEditando.nivel,
          categoria: cursoEditando.categoria,
          estatus: cursoEditando.estatus,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al actualizar curso');
      }

      toast.success('✅ Curso actualizado correctamente');
      setShowModal(false);
      cargarCursos();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar curso');
    }
  };

  // Funciones para ordenamiento
  const requestSort = (key: keyof Curso) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Curso) => {
    if (!sortConfig || sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  // Filtrado y ordenamiento
  const cursosFiltrados = useMemo(() => {
    let resultado = [...cursos];

    if (filtroEstatus !== 'Todos') {
      resultado = resultado.filter(c => c.estatus === filtroEstatus);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(c =>
        c.nombreCurso.toLowerCase().includes(q) ||
        c.idCurso.toLowerCase().includes(q) ||
        (c.categoria && c.categoria.toLowerCase().includes(q))
      );
    }

    if (sortConfig) {
      resultado.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];
        if (aVal === undefined || aVal === null) aVal = '';
        if (bVal === undefined || bVal === null) bVal = '';
        if (sortConfig.key === 'precioMensualidad' || sortConfig.key === 'duracionMeses') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultado;
  }, [cursos, filtroEstatus, busqueda, sortConfig]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#F8B50E] mx-auto mb-4"></div>
          <p className="text-lg font-bold">🚀 Cargando cursos...</p>
        </div>
      </div>
    );
  }

  // Función para obtener color según nivel
  const getNivelColor = (nivel: string) => {
    const colors = {
      'Básico': 'bg-emerald-100 text-emerald-800',
      'Intermedio': 'bg-yellow-100 text-yellow-800',
      'Avanzado': 'bg-rose-100 text-rose-800',
    };
    return colors[nivel as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  const decorativeVideos: { src: string; position: any }[] = [];

  return (
    <>
      <BackgroundVideo
        videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4"
        decorativeVideos={decorativeVideos}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
          {/* Cabecera */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-3 gap-2 flex-shrink-0">
            <h1 className="text-lg md:text-xl font-extrabold text-white drop-shadow-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] p-1.5 rounded-full shadow-lg text-sm inline-flex items-center justify-center w-8 h-8">
                🎓
              </span>
              <span className="bg-gradient-to-r from-[#F8B50E] via-[#FFD700] to-[#FFA500] text-transparent bg-clip-text">
                Gestión de Cursos
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="border-2 border-white/30 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/80 backdrop-blur-sm w-32 sm:w-44 transition-all"
                />
              </div>
              <select
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value as any)}
                className="border-2 border-white/30 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/80 backdrop-blur-sm cursor-pointer"
              >
                <option value="Todos">👥 Todos</option>
                <option value="Activo">🟢 Activos</option>
                <option value="Inactivo">🔴 Inactivos</option>
              </select>
              <button
                onClick={() => setShowModalCrear(true)}
                className="px-4 py-1.5 bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5"
              >
                <span>✨</span> Crear
              </button>
            </div>
          </div>

          {/* Tabla con scroll */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex-1 flex flex-col min-h-0 h-[60vh]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full table-auto divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900">
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('idCurso')}>
                        ID <span className="opacity-70">{getSortIcon('idCurso')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap min-w-[130px]">
                      <div className="flex items-center gap-1" onClick={() => requestSort('nombreCurso')}>
                        Nombre <span className="opacity-70">{getSortIcon('nombreCurso')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('precioMensualidad')}>
                        Precio <span className="opacity-70">{getSortIcon('precioMensualidad')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('duracionMeses')}>
                        Duración <span className="opacity-70">{getSortIcon('duracionMeses')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('nivel')}>
                        Nivel <span className="opacity-70">{getSortIcon('nivel')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('categoria')}>
                        Categoría <span className="opacity-70">{getSortIcon('categoria')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-white/20 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-1" onClick={() => requestSort('estatus')}>
                        Estatus <span className="opacity-70">{getSortIcon('estatus')}</span>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-right text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {cursosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                        🧐 No hay cursos que coincidan con tu búsqueda
                      </td>
                    </tr>
                  ) : (
                    cursosFiltrados.map((curso, index) => (
                      <tr key={curso.idCurso} className={`hover:bg-white/60 transition-all duration-200 hover:shadow-md hover:scale-[1.002] ${index % 2 === 0 ? 'bg-white/30' : 'bg-white/10'}`}>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-gray-700">{curso.idCurso}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">{curso.nombreCurso}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                          ${Number(curso.precioMensualidad || 0).toLocaleString('es-MX')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                          {curso.duracionMeses || 1} {curso.duracionMeses === 1 ? 'mes' : 'meses'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getNivelColor(curso.nivel)}`}>
                            {curso.nivel || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                          {curso.categoria || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            curso.estatus === 'Activo'
                              ? 'bg-emerald-100/80 text-emerald-700'
                              : 'bg-rose-100/80 text-rose-700'
                          }`}>
                            {curso.estatus === 'Activo' ? '🟢 Activo' : '🔴 Inactivo'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleEditar(curso)}
                            className="p-1.5 rounded-lg bg-[#F8B50E]/10 hover:bg-[#F8B50E]/20 text-[#F8B50E] transition-all hover:scale-110 text-sm font-bold"
                            title="Editar curso"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Editar */}
          {showModal && cursoEditando && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-[#F8B50E] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#F8B50E] to-[#FFD700] rounded-full flex items-center justify-center text-2xl">
                    ✏️
                  </div>
                  <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#F8B50E] to-[#FFA500]">
                    Editar Curso
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ID del curso</label>
                    <input
                      type="text"
                      value={cursoEditando.idCurso}
                      disabled
                      className="w-full border-2 border-gray-300 bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del curso *</label>
                    <input
                      type="text"
                      value={cursoEditando.nombreCurso}
                      onChange={(e) => setCursoEditando({ ...cursoEditando, nombreCurso: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="Ej. Python Avanzado"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Precio mensualidad (MXN) *</label>
                    <input
                      type="number"
                      value={cursoEditando.precioMensualidad}
                      onChange={(e) => setCursoEditando({ ...cursoEditando, precioMensualidad: parseFloat(e.target.value) || 0 })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="1500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Duración (meses) *</label>
                    <input
                      type="number"
                      value={cursoEditando.duracionMeses}
                      onChange={(e) => setCursoEditando({ ...cursoEditando, duracionMeses: parseInt(e.target.value) || 1 })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="1"
                      min="1"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nivel</label>
                    <select
                      value={cursoEditando.nivel}
                      onChange={(e) => setCursoEditando({ ...cursoEditando, nivel: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
                    <input
                      type="text"
                      value={cursoEditando.categoria}
                      onChange={(e) => setCursoEditando({ ...cursoEditando, categoria: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="Ej. Programación, Robótica"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Estatus</label>
                    <select
                      value={cursoEditando.estatus}
                      onChange={(e) => setCursoEditando({ ...cursoEditando, estatus: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    className="px-6 py-2 bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Crear */}
          {showModalCrear && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-[#F8B50E] animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#F8B50E] to-[#FFD700] rounded-full flex items-center justify-center text-2xl">
                    ✨
                  </div>
                  <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#F8B50E] to-[#FFA500]">
                    Crear nuevo curso
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del curso *</label>
                    <input
                      type="text"
                      value={nuevoCurso.nombreCurso}
                      onChange={(e) => setNuevoCurso({ ...nuevoCurso, nombreCurso: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="Ej. Python Avanzado"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Precio mensualidad (MXN) *</label>
                    <input
                      type="number"
                      value={nuevoCurso.precioMensualidad}
                      onChange={(e) => setNuevoCurso({ ...nuevoCurso, precioMensualidad: parseFloat(e.target.value) || 0 })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="1500"
                      min="0"
                      step="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Duración (meses) *</label>
                    <input
                      type="number"
                      value={nuevoCurso.duracionMeses}
                      onChange={(e) => setNuevoCurso({ ...nuevoCurso, duracionMeses: parseInt(e.target.value) || 1 })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="1"
                      min="1"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nivel</label>
                    <select
                      value={nuevoCurso.nivel}
                      onChange={(e) => setNuevoCurso({ ...nuevoCurso, nivel: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
                    <input
                      type="text"
                      value={nuevoCurso.categoria}
                      onChange={(e) => setNuevoCurso({ ...nuevoCurso, categoria: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="Ej. Programación, Robótica"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Estatus</label>
                    <select
                      value={nuevoCurso.estatus}
                      onChange={(e) => setNuevoCurso({ ...nuevoCurso, estatus: e.target.value })}
                      className="w-full border-2 border-[#F8B50E]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t-2 border-gray-100">
                  <button
                    onClick={() => setShowModalCrear(false)}
                    className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // Aquí implementarías la lógica de creación, pero como no está en el original, lo dejamos como placeholder
                      toast.info('Función de crear curso no implementada aún.');
                      setShowModalCrear(false);
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Crear curso
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </BackgroundVideo>
    </>
  );
}