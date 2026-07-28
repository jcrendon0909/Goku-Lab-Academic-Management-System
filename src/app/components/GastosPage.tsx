import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Pencil, Trash2, Search, X, 
  DollarSign, Calendar, Tag, FileText,
  AlertCircle, Loader2, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { getGastos, crearGasto, actualizarGasto, eliminarGasto } from '../../services/api';

// Mapeo de categorías a colores
const CATEGORIA_COLORS: Record<string, string> = {
  'Renta': 'bg-blue-100 text-blue-800',
  'Luz': 'bg-yellow-100 text-yellow-800',
  'Agua': 'bg-cyan-100 text-cyan-800',
  'Limpieza': 'bg-green-100 text-green-800',
  'Internet': 'bg-purple-100 text-purple-800',
  'Celular': 'bg-pink-100 text-pink-800',
  'Insumos': 'bg-orange-100 text-orange-800',
  'Adecuaciones': 'bg-indigo-100 text-indigo-800',
  'Regalias Algorithmics': 'bg-red-100 text-red-800',
  'Agencia de Publicidad': 'bg-fuchsia-100 text-fuchsia-800',
  'Publicidad Meta': 'bg-violet-100 text-violet-800',
  'Marco': 'bg-amber-100 text-amber-800',
  'Profesores': 'bg-emerald-100 text-emerald-800',
  'Kommo': 'bg-teal-100 text-teal-800',
  'Zadarma': 'bg-sky-100 text-sky-800',
  'Comisiones': 'bg-rose-100 text-rose-800',
  'Otro': 'bg-gray-100 text-gray-800',
};

const CATEGORIAS = Object.keys(CATEGORIA_COLORS);

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Gasto {
  _id: string;
  categoria: string;
  concepto: string;
  monto: number;
  fecha: string;
  mes: string;
  anio: number;
  comprobante?: string;
  observaciones?: string;
  createdAt: string;
}

export function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [mesFiltro, setMesFiltro] = useState(MESES[new Date().getMonth()]);
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    categoria: '',
    concepto: '',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    mes: MESES[new Date().getMonth()],
    anio: new Date().getFullYear(),
    comprobante: '',
    observaciones: '',
  });

  const cargarGastos = async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await getGastos({
        mes: mesFiltro,
        anio: anioFiltro,
        categoria: categoriaFiltro || undefined,
      });
      setGastos(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar gastos');
      toast.error('Error al cargar gastos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, [mesFiltro, anioFiltro, categoriaFiltro]);

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
  const totalPorCategoria = gastos.reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
    return acc;
  }, {} as Record<string, number>);

  const handleCrear = () => {
    setEditandoId(null);
    setFormData({
      categoria: '',
      concepto: '',
      monto: 0,
      fecha: new Date().toISOString().split('T')[0],
      mes: mesFiltro,
      anio: anioFiltro,
      comprobante: '',
      observaciones: '',
    });
    setModalAbierto(true);
  };

  const handleEditar = (gasto: Gasto) => {
    setEditandoId(gasto._id);
    setFormData({
      categoria: gasto.categoria,
      concepto: gasto.concepto,
      monto: gasto.monto,
      fecha: new Date(gasto.fecha).toISOString().split('T')[0],
      mes: gasto.mes,
      anio: gasto.anio,
      comprobante: gasto.comprobante || '',
      observaciones: gasto.observaciones || '',
    });
    setModalAbierto(true);
  };

  const handleEliminar = async (id: string, concepto: string) => {
    if (!confirm(`¿Eliminar el gasto "${concepto}"?`)) return;
    try {
      await eliminarGasto(id);
      toast.success('Gasto eliminado');
      cargarGastos();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoria || !formData.concepto || formData.monto <= 0) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        ...formData,
        fecha: new Date(formData.fecha).toISOString(),
      };
      if (editandoId) {
        await actualizarGasto(editandoId, payload);
        toast.success('Gasto actualizado');
      } else {
        await crearGasto(payload);
        toast.success('Gasto creado');
      }
      setModalAbierto(false);
      cargarGastos();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-[#26AAA3]" />
              Gastos
            </h1>
          </div>
          <button
            onClick={handleCrear}
            className="bg-[#26AAA3] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#1f8c86] transition-colors"
          >
            <Plus className="h-5 w-5" />
            Nuevo Gasto
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Total gastado</p>
            <p className="text-2xl font-bold text-[#26AAA3]">{formatearMoneda(totalGastos)}</p>
            <p className="text-xs text-gray-400">{gastos.length} registros</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 col-span-2">
            <p className="text-sm text-gray-500 mb-2">Distribución por categoría</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(totalPorCategoria).map(([cat, monto]) => (
                <span key={cat} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {cat}: {formatearMoneda(monto)}
                </span>
              ))}
              {Object.keys(totalPorCategoria).length === 0 && (
                <span className="text-sm text-gray-400">Sin datos</span>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {MESES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
            <input
              type="number"
              value={anioFiltro}
              onChange={(e) => setAnioFiltro(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={cargarGastos}
            className="bg-[#26AAA3] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#1f8c86] transition-colors"
          >
            <Search className="h-4 w-4" />
            Filtrar
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {cargando ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#26AAA3] mx-auto" />
              <p className="text-gray-500 mt-2">Cargando gastos...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto" />
              <p>{error}</p>
            </div>
          ) : gastos.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="h-8 w-8 mx-auto" />
              <p>No hay gastos registrados para este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Categoría</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Concepto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Monto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Mes</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Año</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gastos.map((gasto) => (
                    <tr key={gasto._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORIA_COLORS[gasto.categoria] || 'bg-gray-100'}`}>
                          {gasto.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{gasto.concepto}</td>
                      <td className="px-4 py-3 font-bold text-[#26AAA3]">{formatearMoneda(gasto.monto)}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(gasto.fecha).toLocaleDateString('es-MX')}</td>
                      <td className="px-4 py-3 text-gray-600">{gasto.mes}</td>
                      <td className="px-4 py-3 text-gray-600">{gasto.anio}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditar(gasto)}
                            className="p-1 text-gray-400 hover:text-[#26AAA3] transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(gasto._id, gasto.concepto)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editandoId ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto *
                </label>
                <input
                  type="text"
                  value={formData.concepto}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  required
                  placeholder="Ej. Pago de renta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto ($) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => {
                    const fecha = new Date(e.target.value);
                    const mes = MESES[fecha.getMonth()];
                    const anio = fecha.getFullYear();
                    setFormData({
                      ...formData,
                      fecha: e.target.value,
                      mes,
                      anio,
                    });
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  placeholder="Notas adicionales (opcional)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-[#26AAA3] text-white rounded-lg text-sm font-medium hover:bg-[#1f8c86] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}