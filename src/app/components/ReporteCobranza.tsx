import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import BackgroundVideo from './BackgroundVideo';

interface Abono {
  abonoId?: string;
  pagoId?: string;
  grupoId?: string;
  fecha: string;
  estudiante: string;
  monto: number;
  metodoPago: string;
  concepto: string;
  factura: boolean;
  recibidoPor: string;
  saldoAFavor?: number;
  observaciones?: string;
  periodoFacturacion?: string;
  estatus?: string;
  notas?: string;
}

export function ReporteCobranza() {
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [totales, setTotales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [totalGeneral, setTotalGeneral] = useState(0);

  const [filtroAlumno, setFiltroAlumno] = useState('');
  const [ordenConfig, setOrdenConfig] = useState<{ key: keyof Abono; direccion: 'asc' | 'desc' } | null>(null);

  // Estado para edición
  const [editandoAbono, setEditandoAbono] = useState<Abono | null>(null);
  const [formData, setFormData] = useState({
    monto: 0,
    fecha: '',
    metodo: 'Efectivo',
    notas: '',
  });

  // Estado para eliminar
  const [eliminandoAbono, setEliminandoAbono] = useState<Abono | null>(null);

  // Estado de loading en modales
  const [guardando, setGuardando] = useState(false);

  const cargarReporte = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (mes) params.append('mes', mes);
      if (anio) params.append('anio', anio);
      const res = await apiFetch(`/reportes/pagos?${params.toString()}`);
      const data = await res.json();
      const abonosData = data.abonos || [];
      const totalesData = data.totales || [];
      setAbonos(abonosData);
      setTotales(totalesData);
      const total = abonosData.reduce((sum: number, a: Abono) => sum + a.monto, 0);
      setTotalGeneral(total);
    } catch (error) {
      toast.error('Error al cargar reporte');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, []);

  const abonosFiltrados = useMemo(() => {
    if (!filtroAlumno.trim()) return abonos;
    const busqueda = filtroAlumno.toLowerCase().trim();
    return abonos.filter(a => a.estudiante.toLowerCase().includes(busqueda));
  }, [abonos, filtroAlumno]);

  const abonosOrdenados = useMemo(() => {
    if (!ordenConfig) return abonosFiltrados;
    const { key, direccion } = ordenConfig;
    const sorted = [...abonosFiltrados];
    sorted.sort((a, b) => {
      let aVal: any = a[key as keyof Abono];
      let bVal: any = b[key as keyof Abono];
      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return direccion === 'asc' ? -1 : 1;
      if (aVal > bVal) return direccion === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [abonosFiltrados, ordenConfig]);

  const handleSort = (key: keyof Abono) => {
    setOrdenConfig(prev => {
      if (prev?.key === key) {
        return { key, direccion: prev.direccion === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direccion: 'asc' };
    });
  };

  const exportarExcel = () => {
    const data = abonosOrdenados.map(a => ({
      Fecha: new Date(a.fecha).toLocaleDateString(),
      Estudiante: a.estudiante,
      Monto: a.monto,
      'Método de Pago': a.metodoPago,
      Concepto: a.concepto,
      Factura: a.factura ? 'Solicitada' : 'No solicitada',
      'Recibido por': a.recibidoPor,
      'Saldo a favor': a.saldoAFavor || 0,
      Observaciones: a.observaciones || '',
      'Período de facturación': a.periodoFacturacion || '',
      Estatus: a.estatus || '',
      Notas: a.notas || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cobranza');
    XLSX.writeFile(wb, `Reporte_Cobranza_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const limpiarFiltros = () => {
    setMes('');
    setAnio('');
    setFiltroAlumno('');
    setOrdenConfig(null);
    cargarReporte();
  };

  // ─────────────────────────────────────────────────────────
  // Handlers de edición
  // ─────────────────────────────────────────────────────────
  const abrirEditar = (abono: Abono) => {
    const fechaISO = new Date(abono.fecha).toISOString().slice(0, 10);
    setEditandoAbono(abono);
    setFormData({
      monto: abono.monto,
      fecha: fechaISO,
      metodo: abono.metodoPago || 'Efectivo',
      notas: abono.notas || abono.observaciones || '',
    });
  };

  const cerrarEditar = () => {
    setEditandoAbono(null);
  };

  const guardarEdicion = async () => {
    if (!editandoAbono?.abonoId) {
      toast.error('Este abono no tiene ID. Actualiza el backend.');
      return;
    }

    if (formData.monto < 0 || isNaN(formData.monto)) {
      toast.error('Monto inválido');
      return;
    }

    setGuardando(true);
    try {
      const res = await apiFetch(`/abonos/${editandoAbono.abonoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoAbono: formData.monto,
          fechaAbono: formData.fecha,
          metodoAbono: formData.metodo,
          notas: formData.notas,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al editar abono');
      }

      toast.success('Abono actualizado');
      cerrarEditar();
      await cargarReporte();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al editar abono');
    } finally {
      setGuardando(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Handlers de eliminar
  // ─────────────────────────────────────────────────────────
  const abrirEliminar = (abono: Abono) => {
    setEliminandoAbono(abono);
  };

  const cerrarEliminar = () => {
    setEliminandoAbono(null);
  };

  const confirmarEliminar = async () => {
    if (!eliminandoAbono?.abonoId) {
      toast.error('Este abono no tiene ID. Actualiza el backend.');
      return;
    }

    setGuardando(true);
    try {
      const res = await apiFetch(`/abonos/${eliminandoAbono.abonoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar abono');
      }

      toast.success('Abono eliminado');
      cerrarEliminar();
      await cargarReporte();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al eliminar abono');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#26AAA3] mx-auto mb-4"></div>
          <p className="text-lg font-bold">📊 Cargando reporte...</p>
        </div>
      </div>
    );
  }

  const decorativeVideos: { src: string; position: any }[] = [];

  const getSortIcon = (key: keyof Abono) => {
    if (ordenConfig?.key !== key) return '⇅';
    return ordenConfig.direccion === 'asc' ? '↑' : '↓';
  };

  return (
    <>
      <BackgroundVideo
        videoSrc="https://media.gokulab.mx/Galery/videos/lummyanimado.mp4"
        decorativeVideos={decorativeVideos}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 h-full flex flex-col py-1 mt-[30px]">
          {/* Cabecera */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3 flex-shrink-0">
            <h1 className="text-lg md:text-xl font-extrabold text-white drop-shadow-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] p-1.5 rounded-full shadow-lg text-sm inline-flex items-center justify-center w-8 h-8">
                💰
              </span>
              <span className="bg-gradient-to-r from-[#26AAA3] via-[#67A934] to-[#F8B50E] text-transparent bg-clip-text">
                Reporte de Cobranza
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
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20">
                <span className="text-white text-xs font-medium">👤</span>
                <input
                  type="text"
                  placeholder="Alumno..."
                  value={filtroAlumno}
                  onChange={(e) => setFiltroAlumno(e.target.value)}
                  className="w-24 sm:w-32 bg-transparent text-white placeholder-white/60 text-sm focus:outline-none"
                />
              </div>
              <button
                onClick={cargarReporte}
                className="px-4 py-1.5 bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5"
              >
                <span>🔍</span> Filtrar
              </button>
              <button
                onClick={limpiarFiltros}
                className="px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/30 transition-all border border-white/20"
              >
                <span>↺</span> Limpiar
              </button>
              <button
                onClick={exportarExcel}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full text-sm font-bold hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5"
              >
                <span>📊</span> Exportar Excel
              </button>
            </div>
          </div>

          {/* Tarjetas de totales */}
          {totales.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
              {totales.map((t, i) => {
                const paletas = [
                  'from-blue-600 via-blue-500 to-cyan-400',
                  'from-emerald-600 via-emerald-500 to-green-400',
                  'from-purple-600 via-purple-500 to-pink-400',
                  'from-amber-600 via-orange-500 to-yellow-400'
                ];
                const iconos = ['📊', '💰', '📈', '💳'];
                const index = i % paletas.length;
                return (
                  <div
                    key={i}
                    className={`bg-gradient-to-br ${paletas[index]} p-4 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-all duration-300`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                      {iconos[index]} {t._id.mes}/{t._id.anio}
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      ${Number(t.total).toFixed(2)}
                    </p>
                    <p className="text-xs opacity-80 mt-1">{t.cantidad} movimientos</p>
                  </div>
                );
              })}
              {abonos.length > 0 && (
                <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg text-white transform hover:scale-105 transition-all duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 animate-pulse-slow"></div>
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80 flex items-center gap-1">
                    <span>⭐</span> Total General
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    ${totalGeneral.toFixed(2)}
                  </p>
                  <p className="text-xs opacity-80 mt-1">{abonos.length} movimientos</p>
                </div>
              )}
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex-1 flex flex-col min-h-0 h-[55vh]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full table-auto divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white">
                    <th
                      className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort('fecha')}
                    >
                      Fecha {getSortIcon('fecha')}
                    </th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap min-w-[120px] cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort('estudiante')}
                    >
                      Estudiante {getSortIcon('estudiante')}
                    </th>
                    <th
                      className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort('monto')}
                    >
                      Monto {getSortIcon('monto')}
                    </th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort('metodoPago')}
                    >
                      Método {getSortIcon('metodoPago')}
                    </th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort('concepto')}
                    >
                      Concepto {getSortIcon('concepto')}
                    </th>
                    <th
                      className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort('factura')}
                    >
                      Factura {getSortIcon('factura')}
                    </th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => handleSort('recibidoPor')}
                    >
                      Recibido por {getSortIcon('recibidoPor')}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                      Observaciones
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {abonosOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500 italic">
                        🧐 No hay movimientos para el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    abonosOrdenados.map((a, i) => (
                      <tr
                        key={a.abonoId || i}
                        className={`hover:bg-white/60 transition-all duration-200 hover:shadow-md ${
                          i % 2 === 0 ? 'bg-white/30' : 'bg-white/10'
                        }`}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {new Date(a.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-900">
                          {a.estudiante}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-bold text-[#26AAA3]">
                          ${Number(a.monto).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            a.metodoPago === 'Efectivo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : a.metodoPago === 'Transferencia'
                              ? 'bg-blue-100 text-blue-700'
                              : a.metodoPago === 'Tarjeta'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {a.metodoPago}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {a.concepto}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          {a.factura ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              <span>✅</span> Sí
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
                              <span>❌</span> No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700">
                          {a.recibidoPor}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 truncate max-w-xs">
                          {a.observaciones || '-'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => abrirEditar(a)}
                              className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                              title="Editar abono"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => abrirEliminar(a)}
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                              title="Eliminar abono"
                            >
                              🗑️
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

          {/* Pie de página */}
          {abonos.length > 0 && (
            <div className="mt-2 flex justify-between items-center text-xs text-white/80 flex-shrink-0">
              <span>📋 Mostrando {abonosOrdenados.length} de {abonos.length} movimientos</span>
              <span className="font-bold">Total: ${totalGeneral.toFixed(2)}</span>
            </div>
          )}
        </div>
      </BackgroundVideo>

      {/* ═══════════ MODAL EDITAR ═══════════ */}
      {editandoAbono && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              ✏️ Editar abono
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Estudiante
                </label>
                <input
                  type="text"
                  value={editandoAbono.estudiante}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Monto
                </label>
                <input
                  type="number"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Método de pago
                </label>
                <select
                  value={formData.metodo}
                  onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3]"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={cerrarEditar}
                disabled={guardando}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardando}
                className="px-4 py-2 bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white rounded-lg text-sm font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL ELIMINAR ═══════════ */}
      {eliminandoAbono && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                ¿Eliminar este abono?
              </h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Estudiante:</span>
                <span className="font-semibold text-gray-900">{eliminandoAbono.estudiante}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(eliminandoAbono.fecha).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monto:</span>
                <span className="font-semibold text-red-600">
                  ${Number(eliminandoAbono.monto).toFixed(2)}
                </span>
              </div>
              {eliminandoAbono.pagoId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pago:</span>
                  <span className="font-mono text-xs text-gray-700">{eliminandoAbono.pagoId}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Esta acción no se puede deshacer. El pago asociado se recalculará automáticamente.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={cerrarEliminar}
                disabled={guardando}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={guardando}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg text-sm font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {guardando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}