import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import BackgroundVideo from './BackgroundVideo';

interface Abono {
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

  const exportarExcel = () => {
    const data = abonos.map(a => ({
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
    XLSX.writeFile(wb, `Reporte_Cobranza_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const limpiarFiltros = () => {
    setMes('');
    setAnio('');
    cargarReporte();
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

          {/* Tarjetas de totales - Estilo financiero y cool */}
          {totales.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
              {totales.map((t, i) => {
                // Paleta de colores financieros
                const paletas = [
                  'from-blue-600 via-blue-500 to-cyan-400',
                  'from-emerald-600 via-emerald-500 to-green-400',
                  'from-purple-600 via-purple-500 to-pink-400',
                  'from-amber-600 via-orange-500 to-yellow-400'
                ];
                const iconos = ['💰', '📈', '📊', '🏦'];
                const index = i % paletas.length;
                return (
                  <div
                    key={i}
                    className={`bg-gradient-to-br ${paletas[index]} p-4 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-white`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                        {t._id.mes}/{t._id.anio}
                      </p>
                      <span className="text-xl opacity-80">{iconos[index]}</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      ${Number(t.total).toFixed(2)}
                    </p>
                    <p className="text-xs opacity-80 mt-1">{t.cantidad} movimientos</p>
                  </div>
                );
              })}
              
              {/* Total General - Estilo dorado/ejecutivo */}
              {abonos.length > 0 && (
                <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400 p-4 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-white relative overflow-hidden">
                  {/* Efectos de brillo */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                        📊 Total General
                      </p>
                      <span className="text-xl opacity-80">⭐</span>
                    </div>
                    <p className="text-3xl font-extrabold mt-2 drop-shadow-lg">
                      ${totalGeneral.toFixed(2)}
                    </p>
                    <p className="text-xs opacity-80 mt-1">{abonos.length} movimientos</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabla detallada */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 flex-1 flex flex-col min-h-0 h-[55vh]">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full table-auto divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-[#26AAA3] to-[#67A934] text-white">
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Fecha
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                      Estudiante
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Monto
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Método
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Concepto
                    </th>
                    <th className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Factura
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Recibido por
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                      Observaciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {abonos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                        🧐 No hay movimientos para el período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    abonos.map((a, i) => (
                      <tr
                        key={i}
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
              <span>📋 Mostrando {abonos.length} movimientos</span>
              <span className="font-bold">Total: ${totalGeneral.toFixed(2)}</span>
            </div>
          )}
        </div>
      </BackgroundVideo>
    </>
  );
}