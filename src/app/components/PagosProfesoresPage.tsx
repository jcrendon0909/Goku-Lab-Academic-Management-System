import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { 
  RefreshCw, Plus, Edit2, Trash2, DollarSign, BarChart3, Loader2, 
  Search, Calendar, Filter, ChevronDown, ChevronUp, User
} from 'lucide-react';
import { parsearFechaLocal, extraerFechaString, formatearFechaDisplay } from '../../utils/fechas';

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

interface PagoAgrupado {
  idProfesor: string;
  nombreProfesor: string;
  tipoPago: 'por_hora' | 'fijo_mensual';
  totalMonto: number;
  pagos: PagoProfesor[];
}

// ============================================================
// HELPERS DE SEMANA Y FECHAS
// ============================================================

function lunesDeSemana(fecha: Date): string {
  const d = new Date(fecha);
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - dow);
  return d.toLocaleDateString('en-CA');
}

function domingoDeSemana(lunes: string): string {
  const d = new Date(lunes + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return d.toLocaleDateString('en-CA');
}

function semanaActual() {
  const hoy = new Date();
  const lunes = lunesDeSemana(hoy);
  return { desde: lunes, hasta: domingoDeSemana(lunes) };
}

function getMesString(fecha: Date = new Date()): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMesAnteriorString(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return getMesString(d);
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function PagosProfesoresPage() {
  const [pagos, setPagos] = useState<PagoProfesor[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<PagoProfesor | null>(null);

  const [horasAsistencia, setHorasAsistencia] = useState<Record<string, number>>({});

  // Filtros Dinámicos
  const [filtroMes, setFiltroMes] = useState(getMesString());
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'por_hora' | 'fijo_mensual'>('todos');
  
  // Estado para los acordeones (qué profesor está abierto)
  const [profesorExpandido, setProfesorExpandido] = useState<string | null>(null);

  // Formulario
  const [formIdProfesor, setFormIdProfesor] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formHoras, setFormHoras] = useState('1');
  const [formMetodo, setFormMetodo] = useState('Efectivo');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formMontoCalculado, setFormMontoCalculado] = useState(0);
  const [formTipoPago, setFormTipoPago] = useState<'por_hora' | 'fijo_mensual'>('fijo_mensual');
  const [formSalarioBase, setFormSalarioBase] = useState(0);

  // Sugerir horas
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

  useEffect(() => {
    const cargarHorasAsistencia = async () => {
      const pagosPorHora = pagos.filter((p) => p.tipoPago === 'por_hora' && p.activo !== false);
      if (pagosPorHora.length === 0) {
        setHorasAsistencia({});
        return;
      }

      const claves = new Set<string>();
      pagosPorHora.forEach((p) => {
        const lunes = lunesDeSemana(parsearFechaLocal(p.fecha));
        claves.add(`${p.idProfesor}__${lunes}`);
      });

      const nuevas: Record<string, number> = {};
      await Promise.all(
        Array.from(claves).map(async (clave) => {
          const [idProf, lunes] = clave.split('__');
          const domingo = domingoDeSemana(lunes);
          try {
            const res = await apiFetch(`/asistencia/reportes/profesor/${idProf}?desde=${lunes}&hasta=${domingo}`);
            if (res.ok) {
              const data = await res.json();
              nuevas[clave] = data.horasTrabajadas || 0;
            }
          } catch {}
        })
      );
      setHorasAsistencia(nuevas);
    };

    if (pagos.length > 0) cargarHorasAsistencia();
  }, [pagos]);

  // ============================================================
  // LÓGICA DEL FORMULARIO
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
    setFormMontoCalculado(calcularMonto(id, formHoras));
  };

  const handleHorasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const horas = e.target.value;
    setFormHoras(horas);
    setFormMontoCalculado(calcularMonto(formIdProfesor, horas));
  };

  const sugerirHorasDesdeAsistencia = async () => {
    if (!formIdProfesor) return toast.warning('Selecciona un profesor primero');
    if (!sugerirDesde || !sugerirHasta) return toast.warning('Elige el rango de fechas');
    if (sugerirHasta < sugerirDesde) return toast.warning('La fecha "Hasta" no puede ser anterior a "Desde"');

    try {
      setSugerirCargando(true);
      const res = await apiFetch(`/asistencia/reportes/profesor/${formIdProfesor}?desde=${sugerirDesde}&hasta=${sugerirHasta}`);
      if (!res.ok) throw new Error('No se pudo obtener la asistencia');
      const data = await res.json();

      const horas = Number(data.horasTrabajadas) || 0;
      setFormHoras(String(horas));
      setFormMontoCalculado(calcularMonto(formIdProfesor, String(horas)));

      if (horas === 0) {
        setSugerirInfo(`📊 ${data.dadas || 0} sesiones dadas en el rango (0 hrs)`);
        toast.warning('No hay sesiones dadas en ese rango.');
      } else {
        setSugerirInfo(`📊 ${data.dadas} sesión(es) · ${horas} hrs en el rango`);
        toast.success(`Sugerido: ${horas} hrs`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al obtener asistencia');
    } finally {
      setSugerirCargando(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdProfesor) return toast.warning('Selecciona un profesor');
    
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
    setFormFecha(extraerFechaString(pago.fecha));
    setFormHoras(String(pago.horasTrabajadas));
    setFormMetodo(pago.metodoPago);
    setFormObservaciones(pago.observaciones);
    setFormMontoCalculado(pago.montoCalculado);
    setFormTipoPago(pago.tipoPago);
    setFormSalarioBase(pago.tipoPago === 'por_hora' ? pago.salarioPorHora : pago.salarioMensual);
    setSugerirInfo('');
    
    const lunes = lunesDeSemana(parsearFechaLocal(pago.fecha));
    setSugerirDesde(lunes);
    setSugerirHasta(domingoDeSemana(lunes));
    setMostrarForm(true);
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este registro de pago?')) return;
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
  // FILTRADO Y AGRUPACIÓN
  // ============================================================

  const pagosAgrupados = useMemo(() => {
    const filtrados = pagos
      .filter((p) => p.activo !== false)
      .filter((p) => {
        if (!filtroMes) return true;
        const mesPago = extraerFechaString(p.fecha).substring(0, 7);
        return mesPago === filtroMes;
      })
      .filter((p) => (filtroTipo === 'todos' ? true : p.tipoPago === filtroTipo))
      .filter((p) => {
        if (!busqueda) return true;
        const term = busqueda.toLowerCase();
        return p.nombreProfesor.toLowerCase().includes(term) || 
               (p.observaciones && p.observaciones.toLowerCase().includes(term));
      });

    const grupos: Record<string, PagoAgrupado> = {};

    filtrados.forEach((pago) => {
      if (!grupos[pago.idProfesor]) {
        grupos[pago.idProfesor] = {
          idProfesor: pago.idProfesor,
          nombreProfesor: pago.nombreProfesor,
          tipoPago: pago.tipoPago,
          totalMonto: 0,
          pagos: []
        };
      }
      grupos[pago.idProfesor].totalMonto += pago.montoCalculado;
      grupos[pago.idProfesor].pagos.push(pago);
    });

    return Object.values(grupos).sort((a, b) => b.totalMonto - a.totalMonto);
  }, [pagos, filtroMes, filtroTipo, busqueda]);

  const totalPagos = pagosAgrupados.reduce((sum, grupo) => sum + grupo.totalMonto, 0);

  const toggleAcordeon = (idProfesor: string) => {
    setProfesorExpandido(prev => prev === idProfesor ? null : idProfesor);
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#26AAA3] mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-600">Cargando nómina...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-[#26AAA3]" />
            Nómina de Profesores
          </h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de pagos agrupados por profesor</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={cargarDatos}
            className="p-2.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            title="Recargar datos"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setMostrarForm(true); setEditando(null); resetForm(); }}
            className="px-5 py-2.5 bg-[#1E293B] text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Registrar Pago
          </button>
        </div>
      </div>

      {/* Filtros Dinámicos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-[#26AAA3]" />
            </div>
            <input
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="w-full sm:w-44 pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFiltroMes(getMesString())} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${filtroMes === getMesString() ? 'bg-[#26AAA3]/10 text-[#26AAA3] border-[#26AAA3]/30' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}>
              Mes Actual
            </button>
            <button onClick={() => setFiltroMes(getMesAnteriorString())} className={`px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${filtroMes === getMesAnteriorString() ? 'bg-[#26AAA3]/10 text-[#26AAA3] border-[#26AAA3]/30' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}>
              Mes Anterior
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar profesor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
          <button onClick={() => setFiltroTipo('todos')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filtroTipo === 'todos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
          <button onClick={() => setFiltroTipo('por_hora')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filtroTipo === 'por_hora' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Por Hora</button>
          <button onClick={() => setFiltroTipo('fijo_mensual')} className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filtroTipo === 'fijo_mensual' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Fijo</button>
        </div>
      </div>

      {/* Tarjeta de Resumen */}
      <div className="bg-gradient-to-r from-[#1E293B] to-[#334155] rounded-xl shadow-md p-6 flex items-center justify-between text-white">
        <div>
          <p className="text-sm font-medium text-gray-300 uppercase tracking-wider">Total Pagado en el Período</p>
          <p className="text-3xl font-bold mt-1">${totalPagos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm text-gray-300">Profesores con pago</span>
          <span className="text-2xl font-bold">{pagosAgrupados.length}</span>
        </div>
      </div>

      {/* Tabla Acordeón Agrupada */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-4 py-3 w-12"></th>
                <th className="px-4 py-3">Profesor</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-center">N° Pagos</th>
                <th className="px-4 py-3 text-right">Total a Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagosAgrupados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <Filter className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p>No hay pagos registrados para los filtros seleccionados.</p>
                  </td>
                </tr>
              ) : (
                pagosAgrupados.map((grupo) => {
                  const isExpanded = profesorExpandido === grupo.idProfesor;
                  return (
                    <React.Fragment key={grupo.idProfesor}>
                      {/* Fila Principal del Profesor (Clickeable) */}
                      <tr 
                        onClick={() => toggleAcordeon(grupo.idProfesor)}
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-[#26AAA3]/5' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-4 text-center text-gray-400">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              <User className="h-4 w-4" />
                            </div>
                            {grupo.nombreProfesor}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block text-[10px] px-2 py-1 rounded-full font-bold uppercase ${grupo.tipoPago === 'por_hora' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {grupo.tipoPago === 'por_hora' ? 'Por Hora' : 'Fijo'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-gray-600">
                          {grupo.pagos.length} registro(s)
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-lg text-gray-900">
                          ${grupo.totalMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {/* Fila Expandida (Detalles de los pagos) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="p-0 border-b border-gray-200">
                            <div className="bg-gray-50/50 p-4 pl-16">
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                  <thead className="bg-gray-100 text-xs text-gray-500">
                                    <tr>
                                      <th className="px-4 py-2">Fecha</th>
                                      <th className="px-4 py-2 text-right">Horas/Sem.</th>
                                      <th className="px-4 py-2 text-right">Asistencia</th>
                                      <th className="px-4 py-2 text-right">Monto</th>
                                      <th className="px-4 py-2">Método</th>
                                      <th className="px-4 py-2">Obs.</th>
                                      <th className="px-4 py-2 text-right">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {grupo.pagos.map((p) => {
                                      let horasAsist: number | null = null;
                                      if (p.tipoPago === 'por_hora') {
                                        const lunes = lunesDeSemana(parsearFechaLocal(p.fecha));
                                        const clave = `${p.idProfesor}__${lunes}`;
                                        if (clave in horasAsistencia) {
                                          horasAsist = horasAsistencia[clave];
                                        }
                                      }
                                      const cuadra = horasAsist !== null && Math.abs(horasAsist - p.horasTrabajadas) < 0.01;

                                      return (
                                        <tr key={p._id} className="hover:bg-gray-50">
                                          <td className="px-4 py-2 text-gray-700 font-medium">{formatearFechaDisplay(p.fecha)}</td>
                                          <td className="px-4 py-2 text-right text-gray-600">{p.horasTrabajadas}</td>
                                          <td className="px-4 py-2 text-right">
                                            {p.tipoPago === 'fijo_mensual' ? (
                                              <span className="text-gray-300">—</span>
                                            ) : horasAsist === null ? (
                                              <span className="text-gray-400 text-xs">...</span>
                                            ) : (
                                              <span className={`font-bold ${cuadra ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {horasAsist}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-right font-bold text-gray-800">
                                            ${p.montoCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                          </td>
                                          <td className="px-4 py-2 text-gray-500">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{p.metodoPago}</span>
                                          </td>
                                          <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-[120px]" title={p.observaciones}>
                                            {p.observaciones || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            <div className="flex justify-end gap-1">
                                              <button onClick={() => handleEditar(p)} className="p-1 text-gray-400 hover:text-[#26AAA3] rounded" title="Editar">
                                                <Edit2 className="h-3.5 w-3.5" />
                                              </button>
                                              <button onClick={() => handleEliminar(p._id)} className="p-1 text-gray-400 hover:text-rose-600 rounded" title="Eliminar">
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Formulario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E293B] rounded-lg flex items-center justify-center text-white shadow-sm">
                  {editando ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editando ? 'Editar Pago' : 'Registrar Nuevo Pago'}
                  </h3>
                  <p className="text-sm text-gray-500">Completa los datos de la nómina</p>
                </div>
              </div>
              {formTipoPago && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${formTipoPago === 'por_hora' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {formTipoPago === 'por_hora' ? '⏱️ Por hora' : '📆 Fijo mensual'}
                </span>
              )}
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Profesor *</label>
                  <select
                    value={formIdProfesor}
                    onChange={handleProfesorChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Seleccionar profesor...</option>
                    {profesores.map((p) => (
                      <option key={p.idProfesor} value={p.idProfesor}>
                        {p.nombre} ({p.tipoPago === 'por_hora' ? `$${p.salarioPorHora || 0}/h` : `$${p.salarioMensual || 0}/mes`})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha del pago</label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {formTipoPago === 'por_hora' ? 'Horas trabajadas' : 'Semanas trabajadas'}
                  </label>
                  <input
                    type="number"
                    step={formTipoPago === 'por_hora' ? '0.25' : '1'}
                    value={formHoras}
                    onChange={handleHorasChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent font-medium text-lg"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Método de pago</label>
                  <select
                    value={formMetodo}
                    onChange={(e) => setFormMetodo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent bg-white"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {formTipoPago === 'por_hora' && formIdProfesor && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-3">
                    <BarChart3 className="w-4 h-4" />
                    Calcular horas automáticamente desde asistencia
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] text-blue-700 font-bold mb-1">Desde</label>
                      <input type="date" value={sugerirDesde} onChange={(e) => setSugerirDesde(e.target.value)} className="w-full border border-blue-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-blue-700 font-bold mb-1">Hasta</label>
                      <input type="date" value={sugerirHasta} onChange={(e) => setSugerirHasta(e.target.value)} className="w-full border border-blue-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <button
                      type="button"
                      onClick={sugerirHorasDesdeAsistencia}
                      disabled={sugerirCargando}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-1 h-[34px]"
                    >
                      {sugerirCargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Calcular'}
                    </button>
                  </div>
                  {sugerirInfo && <p className="text-xs text-blue-800 font-medium mt-2 bg-blue-100 p-2 rounded">{sugerirInfo}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Salario Base</label>
                  <div className="text-lg font-bold text-gray-700">
                    ${formSalarioBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 transform translate-x-2 -translate-y-2">
                    <DollarSign className="w-16 h-16 text-emerald-600" />
                  </div>
                  <label className="block text-xs font-bold text-emerald-700 uppercase mb-1 relative z-10">Total a Pagar</label>
                  <div className="text-2xl font-bold text-emerald-700 relative z-10">
                    ${formMontoCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones (Opcional)</label>
                <input
                  type="text"
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26AAA3] focus:border-transparent"
                  placeholder="Ej. Pago correspondiente a la primera quincena..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setMostrarForm(false); setEditando(null); resetForm(); }}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1E293B] text-white rounded-lg text-sm font-bold transition-all shadow-md hover:bg-gray-800"
                >
                  {editando ? 'Guardar Cambios' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}