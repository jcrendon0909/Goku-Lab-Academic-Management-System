import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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

  const cargarReporte = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (mes) params.append('mes', mes);
      if (anio) params.append('anio', anio);
      const res = await apiFetch(`/reportes/pagos?${params.toString()}`);
      const data = await res.json();
      setAbonos(data.abonos || []);
      setTotales(data.totales || []);
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

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-900">Reporte de Cobranza</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="number"
            placeholder="Mes"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border p-1 w-16 rounded"
          />
          <input
            type="number"
            placeholder="Año"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="border p-1 w-20 rounded"
          />
          <button
            onClick={cargarReporte}
            className="bg-[#26AAA3] text-white px-4 py-2 rounded-lg"
          >
            Filtrar
          </button>
          <button
            onClick={exportarExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {cargando && <div className="text-center py-4">Cargando...</div>}

      {!cargando && (
        <>
          {/* Totales por mes */}
          {totales.length > 0 && (
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {totales.map((t, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">{t._id.mes}/{t._id.anio}</p>
                  <p className="text-xl font-bold">${t.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{t.cantidad} movimientos</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabla detallada */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Estudiante</th>
                  <th className="p-2 text-right">Monto</th>
                  <th className="p-2 text-left">Método</th>
                  <th className="p-2 text-left">Concepto</th>
                  <th className="p-2 text-left">Factura</th>
                  <th className="p-2 text-left">Recibido por</th>
                  <th className="p-2 text-left">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {abonos.map((a, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-2">{new Date(a.fecha).toLocaleDateString()}</td>
                    <td className="p-2">{a.estudiante}</td>
                    <td className="p-2 text-right">${a.monto}</td>
                    <td className="p-2">{a.metodoPago}</td>
                    <td className="p-2">{a.concepto}</td>
                    <td className="p-2">{a.factura ? '✅' : '❌'}</td>
                    <td className="p-2">{a.recibidoPor}</td>
                    <td className="p-2 max-w-xs truncate">{a.observaciones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}