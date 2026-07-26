import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { RefreshCw, Save, Search, Check, X, Edit2 } from 'lucide-react';

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
  correcto?: boolean;
}

export function EditorInscripciones() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [filtro, setFiltro] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('');
  const [editando, setEditando] = useState<Record<string, Partial<Inscripcion>>>({});

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams({
        page: String(pagina),
        limit: '50',
        filtro,
        grupo: filtroGrupo,
      });
      const res = await apiFetch(`/admin/inscripciones?${params.toString()}`);
      if (!res.ok) throw new Error('Error al cargar inscripciones');
      const data = await res.json();
      setInscripciones(data.inscripciones);
      setTotalPaginas(data.totalPages);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar');
    } finally {
      setCargando(false);
    }
  }, [pagina, filtro, filtroGrupo]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleChange = (id: string, field: keyof Inscripcion, value: any) => {
    setEditando(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const guardarCambio = async (id: string) => {
    const cambios = editando[id];
    if (!cambios || Object.keys(cambios).length === 0) {
      toast.info('No hay cambios para guardar');
      return;
    }

    try {
      const res = await apiFetch(`/admin/inscripciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoMensualidad: cambios.montoMensualidad,
          diaPago: cambios.diaPago,
          fechaInicioPago: cambios.fechaInicioPago,
          modalidad: cambios.modalidad,
          comentarios: cambios.comentarios,
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast.success('✅ Actualizado');
      setEditando(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const guardarTodos = async () => {
    const idsConCambios = Object.keys(editando);
    if (idsConCambios.length === 0) {
      toast.info('No hay cambios pendientes');
      return;
    }

    const updates = idsConCambios.map(id => {
      const cambios = editando[id];
      return {
        id,
        montoMensualidad: cambios.montoMensualidad,
        diaPago: cambios.diaPago,
        fechaInicioPago: cambios.fechaInicioPago,
        modalidad: cambios.modalidad,
        comentarios: cambios.comentarios,
      };
    });

    try {
      const res = await apiFetch('/admin/inscripciones/actualizar-multiples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      toast.success(`✅ ${updates.length} inscripciones actualizadas`);
      setEditando({});
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const marcarCorrecto = (id: string, correcto: boolean) => {
    handleChange(id, 'correcto', correcto);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#F8B50E] mx-auto mb-4"></div>
          <p className="text-lg font-bold">📋 Cargando inscripciones...</p>
        </div>
      </div>
    );
  }

  const decorativeVideos: { src: string; position: any }[] = [];

  return (
    <BackgroundVideo
      videoSrc="https://media.gokulab.mx/Galery/videos/lummyanimado.mp4"
      decorativeVideos={decorativeVideos}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3 flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
            <span className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
              <Edit2 className="h-6 w-6 text-gray-900" />
            </span>
            <span className="bg-gradient-to-r from-[#F8B50E] via-[#FFD700] to-white text-transparent bg-clip-text">
              Editor de Inscripciones
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={cargarDatos}
              className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-all border border-white/20"
              title="Recargar"
            >
              <RefreshCw className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={guardarTodos}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              Guardar todos
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              type="text"
              placeholder="Buscar por alumno o ID..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <input
              type="text"
              placeholder="Grupo ID..."
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            />
          </div>
          <span className="text-white/60 text-sm">{inscripciones.length} inscripciones</span>
        </div>

        {/* Tabla editable */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-auto divide-y divide-white/10 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Alumno / Grupo</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Monto</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Día Pago</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Inicio Pago</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Modalidad</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Comentarios</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider">Correcto</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {inscripciones.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-white/60 italic">
                      🧐 No hay inscripciones que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  inscripciones.map((ins) => {
                    const cambios = editando[ins._id] || {};
                    const monto = cambios.montoMensualidad ?? ins.montoMensualidad;
                    const diaPago = cambios.diaPago ?? ins.diaPago;
                    const fecha = cambios.fechaInicioPago ?? ins.fechaInicioPago;
                    const modalidad = cambios.modalidad ?? ins.modalidad;
                    const comentarios = cambios.comentarios ?? ins.comentarios;
                    const correcto = cambios.correcto ?? ins.correcto ?? false;

                    return (
                      <tr key={ins._id} className="hover:bg-white/10 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="font-medium text-white">{ins.nombreAlumno}</div>
                          <div className="text-xs text-white/50 flex items-center gap-2">
                            <span>{ins.idAlumno}</span>
                            <span className="text-white/30">|</span>
                            <span className="font-mono">{ins.grupoId}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            value={monto}
                            onChange={(e) => handleChange(ins._id, 'montoMensualidad', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            value={diaPago}
                            onChange={(e) => handleChange(ins._id, 'diaPago', parseInt(e.target.value) || 1)}
                            className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                            min="1"
                            max="31"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="date"
                            value={fecha ? new Date(fecha).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleChange(ins._id, 'fechaInicioPago', e.target.value)}
                            className="w-32 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <select
                            value={modalidad}
                            onChange={(e) => handleChange(ins._id, 'modalidad', e.target.value)}
                            className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                          >
                            <option value="Presencial" className="text-gray-900">Presencial</option>
                            <option value="Virtual" className="text-gray-900">Virtual</option>
                            <option value="Mixta" className="text-gray-900">Mixta</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={comentarios}
                            onChange={(e) => handleChange(ins._id, 'comentarios', e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
                            placeholder="Comentarios..."
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <button
                            onClick={() => marcarCorrecto(ins._id, !correcto)}
                            className={`p-1 rounded-full transition-all ${
                              correcto ? 'bg-emerald-500/50 text-emerald-300' : 'bg-rose-500/50 text-rose-300'
                            }`}
                          >
                            {correcto ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                          </button>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">
                          <button
                            onClick={() => guardarCambio(ins._id)}
                            disabled={!cambios || Object.keys(cambios).length === 0}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                              !cambios || Object.keys(cambios).length === 0
                                ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#F8B50E] to-[#FFD700] text-gray-900 hover:scale-105 shadow-lg'
                            }`}
                          >
                            Guardar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>Página {pagina} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </BackgroundVideo>
  );
}