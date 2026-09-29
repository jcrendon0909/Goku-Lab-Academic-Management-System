import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import BackgroundVideo from './BackgroundVideo';
import { RefreshCw, Plus, Edit2, Trash2, DollarSign, BarChart3, Loader2 } from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

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
  tipoPago?: 'por_hora' | 'fijo_mensual';
  salarioPorHora?: number;
  salarioMensual?: number;
  estatus?: string;
  Estatus?: string;
}

// ============================================================
// HELPERS DE FECHA
// ============================================================

/** Parsea la fecha de un pago sin corrimiento de timezone */
function parseFechaPago(fechaRaw: string): Date {
  const fechaStr = String(fechaRaw).split('T')[0];
  return new Date(fechaStr + 'T12:00:00');
}

/** Devuelve el lunes de la semana de una fecha en "YYYY-MM-DD" */
function lunesDeSemana(fecha: Date): string {
  const d = new Date(fecha);
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - dow);
  return d.toLocaleDateString('en-CA');
}

/** Devuelve el domingo de la semana del lunes dado en "YYYY-MM-DD" */
function domingoDeSemana(lunes: string): string {
  const d = new Date(lunes + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return d.toLocaleDateString('en-CA');
}

/** Semana actual: { desde, hasta } */
function semanaActual() {
  const hoy = new Date();
  const lunes = lunesDeSemana(hoy);
  return { desde: lunes, hasta: domingoDeSemana(lunes) };
}

// ============================================================
// COMPONENTE
// ============================================================

export function PagosProfesoresPage() {
  const [pagos, setPagos] = useState<PagoProfesor[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<PagoProfesor | null>(null);

  // Mapa de horas de asistencia por (profesor, semana)
  const [horasAsistencia, setHorasAsistencia] = useState<Record<string, number>>({});

  // Filtros
  const [filtroProfesor, setFiltroProfesor] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Formulario
  const [formIdProfesor, setFormIdProfesor] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formHoras, setFormHoras] = useState('1');
  const [formMetodo, setFormMetodo] = useState('Efectivo');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formMontoCalculado, setFormMontoCalculado] = useState(0);
  const [formTipoPago, setFormTipoPago] = useState<'por_hora' | 'fijo_mensual'>('fijo_mensual');
  const [formSalarioBase, setFormSalarioBase] = useState(0);

  // Estado del botón "Sugerir horas"
  const [sugerirDesde, setSugerirDesde] = useState(semanaActual().desde);
  const [sugerirHasta, setSugerirHasta] = useState(semanaActual().hasta);
  const [sugerirCargando, setSugerirCargando] = useState(false);
  const [sugerirInfo, setSugerirInfo] = useState('');

  // ============================================================
  // CARGA DE DATOS
  // ============================================================

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

      const profesoresActivos = profesoresData.filter((p: any) => {
        const estatus = p.estatus || p.Estatus || '';
        return estatus === 'Activo' || estatus === 'activo' || estatus === '';
      });

      setProfesores(profesoresActivos);
    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      toast.error(error.message || 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ============================================================
  // CARGA DE HORAS DE ASISTENCIA (por pago de tipo por_hora)
  // ============================================================

  useEffect(() => {
    const cargarHorasAsistencia = async () => {
      const pagosPorHora = pagos.filter((p) => p.tipoPago === 'por_hora' && p.activo !== false);
      if (pagosPorHora.length === 0) {
        setHorasAsistencia({});
        return;
      }

      // Recolectar pares únicos (profesor, lunes de la semana)
      const claves = new Set<string>();
      pagosPorHora.forEach((p) => {
        const lunes = lunesDeSemana(parseFechaPago(p.fecha));
        claves.add(`${p.idProfesor}__${lunes}`);
      });

      const nuevas: Record<string, number> = {};
      await Promise.all(
        Array.from(claves).map(async (clave) => {
          const [idProf, lunes] = clave.split('__');
          const domingo = domingoDeSemana(lunes);
          try {
            const res = await apiFetch(
              `/asistencia/reportes/profesor/${idProf}?desde=${lunes}&hasta=${domingo}`
            );
            if (res.ok) {
              const data = await res.json();
              nuevas[clave] = data.horasTrabajadas || 0;
            }
          } catch {
            // silencio: si falla, simplemente no mostramos comparativa
          }
        })
      );
      setHorasAsistencia(nuevas);
    };

    if (pagos.length > 0) cargarHorasAsistencia();
  }, [pagos]);

  // ============================================================
  // CÁLCULO DE MONTO
  // ============================================================

  const calcularMonto = (idProfesor: string, horas: string) => {
    const prof = profesores.find((p) => p.idProfesor === idProfesor);
    if (!prof) {
      setFormTipoPago('fijo_mensual');
      setFormSalarioBase(0);
      return 0;
    }

    const tipo = prof.tipoPago || 'fijo_mensual';
    setFormTipoPago(tipo);

    const horasNum = Number(horas) || 0;
    let salarioBase = 0;
    let monto = 0;

    if (tipo === 'por_hora') {
      salarioBase = prof.salarioPorHora || 0;
      monto = horasNum * salarioBase;
    } else {
      salarioBase = prof.salarioMensual || 0;
      const semanas = horasNum || 1;
      monto = (salarioBase / 4) * semanas;
    }

    setFormSalarioBase(salarioBase);
    return monto;
  };

  const handleProfesorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setFormIdProfesor(id);
    setSugerirInfo('');
    const monto = calcularMonto(id, formHoras);
    setFormMontoCalculado(monto);
  };

  const handleHorasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const horas = e.target.value;
    setFormHoras(horas);
    const monto = calcularMonto(formIdProfesor, horas);
    setFormMontoCalculado(monto);
  };

  // ============================================================
  // SUGERIR HORAS DESDE ASISTENCIA
  // ============================================================

  const sugerirHorasDesdeAsistencia = async () => {
    if (!formIdProfesor) {
      toast.warning('Selecciona un profesor primero');
      return;
    }
    if (!sugerirDesde || !sugerirHasta) {
      toast.warning('Elige el rango de fechas');
      return;
    }
    if (sugerirHasta < sugerirDesde) {
      toast.warning('La fecha "Hasta" no puede ser anterior a "Desde"');
      return;
    }

    try {
      setSugerirCargando(true);
      const res = await apiFetch(
        `/asistencia/reportes/profesor/${formIdProfesor}?desde=${sugerirDesde}&hasta=${sugerirHasta}`
      );
      if (!res.ok) throw new Error('No se pudo obtener la asistencia');
      const data = await res.json();

      const horas = Number(data.horasTrabajadas) || 0;
      setFormHoras(String(horas));
      const monto = calcularMonto(formIdProfesor, String(horas));
      setFormMontoCalculado(monto);

      if (horas === 0) {
        setSugerirInfo(`📊 ${data.dadas || 0} sesiones dadas en el rango (0 hrs)`);
        toast.warning('No hay sesiones dadas en ese rango. Revisa las fechas o pasa lista.');
      } else {
        setSugerirInfo(
          `📊 ${data.dadas} sesión(es) dada(s) · ${horas} hrs en el rango`
        );
        toast.success(`Sugerido: ${horas} hrs`);
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo obtener la asistencia');
    } finally {
      setSugerirCargando(false);
    }
  };

  // ============================================================
  // GUARDAR / EDITAR / ELIMINAR
  // ============================================================

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdProfesor) {
      toast.warning('Selecciona un profesor');
      return;
    }
    try {
      const payload = {
        idProfesor: formIdProfesor,
        fecha: formFecha || new Date().toLocaleDateString('en-CA'),
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
    setFormHoras('1');
    setFormMetodo('Efectivo');
    setFormObservaciones('');
    setFormMontoCalculado(0);
    setFormTipoPago('fijo_mensual');
    setFormSalarioBase(0);
    setSugerirInfo('');
    const s = semanaActual();
    setSugerirDesde(s.desde);
    setSugerirHasta(s.hasta);
  };

  const handleEditar = (pago: PagoProfesor) => {
    setEditando(pago);
    setFormIdProfesor(pago.idProfesor);
    setFormFecha(String(pago.fecha).split('T')[0]);
    setFormHoras(String(pago.horasTrabajadas));
    setFormMetodo(pago.metodoPago);
    setFormObservaciones(pago.observaciones);
    setFormMontoCalculado(pago.montoCalculado);
    setFormTipoPago(pago.tipoPago);
    setFormSalarioBase(pago.tipoPago === 'por_hora' ? pago.salarioPorHora : pago.salarioMensual);
    setSugerirInfo('');
    // Preseleccionar la semana del pago
    const lunes = lunesDeSemana(parseFechaPago(pago.fecha));
    setSugerirDesde(lunes);
    setSugerirHasta(domingoDeSemana(lunes));
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

  // ============================================================
  // FILTRADO
  // ============================================================

  const pagosFiltrados = pagos
    .filter((p) => p.activo !== false)
    .filter((p) => (filtroProfesor ? p.idProfesor === filtroProfesor : true))
    .filter((p) => {
      if (fechaInicio) {
        return String(p.fecha).split('T')[0] >= fechaInicio;
      }
      return true;
    })
    .filter((p) => {
      if (fechaFin) {
        return String(p.fecha).split('T')[0] <= fechaFin;
      }
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
  const totalPagos = pagosFiltrados.reduce((sum, p) => sum + p.montoCalculado, 0);

  // ============================================================
  // RENDER
  // ============================================================

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

        {/* Filtros y Resumen */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/20 flex flex-wrap items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-white/80 font-medium mb-1">Profesor</label>
            <select
              value={filtroProfesor}
              onChange={(e) => setFiltroProfesor(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E]"
            >
              <option value="">Todos los profesores</option>
              {profesores.map((p) => (
                <option key={p.idProfesor} value={p.idProfesor} className="text-gray-900">
                  {p.nombre} ({p.tipoPago === 'por_hora' ? `$${p.salarioPorHora}/h` : `$${p.salarioMensual}/mes`})
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
          <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20">
            <span className="text-xs text-white/60">Total pagado:</span>
            <span className="text-white font-bold ml-2">${totalPagos.toFixed(2)}</span>
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
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Horas pagadas</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Horas asistencia</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Monto</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider">Método</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider max-w-[150px] truncate">Observaciones</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pagosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-white/60 italic">
                      🧐 No hay pagos registrados
                    </td>
                  </tr>
                ) : (
                  pagosFiltrados.map((p) => {
                    // Buscar horas de asistencia para este pago
                    let horasAsist: number | null = null;
                    if (p.tipoPago === 'por_hora') {
                      const lunes = lunesDeSemana(parseFechaPago(p.fecha));
                      const clave = `${p.idProfesor}__${lunes}`;
                      if (clave in horasAsistencia) {
                        horasAsist = horasAsistencia[clave];
                      }
                    }

                    const cuadra =
                      horasAsist !== null && Math.abs(horasAsist - p.horasTrabajadas) < 0.01;

                    return (
                      <tr key={p._id} className="hover:bg-white/10 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-white">
                          {p.nombreProfesor}
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full uppercase ${p.tipoPago === 'por_hora' ? 'bg-blue-500/30 text-blue-200' : 'bg-emerald-500/30 text-emerald-200'}`}>
                            {p.tipoPago === 'por_hora' ? 'Hora' : 'Fijo'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-white/80">
                          {parseFechaPago(p.fecha).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-white/80">
                          {p.horasTrabajadas}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          {p.tipoPago === 'fijo_mensual' ? (
                            <span className="text-white/40 text-xs">—</span>
                          ) : horasAsist === null ? (
                            <span className="text-white/40 text-xs">cargando…</span>
                          ) : (
                            <span
                              className={`font-bold ${cuadra ? 'text-emerald-300' : 'text-amber-300'}`}
                              title={cuadra ? 'Coincide con la asistencia' : 'No coincide con la asistencia'}
                            >
                              {horasAsist}
                              {cuadra ? ' ✅' : ' ⚠️'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right font-bold text-[#F8B50E]">
                          ${Number(p.montoCalculado).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-white/80">{p.metodoPago}</td>
                        <td className="px-3 py-2 text-white/60 max-w-[150px] truncate" title={p.observaciones}>
                          {p.observaciones || '-'}
                        </td>
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
                    );
                  })
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
                {formTipoPago && (
                  <span className={`ml-auto text-sm font-semibold px-3 py-1 rounded-full ${formTipoPago === 'por_hora' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {formTipoPago === 'por_hora' ? '⏱️ Por hora' : '📆 Fijo mensual'}
                  </span>
                )}
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
                    <option value="">Seleccionar profesor...</option>
                    {profesores.length === 0 && (
                      <option value="" disabled>⚠️ No hay profesores disponibles</option>
                    )}
                    {profesores.map((p) => (
                      <option key={p.idProfesor} value={p.idProfesor}>
                        {p.nombre} ({p.tipoPago === 'por_hora' ? `$${p.salarioPorHora || 0}/h` : `$${p.salarioMensual || 0}/mes`})
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {formTipoPago === 'por_hora' ? 'Horas trabajadas' : 'Semanas trabajadas'}
                    </label>
                    <input
                      type="number"
                      step={formTipoPago === 'por_hora' ? '0.25' : '1'}
                      value={formHoras}
                      onChange={handleHorasChange}
                      className="w-full border-2 border-[#1E293B]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                      placeholder={formTipoPago === 'por_hora' ? '0' : '1'}
                      min="0"
                    />
                  </div>
                </div>

                {/* Sugerir horas desde asistencia (solo para por_hora) */}
                {formTipoPago === 'por_hora' && formIdProfesor && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <BarChart3 className="w-4 h-4" />
                      Sugerir horas desde asistencia
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="block text-[11px] text-blue-700 font-medium mb-1">Desde</label>
                        <input
                          type="date"
                          value={sugerirDesde}
                          onChange={(e) => setSugerirDesde(e.target.value)}
                          className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-blue-700 font-medium mb-1">Hasta</label>
                        <input
                          type="date"
                          value={sugerirHasta}
                          onChange={(e) => setSugerirHasta(e.target.value)}
                          className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={sugerirHorasDesdeAsistencia}
                        disabled={sugerirCargando}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {sugerirCargando ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <BarChart3 className="w-3.5 h-3.5" />
                        )}
                        Calcular
                      </button>
                    </div>
                    {sugerirInfo && (
                      <p className="text-xs text-blue-800 font-medium">{sugerirInfo}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Salario base {formTipoPago === 'por_hora' ? '(por hora)' : '(mensual)'}
                  </label>
                  <div className="text-lg font-bold text-[#1E293B] bg-gray-50 rounded-xl px-4 py-2 border-2 border-gray-200">
                    ${formSalarioBase.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Monto calculado</label>
                  <div className="text-3xl font-bold text-[#1E293B] bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl px-4 py-3 border-2 border-emerald-200">
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
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                  <input
                    type="text"
                    value={formObservaciones}
                    onChange={(e) => setFormObservaciones(e.target.value)}
                    className="w-full border-2 border-[#1E293B]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F8B50E] focus:border-transparent bg-white/90"
                    placeholder="Notas adicionales (ej. semana del 1 al 7 de julio)"
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