import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { Search, RefreshCw, Eye, Edit2, Trash2 } from 'lucide-react';

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

  // Editar
  const [editando, setEditando] = useState<Inscripcion | null>(null);
  const [form, setForm] = useState({
    modalidad: 'Presencial',
    montoMensualidad: 0,
    diaPago: 1,
    fechaInicioPago: '',
    comentarios: '',
    estatus: 'Activa',
  });

  // Eliminar
  const [eliminando, setEliminando] = useState<Inscripcion | null>(null);
  const [modoBorrado, setModoBorrado] = useState<'pending' | 'full'>('pending');

  const [guardando, setGuardando] = useState(false);

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

  const abrirEditar = (ins: Inscripcion) => {
    setEditando(ins);
    setForm({
      modalidad: ins.modalidad || 'Presencial',
      montoMensualidad: ins.montoMensualidad || 0,
      diaPago: ins.diaPago || 1,
      fechaInicioPago: ins.fechaInicioPago
        ? new Date(ins.fechaInicioPago).toISOString().slice(0, 10)
        : '',
      comentarios: ins.comentarios || '',
      estatus: ins.estatus || 'Activa',
    });
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      const res = await apiFetch(
        `/inscripciones/${editando.idAlumno}/${editando.grupoId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modalidad: form.modalidad,
            montoMensualidad: form.montoMensualidad,
            diaPago: form.diaPago,
            fechaInicioPago: form.fechaInicioPago,
            comentarios: form.comentarios,
            estatus: form.estatus,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      let msg = 'Inscripción actualizada';
      if (data.pagosRegenerados) {
        msg += ` (${data.pagosRegenerados} pagos regenerados)`;
      } else if (data.pagosActualizados) {
        msg += ` (${data.pagosActualizados} pagos actualizados)`;
      }
      toast.success(msg);
      setEditando(null);
      cargarInscripciones();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const abrirEliminar = (ins: Inscripcion) => {
    setEliminando(ins);
    setModoBorrado('pending');
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    setGuardando(true);
    try {
      const res = await apiFetch(
        `/inscripciones/${eliminando.idAlumno}/${eliminando.grupoId}?mode=${modoBorrado}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      toast.success(
        `Inscripción eliminada · ${data.pagosBorrados || 0} pagos` +
          (data.abonosBorrados ? ` y ${data.abonosBorrados} abonos` : '')
      );
      setEliminando(null);
      cargarInscripciones();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    } finally {
      setGuardando(false);
    }
  };

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
              Gestión de Inscripciones
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
            <option value="Finalizada" className="text-gray-900">Finalizadas</option>
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
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Modalidad</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('montoMensualidad')}>
                    Monto {getSortIcon('montoMensualidad')}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Día Pago</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-white/10" onClick={() => requestSort('fechaInicioPago')}>
                    Inicio Pago {getSortIcon('fechaInicioPago')}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Estatus</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider">Acciones</th>
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
                          ins.estatus === 'Finalizada' ? 'bg-blue-500/80 text-white' :
                          'bg-gray-500/80 text-white'
                        }`}>
                          {ins.estatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => abrirEditar(ins)}
                            className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 transition-all"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => abrirEliminar(ins)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 flex justify-between items-center text-xs text-white/50 flex-shrink-0">
          <span>📋 {inscripcionesOrdenadas.length} inscripciones</span>
          <span>🔄 {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* ══════════════ MODAL EDITAR ══════════════ */}
      {editando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-[#26AAA3]">
            <h3 className="text-xl font-extrabold mb-4 text-[#26AAA3]">
              ✏️ Editar Inscripción
            </h3>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
              <div className="font-bold text-gray-900">{editando.nombreAlumno}</div>
              <div className="text-xs text-gray-500 font-mono">
                {editando.idAlumno} · {editando.grupoId}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Monto Mensualidad (MXN)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.montoMensualidad}
                  onChange={(e) =>
                    setForm({ ...form, montoMensualidad: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#26AAA3]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Día de Pago (1–31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.diaPago}
                  onChange={(e) =>
                    setForm({ ...form, diaPago: parseInt(e.target.value) || 1 })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#26AAA3]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha de Inicio de Pago
                </label>
                <input
                  type="date"
                  value={form.fechaInicioPago}
                  onChange={(e) =>
                    setForm({ ...form, fechaInicioPago: e.target.value })
                  }
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#26AAA3]"
                />
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Si cambias la fecha, se regenerarán los pagos pendientes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Modalidad
                </label>
                <select
                  value={form.modalidad}
                  onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#26AAA3]"
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Mixta">Mixta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Estatus
                </label>
                <select
                  value={form.estatus}
                  onChange={(e) => setForm({ ...form, estatus: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#26AAA3]"
                >
                  <option value="Activa">Activa</option>
                  <option value="Inactiva">Inactiva</option>
                  <option value="Baja">Baja</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Comentarios
                </label>
                <textarea
                  rows={2}
                  value={form.comentarios}
                  onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#26AAA3] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setEditando(null)}
                disabled={guardando}
                className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardando}
                className="px-6 py-2 bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white rounded-xl text-sm font-bold hover:scale-105 transition-all disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL ELIMINAR ══════════════ */}
      {eliminando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                ¿Eliminar esta inscripción?
              </h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <div className="font-semibold text-gray-900">{eliminando.nombreAlumno}</div>
              <div className="font-mono text-xs text-gray-500">
                {eliminando.idAlumno} · {eliminando.grupoId}
              </div>
              <div className="text-gray-600">${eliminando.montoMensualidad}/mes</div>
            </div>

            <div className="space-y-3 mb-4">
              <label className="block text-sm font-semibold text-gray-700">
                Modo de eliminación:
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name="modo"
                    checked={modoBorrado === 'pending'}
                    onChange={() => setModoBorrado('pending')}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold">Solo pendientes</div>
                    <div className="text-xs text-gray-500">
                      Borra la inscripción y los pagos Pendientes/Parciales.
                      Conserva los pagos pagados.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    name="modo"
                    checked={modoBorrado === 'full'}
                    onChange={() => setModoBorrado('full')}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-rose-700">
                      Borrado completo
                    </div>
                    <div className="text-xs text-gray-500">
                      Borra TODO: inscripción, todos los pagos y todos los
                      abonos de este grupo. No se puede deshacer.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEliminando(null)}
                disabled={guardando}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={guardando}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-bold hover:scale-105 transition-all disabled:opacity-50"
              >
                {guardando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </BackgroundVideo>
  );
}