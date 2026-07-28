import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { RefreshCw, Plus, Edit2, Trash2, DollarSign, Calendar, User } from 'lucide-react';

interface PagoProfesor {
  _id: string;
  idProfesor: string;
  nombreProfesor: string;
  tipoPago: 'por_hora' | 'fijo_mensual';
  salarioPorHora: number;
  salarioMensual: number;
  fecha: string;
  horasTrabajadas: number;
  montoCalculado: number;
  metodoPago: string;
  observaciones: string;
  activo: boolean;
  createdAt: string;
}

interface Profesor {
  idProfesor: string;
  nombre: string;
  tipoPago: 'por_hora' | 'fijo_mensual';
  salarioPorHora?: number;
  salarioMensual?: number;
}

export function PagosProfesoresPage() {
  const [pagos, setPagos] = useState<PagoProfesor[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<PagoProfesor | null>(null);

  // Filtros
  const [filtroProfesor, setFiltroProfesor] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Formulario
  const [formIdProfesor, setFormIdProfesor] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formHoras, setFormHoras] = useState('');
  const [formMetodo, setFormMetodo] = useState('Efectivo');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formMontoCalculado, setFormMontoCalculado] = useState(0);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [pagosRes, profesoresRes] = await Promise.all([
        apiFetch('/pagos-profesores'),
        apiFetch('/profesores'),
      ]);
      if (!pagosRes.ok) throw new Error('Error al cargar pagos');
      if (!profesoresRes.ok) throw new Error('Error al cargar profesores');
      const pagosData = await pagosRes.json();
      const profesoresData = await profesoresRes.json();
      setPagos(pagosData);
      setProfesores(profesoresData.filter((p: any) => p.estatus === 'Activo'));
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Calcular monto al seleccionar profesor o cambiar horas
  const calcularMonto = (idProfesor: string, horas: string) => {
    const prof = profesores.find((p) => p.idProfesor === idProfesor);
    if (!prof) return 0;
    const horasNum = Number(horas) || 0;
    if (prof.tipoPago === 'por_hora') {
      return horasNum * (prof.salarioPorHora || 0);
    } else {
      // fijo_mensual: cada semana = salarioMensual / 4
      const semanas = horasNum || 1;
      return (prof.salarioMensual || 0) / 4 * semanas;
    }
  };

  const handleProfesorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setFormIdProfesor(id);
    const monto = calcularMonto(id, formHoras);
    setFormMontoCalculado(monto);
  };

  const handleHorasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const horas = e.target.value;
    setFormHoras(horas);
    const monto = calcularMonto(formIdProfesor, horas);
    setFormMontoCalculado(monto);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdProfesor) {
      toast.warning('Selecciona un profesor');
      return;
    }
    try {
      const payload = {
        idProfesor: formIdProfesor,
        fecha: formFecha || new Date().toISOString().split('T')[0],
        horasTrabajadas: Number(formHoras) || 0,
        metodoPago: formMetodo,
        observaciones: formObservaciones,
      };
      const url = editando ? `/pagos-profesores/${editando._id}` : '/pagos-profesores';
      const method = editando ? 'PATCH' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast.success(editando ? 'Pago actualizado' : 'Pago registrado');
      setMostrarForm(false);
      setEditando(null);
      resetForm();
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormIdProfesor('');
    setFormFecha('');
    setFormHoras('');
    setFormMetodo('Efectivo');
    setFormObservaciones('');
    setFormMontoCalculado(0);
  };

  const handleEditar = (pago: PagoProfesor) => {
    setEditando(pago);
    setFormIdProfesor(pago.idProfesor);
    setFormFecha(pago.fecha.split('T')[0]);
    setFormHoras(String(pago.horasTrabajadas));
    setFormMetodo(pago.metodoPago);
    setFormObservaciones(pago.observaciones);
    setFormMontoCalculado(pago.montoCalculado);
    setMostrarForm(true);
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      const res = await apiFetch(`/pagos-profesores/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Pago eliminado');
      cargarDatos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Filtros
  const pagosFiltrados = pagos
    .filter((p) => p.activo !== false)
    .filter((p) => {
      if (filtroProfesor) return p.idProfesor === filtroProfesor;
      return true;
    })
    .filter((p) => {
      if (fechaInicio) return p.fecha >= fechaInicio;
      return true;
    })
    .filter((p) => {
      if (fechaFin) return p.fecha <= fechaFin;
      return true;
    });

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#26AAA3] mx-auto mb-4"></div>
          <p className="text-lg font-bold">💰 Cargando pagos...</p>
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
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-3 flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-lg flex items-center gap-3">
            <span className="bg-gradient-to-r from-[#1E293B] to-[#334155] p-2 rounded-full shadow-lg inline-flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </span>
            <span className="bg-gradient-to-r from-[#CBD5E1] via-[#94A3B8] to-[#F8B50E] text-transparent bg-clip-text">
              Pagos a Profesores
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
              onClick={() => { setMostrarForm(true); setEditando(null); resetForm(); }}
              className="bg-gradient-to-r from-[#1E293B] to-[#334155] text-white px-5 py-2 rounded-full font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Nuevo Pago
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Profesor</label>
            <select
              value={filtroProfesor}
              onChange={(e) => setFiltroProfesor(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            >
              <option value="">Todos</option>
              {profesores.map((p) => (
                <option key={p.idProfesor} value={p.idProfesor} className="text-gray-900">
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Desde</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Hasta</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 shadow-xl flex-1 flex flex-col min-h-0">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full table-auto divide-y divide-white/10 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-[#1E293B] to-[#334155] text-white">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Profesor</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Fecha</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Horas</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Monto</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Método</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Observaciones</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pagosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/60 italic">
                      🧐 No hay pagos registrados
                    </td>
                  </tr>
                ) : (
                  pagosFiltrados.map((p) => (
                    <tr key={p._id} className="hover:bg-white/10 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-white">{p.nombreProfesor}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-white/80">{new Date(p.fecha).toLocaleDateString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-white/80">{p.horasTrabajadas}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-bold text-[#F8B50E]">${Number(p.montoCalculado).toFixed(2)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-white/80">{p.metodoPago}</td>
                      <td className="px-3 py-2 text-white/60 max-w-xs truncate">{p.observaciones || '-'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditar(p)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all hover:scale-110"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(p._id)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-rose-400 hover:text-rose-300 transition-all hover:scale-110 ml-1"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de formulario */}
        {mostrarForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border-4 border-[#1E293B] animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#1E293B] to-[#334155] rounded-full flex items-center justify-center text-2xl">
                  {editando ? <Edit2 className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
                </div>
                <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#1E293B] to-[#F8B50E]">
                  {editando ? 'Editar Pago' : 'Registrar Pago'}
                </h3>
              </div>
              <form onSubmit={handleGuardar} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor *</label>
                  <select
                    value={formIdProfesor}
                    onChange={handleProfesorChange}
                    className="w-full border-2 border-[#1E293B]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {profesores.map((p) => (
                      <option key={p.idProfesor} value={p.idProfesor}>
                        {p.nombre} ({p.tipoPago === 'por_hora' ? `$${p.salarioPorHora}/h` : `$${p.salarioMensual}/mes`})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={formFecha}
                      onChange={(e) => setFormFecha(e.target.value)}
                      className="w-full border-2 border-[#1E293B]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Horas trabajadas</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formHoras}
                      onChange={handleHorasChange}
                      className="w-full border-2 border-[#1E293B]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Monto calculado</label>
                  <div className="text-2xl font-bold text-[#1E293B] bg-gray-50 rounded-xl px-4 py-3 border-2 border-gray-200">
                    ${formMontoCalculado.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Método de pago</label>
                  <select
                    value={formMetodo}
                    onChange={(e) => setFormMetodo(e.target.value)}
                    className="w-full border-2 border-[#1E293B]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                  <input
                    type="text"
                    value={formObservaciones}
                    onChange={(e) => setFormObservaciones(e.target.value)}
                    className="w-full border-2 border-[#1E293B]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    placeholder="Notas adicionales"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setMostrarForm(false); setEditando(null); resetForm(); }}
                    className="px-5 py-2 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all hover:scale-105"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-[#1E293B] to-[#334155] text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    {editando ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BackgroundVideo>
  );
}