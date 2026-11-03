import React from "react";
import { Link } from "react-router-dom";
import { 
  Users, CreditCard, Wallet, Sun, AlertCircle, TrendingUp, 
  Calendar, CheckCircle2, ChevronRight, Activity 
} from "lucide-react";

export function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header de Bienvenida */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen operativo y financiero de GōkuLab</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reportes/global" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm">
            <TrendingUp className="w-4 h-4" /> Ver Reporte Global
          </Link>
        </div>
      </div>

      {/* KPI Cards (Row 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard titulo="Ingresos del Mes" valor="$155,321" trend="+12.5% vs mes anterior" icon={<Wallet className="w-6 h-6" />} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard titulo="Alumnos Activos" valor="248" trend="+5 esta semana" icon={<Users className="w-6 h-6" />} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard titulo="Cursos Extras" valor="3" trend="Activos este mes" icon={<Sun className="w-6 h-6" />} color="text-orange-600" bg="bg-orange-50" />
        <KpiCard titulo="Tasa de Cobranza" valor="87.9%" trend="Meta: 100%" icon={<CreditCard className="w-6 h-6" />} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Grid Principal (Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda (Ancha): Operación Diaria */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#26AAA3]" /> Operación de Hoy
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Clases de Hoy</p>
                    <p className="text-sm text-gray-500">12 grupos programados</p>
                  </div>
                </div>
                <Link to="/asistencia" className="text-sm font-medium text-[#26AAA3] hover:underline flex items-center bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  Pasar lista <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Pagos Pendientes</p>
                    <p className="text-sm text-gray-500">8 alumnos con saldo vencido</p>
                  </div>
                </div>
                <Link to="/pagos" className="text-sm font-medium text-[#26AAA3] hover:underline flex items-center bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  Revisar <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>
          
          {/* Accesos Rápidos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Accesos Rápidos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickLink to="/alumnos" label="Alumnos" icon={<Users />} />
              <QuickLink to="/pagos" label="Pagos" icon={<CreditCard />} />
              <QuickLink to="/calendario" label="Calendario" icon={<Calendar />} />
              <QuickLink to="/cursos-verano" label="Cursos Extra" icon={<Sun />} />
            </div>
          </div>
        </div>

        {/* Columna Derecha (Estrecha): Alertas y Novedades */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#1E293B] to-[#334155] rounded-xl shadow-lg p-5 text-white">
            <h2 className="text-lg font-bold mb-2">Inteligencia de Negocio</h2>
            <p className="text-sm text-gray-300 mb-4">Revisa el desglose de gastos y la rentabilidad por profesor para tomar decisiones.</p>
            <Link to="/reportes/rentabilidad" className="block w-full text-center py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
              Ver Rentabilidad
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Avisos Recientes</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <p className="text-gray-600"><span className="font-medium text-gray-900">Cursos Extras:</span> Nuevo curso "Campamento STEAM" creado.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <p className="text-gray-600"><span className="font-medium text-gray-900">Nómina:</span> Pagos a profesores listos para revisión.</p>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Componentes Auxiliares para mantener el código limpio ---

function KpiCard({ titulo, valor, trend, icon, color, bg }: { titulo: string, valor: string, trend: string, icon: React.ReactNode, color: string, bg: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{titulo}</p>
        <h3 className="text-2xl font-bold text-gray-900">{valor}</h3>
        <p className="text-xs font-medium text-gray-400 mt-2">{trend}</p>
      </div>
      <div className={`p-3 rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
    </div>
  );
}

function QuickLink({ to, label, icon }: { to: string, label: string, icon: React.ReactNode }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors group">
      <div className="text-gray-400 group-hover:text-[#26AAA3] transition-colors mb-2">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  );
}