import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, TrendingUp, TrendingDown, Wallet,
  Receipt, Users, AlertCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceLine
} from "recharts";
import {
  getRentabilidadGlobal, getUtilidadMensual,
  type RentabilidadGlobal, type UtilidadMensual
} from "../../services/api";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export function ReporteGlobal() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [global, setGlobal] = useState<RentabilidadGlobal | null>(null);
  const [serie, setSerie] = useState<UtilidadMensual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setCargando(true);
        setError(null);
        const [g, s] = await Promise.all([
          getRentabilidadGlobal({ mes, anio }),
          getUtilidadMensual(anio),
        ]);
        if (!cancelado) {
          setGlobal(g);
          setSerie(s);
        }
      } catch (e: any) {
        if (!cancelado) setError(e.message || "Error al cargar reporte");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [mes, anio]);

  const aniosDisponibles = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#26AAA3]" />
              Reporte Global de Utilidad
            </h1>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-2 border border-gray-100">
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {cargando ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-[#26AAA3] mx-auto" />
            <p className="text-gray-500 mt-2">Calculando rentabilidad...</p>
          </div>
        ) : error || !global ? (
          <div className="bg-red-50 rounded-xl p-8 text-center border border-red-100">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-red-600 mt-2">{error || "Sin datos"}</p>
          </div>
        ) : (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <ResumenCard
                titulo="Ingresos"
                monto={global.ingresos.total}
                color="text-emerald-600"
                bg="bg-emerald-50"
                icono={<TrendingUp className="h-5 w-5" />}
              />
              <ResumenCard
                titulo="Egresos"
                monto={global.egresos.total}
                color="text-red-600"
                bg="bg-red-50"
                icono={<TrendingDown className="h-5 w-5" />}
              />
              <ResumenCard
                titulo="Utilidad"
                monto={global.utilidad}
                color={global.utilidad >= 0 ? "text-[#26AAA3]" : "text-red-600"}
                bg={global.utilidad >= 0 ? "bg-[#26AAA3]/10" : "bg-red-50"}
                icono={<Wallet className="h-5 w-5" />}
                subtitulo={`${global.porcentajeUtilidad.toFixed(1)}% de margen`}
              />
            </div>

            {/* Desglose fuentes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Desglose de ingresos
                </h2>
                {global.ingresos.fuentes.map((f) => (
                  <LineaDesglose key={f.id} label={f.label} monto={f.monto} color="text-emerald-600" />
                ))}
                <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600">{fmt(global.ingresos.total)}</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                  Desglose de egresos
                </h2>
                {global.egresos.fuentes.map((f) => (
                  <LineaDesglose key={f.id} label={f.label} monto={f.monto} color="text-red-600" />
                ))}
                <div className="border-t mt-3 pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-red-600">{fmt(global.egresos.total)}</span>
                </div>
              </div>
            </div>

            {/* Gráfica de utilidad mensual */}
            {serie && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                  Utilidad mensual — {serie.anio}
                </h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serie.meses}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => fmt(value)}
                        labelFormatter={(label) => `Mes: ${label}`}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="#9ca3af" />
                      <Bar dataKey="utilidad" name="Utilidad" radius={[6, 6, 0, 0]}>
                        {serie.meses.map((m, i) => (
                          <Cell key={i} fill={m.utilidad >= 0 ? "#26AAA3" : "#D61A1F"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Desgloses detallados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Gastos por categoría
                </h2>
                {global.desgloseGastos.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin gastos este mes</p>
                ) : (
                  global.desgloseGastos.map((g) => (
                    <LineaDesglose key={g.categoria} label={g.categoria} monto={g.monto} color="text-red-600" />
                  ))
                )}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Nómina por profesor
                </h2>
                {global.desgloseProfesores.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin pagos a profesores este mes</p>
                ) : (
                  global.desgloseProfesores.map((p) => (
                    <LineaDesglose
                      key={p.idProfesor}
                      label={p.nombre}
                      monto={p.costo}
                      color="text-red-600"
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResumenCard({
  titulo, monto, color, bg, icono, subtitulo,
}: {
  titulo: string; monto: number; color: string; bg: string;
  icono: React.ReactNode; subtitulo?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{titulo}</p>
          <p className={`text-3xl font-bold ${color} mt-1`}>{fmt(monto)}</p>
          {subtitulo && <p className="text-xs text-gray-500 mt-1">{subtitulo}</p>}
        </div>
        <div className={`p-2 rounded-lg ${bg} ${color}`}>{icono}</div>
      </div>
    </div>
  );
}

function LineaDesglose({ label, monto, color }: { label: string; monto: number; color: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-600 truncate pr-3">{label}</span>
      <span className={`font-semibold ${color}`}>{fmt(monto)}</span>
    </div>
  );
}