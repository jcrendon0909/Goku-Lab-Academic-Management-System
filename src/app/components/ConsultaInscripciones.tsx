import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { Search, RefreshCw, Eye } from 'lucide-react';

interface Inscripcion {
  _id: string;
  idAlumno: string;
  nombreAlumno: string;
  grupoId: string;
  modalidad: string;
  montoMensualidad: number;
  diaPago: number;
  fechaInicioPago: string;
  comentarios: string;
  fechaInscripcion: string;
  estatus: string;
  fechaBaja?: string;
  motivoBaja?: string;
  createdAt: string;
  updatedAt: string;
}

export function ConsultaInscripciones() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Inscripcion; direction: 'asc' | 'desc' } | null>(null);

  const cargarInscripciones = async () => {
    try {
      setCargando(true);
      const res = await apiFetch('/inscripciones');
      if (!res.ok) throw new Error('Error al cargar inscripciones');
      const data = await res.json();
      setInscripciones(data);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar inscripciones');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInscripciones();
  }, []);

  // Filtrado
  const inscripcionesFiltradas = useMemo(() => {
    let resultado = [...inscripciones];

    if (filtroAlumno) {
      const q = filtroAlumno.toLowerCase();
      resultado = resultado.filter(
        (i) =>
          i.nombreAlumno.toLowerCase().includes(q) ||
          i.idAlumno.toLowerCase().includes(q)
      );
    }

    if (filtroGrupo) {
      resultado = resultado.filter((i) =>
        i.grupoId.toLowerCase().includes(filtroGrupo.toLowerCase())
      );
    }

    if (filtroEstatus !== 'Todos') {
      resultado = resultado.filter((i) => i.estatus === filtroEstatus);
    }

    return resultado;
  }, [inscripciones, filtroAlumno, filtroGrupo, filtroEstatus]);

  // Ordenamiento
  const inscripcionesOrdenadas = useMemo(() => {
    if (!sortConfig) return inscripcionesFiltradas;
    const sorted = [...inscripcionesFiltradas];
    sorted.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [inscripcionesFiltradas, sortConfig]);

  const requestSort = (key: keyof Inscripcion) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Inscripcion) => {
    if (!sortConfig || sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#26AAA3] mx-auto mb-4"></div>
          <p className="text-lg font-bold">📋 Cargando inscripciones...</p>
        </div>
      </div>
    );
  }

  const decorativeVideos: { src: string; position: any }[] = [];

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3 flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
            <span className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
              <Eye className="h-6 w-6 text-white" />
            </span>
            <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
              Consulta de Inscripciones
            </span>
          </h1>
          <button
            onClick={cargarInscripciones}
            className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all border border-white/20"
            title="Recargar"
          >
            <RefreshCw className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Buscar por alumno o ID..."
              value={filtroAlumno}
              onChange={(e) => setFiltroAlumno(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <input
              type="text"
              placeholder="Grupo ID..."
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
            />
          </div>
          <select
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
          >
            <option value="Todos" className="text-gray-900">Todos los estatus</option>
            <option value="Activa" className="text-gray-900">Activas</option>
            <option value="Inactiva" className="text-gray-900">Inactivas</option>
            <option value="Baja" className="text-gray-900">Baja</option>
          </select>
          <span className="text-white/60 text-sm">
            {inscripcionesOrdenadas.length} inscripciones
          </span>
        </div>

        {/* Tabla */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-auto divide-y divide-white/10 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('idAlumno')}>
                    ID Alumno {getSortIcon('idAlumno')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('nombreAlumno')}>
                    Alumno {getSortIcon('nombreAlumno')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('grupoId')}>
                    Grupo {getSortIcon('grupoId')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('modalidad')}>
                    Modalidad {getSortIcon('modalidad')}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('montoMensualidad')}>
                    Monto {getSortIcon('montoMensualidad')}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('diaPago')}>
                    Día Pago {getSortIcon('diaPago')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('fechaInicioPago')}>
                    Inicio Pago {getSortIcon('fechaInicioPago')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('estatus')}>
                    Estatus {getSortIcon('estatus')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">
                    Comentarios
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {inscripcionesOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-white/60 italic">
                      🧐 No hay inscripciones que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  inscripcionesOrdenadas.map((ins, index) => (
                    <tr
                      key={ins._id}
                      className={`hover:bg-white/10 transition-colors ${
                        index % 2 === 0 ? 'bg-white/5' : 'bg-white/0'
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-white/90">{ins.idAlumno}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-white">{ins.nombreAlumno}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-sm text-white/80">{ins.grupoId}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          ins.modalidad === 'Virtual' ? 'bg-purple-500/80 text-white' : 'bg-emerald-500/80 text-white'
                        }`}>
                          {ins.modalidad}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-bold text-[#F8B50E]">
                        ${Number(ins.montoMensualidad).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-white/80">{ins.diaPago}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-white/80">
                        {new Date(ins.fechaInicioPago).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          ins.estatus === 'Activa' ? 'bg-green-500/80 text-white' :
                          ins.estatus === 'Baja' ? 'bg-rose-500/80 text-white' :
                          'bg-gray-500/80 text-white'
                        }`}>
                          {ins.estatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-white/60 max-w-xs truncate" title={ins.comentarios}>
                        {ins.comentarios || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {inscripcionesOrdenadas.length} inscripciones</span>
          <span>🔄 {new Date().toLocaleString()}</span>
        </div>
      </div>
    </BackgroundVideo>
  );
}