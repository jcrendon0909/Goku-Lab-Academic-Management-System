import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ArrowRight, Loader2 } from "lucide-react";
import { getRentabilidadGlobal, type RentabilidadGlobal } from "../../services/api";

export function TarjetaUtilidad() {
  const [data, setData] = useState<RentabilidadGlobal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setCargando(true);
        const res = await getRentabilidadGlobal();
        if (!cancelado) setData(res);
      } catch (e: any) {
        if (!cancelado) setError(e.message || "Error al cargar utilidad");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);

  if (cargando) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#F8B50E]" />
        <span className="text-white/80 text-sm">Calculando utilidad del mes...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl border border-red-400/30 p-4">
        <p className="text-white text-sm">⚠️ {error || "Sin datos disponibles"}</p>
      </div>
    );
  }

  const semaforo: "verde" | "ambar" | "rojo" =
    data.utilidad > 0 && data.porcentajeUtilidad >= 10
      ? "verde"
      : data.utilidad > 0
      ? "ambar"
      : "rojo";

  const colorUtilidad =
    semaforo === "verde"
      ? "text-emerald-400"
      : semaforo === "ambar"
      ? "text-amber-400"
      : "text-red-400";

  const v = data.variacionVsMesAnterior;
  const variacionPositiva = v.monto >= 0;

  return (
    <Link
      to="/reportes/global"
      className="group block bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:border-[#F8B50E]/50 hover:bg-white/15 transition-all duration-300 p-4 shadow-xl"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-medium text-white/60 uppercase tracking-widest">
            Utilidad — {data.periodo.label}
          </p>
          <p className={`text-3xl font-bold ${colorUtilidad} mt-1`}>
            {fmt(data.utilidad)}
          </p>
        </div>
        <div
          className={`p-2 rounded-lg ${
            semaforo === "verde"
              ? "bg-emerald-500/20"
              : semaforo === "ambar"
              ? "bg-amber-500/20"
              : "bg-red-500/20"
          }`}
        >
          {variacionPositiva ? (
            <TrendingUp className={`h-5 w-5 ${colorUtilidad}`} />
          ) : (
            <TrendingDown className={`h-5 w-5 ${colorUtilidad}`} />
          )}
        </div>
      </div>

      {v.porcentaje !== null && (
        <p
          className={`text-xs font-medium mb-3 ${
            variacionPositiva ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {variacionPositiva ? "▲" : "▼"} {Math.abs(v.porcentaje).toFixed(1)}% vs mes anterior
        </p>
      )}

      <div className="space-y-1.5 mb-3 border-t border-white/10 pt-3">
        {data.ingresos.fuentes.map((f) => (
          <div key={f.id} className="flex justify-between text-xs">
            <span className="text-white/70">{f.label}</span>
            <span className="text-emerald-300 font-semibold">{fmt(f.monto)}</span>
          </div>
        ))}
        {data.egresos.fuentes.map((f) => (
          <div key={f.id} className="flex justify-between text-xs">
            <span className="text-white/70">{f.label}</span>
            <span className="text-red-300 font-semibold">−{fmt(f.monto)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end text-[10px] uppercase tracking-wider text-white/50 group-hover:text-[#F8B50E] transition-colors">
        Ver reporte completo
        <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}