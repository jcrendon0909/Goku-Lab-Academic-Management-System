import { Link } from 'react-router-dom';
import { 
  Users, BookOpen, DollarSign, UserCog, 
  BarChart3, Calendar, Clock, ShieldCheck, Sparkles, Rocket,
  Star, Zap, ClipboardCheck, Grid, Layers, FileText, 
  TrendingUp, UserPlus, PieChart, Sun, Gift, Award
} from 'lucide-react';
import { esAdmin } from '../../utils/roles';

export function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = esAdmin(user.rol);

  return (
    <div className="relative h-[80vh] w-full overflow-hidden">
      {/* Video de fondo */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-15"
        poster="https://media.gokulab.mx/Galery/videos/poster.jpg"
      >
        <source src="https://media.gokulab.mx/Galery/videos/gokulabfondo.mp4" type="video/mp4" />
      </video>
      
      <div className="absolute inset-0 bg-gradient-to-br from-[#26AAA3]/10 via-[#67A934]/5 to-[#F8B50E]/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/5" />
      
      {/* Contenido */}
      <div className="relative z-10 h-full w-full p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-[1440px] mx-auto">
          
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4 bg-white/5 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/10 shadow-xl">
            
            {/* LOGO CIRCULAR CON VIDEO */}
            <div className="flex-shrink-0 transform hover:scale-105 transition-all duration-500 hover:rotate-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-2xl ring-2 ring-[#26AAA3]/30 hover:ring-[#F8B50E]/50 transition-all duration-500">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="https://media.gokulab.mx/Galery/videos/gokulabanimado.mp4" type="video/mp4" />
                </video>
              </div>
            </div>

            <div className="flex-1"></div>

            {/* Badge de rol */}
            <div className="hidden lg:block flex-shrink-0">
              <div className="bg-gradient-to-r from-[#26AAA3]/20 to-[#67A934]/20 rounded-full px-3 py-1.5 border border-white/20 backdrop-blur-sm">
                <p className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-[#26AAA3]" />
                  {isAdmin ? '🎯 Admin' : '📚 Profesor'}
                </p>
              </div>
            </div>
          </div>

          {/* Mensaje de bienvenida - NOMBRE EN AZUL CORPORATIVO */}
          <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-2 bg-white/5 backdrop-blur-sm rounded-2xl p-3 px-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#F8B50E] to-[#D61A1F] p-1.5 rounded-full shadow-lg shadow-[#F8B50E]/20">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base md:text-lg font-bold text-white drop-shadow-lg flex items-center gap-2">
                  ¡Hola, <span className="text-[#26AAA3]">{user.nombreCompleto || 'Gokulabero'}!</span> 🎮
                </p>
                <p className="text-xs text-white/80 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-[#F8B50E]" />
                  {isAdmin ? '¡Administra tu academia!' : '¡Gestiona tus clases!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full border border-white/10">
              <Gift className="h-3 w-3 text-[#F8B50E]" />
              <span>{new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          </div>

          {/* Grid de tarjetas - TODAS CON DEGRADADOS SUAVES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            
            {/* Alumnos - Azul degradado */}
            <CardGoku
              to="/alumnos"
              icon={<Users className="h-7 w-7" />}
              title="Alumnos"
              description="👥 Gestión"
              color="from-[#26AAA3] to-[#67A934]"
              emoji="🎓"
            />

            {/* Grupos - Verde degradado */}
            <CardGoku
              to="/grupos"
              icon={<Grid className="h-7 w-7" />}
              title="Grupos"
              description="📚 Horarios"
              color="from-[#67A934] to-[#26AAA3]"
              emoji="📋"
            />

            {/* Cursos - Azul a Verde */}
            <CardGoku
              to="/cursos"
              icon={<BookOpen className="h-7 w-7" />}
              title="Cursos"
              description="📖 Catálogo"
              color="from-[#26AAA3] to-[#67A934]"
              emoji="📘"
            />

            {/* Maestros - Rojo a Amarillo (suave) */}
            <CardGoku
              to="/maestros"
              icon={<UserCog className="h-7 w-7" />}
              title="Maestros"
              description="🧑‍🏫 Gestión"
              color="from-[#D61A1F] to-[#F8B50E]"
              emoji="👨‍🏫"
            />

            {/* Pagos - Amarillo degradado */}
            <CardGoku
              to="/pagos"
              icon={<DollarSign className="h-7 w-7" />}
              title="Pagos"
              description="💰 Estado"
              color="from-[#F8B50E] to-[#D61A1F]"
              emoji="💵"
            />

            {/* Asistencia - Azul degradado */}
            <CardGoku
              to="/asistencia"
              icon={<ClipboardCheck className="h-7 w-7" />}
              title="Asistencia"
              description="✅ Tomar"
              color="from-[#26AAA3] to-[#67A934]"
              emoji="📝"
            />

            {/* Reagendaciones - Verde a Azul */}
            <CardGoku
              to="/reschedule"
              icon={<Calendar className="h-7 w-7" />}
              title="Reagend."
              description="🔄 Cambios"
              color="from-[#67A934] to-[#26AAA3]"
              emoji="🗓️"
            />

            {/* Calendario - Amarillo a Naranja */}
            <CardGoku
              to="/calendario"
              icon={<Clock className="h-7 w-7" />}
              title="Calendario"
              description="📅 Agenda"
              color="from-[#F8B50E] to-[#D61A1F]"
              emoji="⏰"
            />

            {/* Rentabilidad - Azul a Verde */}
            <CardGoku
              to="/reportes/rentabilidad"
              icon={<TrendingUp className="h-7 w-7" />}
              title="Rentabilidad"
              description="📊 Análisis"
              color="from-[#26AAA3] to-[#67A934]"
              emoji="📈"
            />

            {/* Cobranza - Amarillo a Azul (suave) */}
            <CardGoku
              to="/reportes/cobranza"
              icon={<PieChart className="h-7 w-7" />}
              title="Cobranza"
              description="💳 Reporte"
              color="from-[#F8B50E] to-[#26AAA3]"
              emoji="🧾"
            />

            {/* Usuarios - Verde a Amarillo */}
            <CardGoku
              to="/admin/usuarios"
              icon={<ShieldCheck className="h-7 w-7" />}
              title="Usuarios"
              description="🔐 Cuentas"
              color="from-[#67A934] to-[#F8B50E]"
              emoji="👥"
            />

            {/* Cursos Verano - Amarillo a Naranja */}
            <CardGoku
              to="/cursos-verano"
              icon={<Sun className="h-7 w-7" />}
              title="Cursos Verano"
              description="☀️ Gestión"
              color="from-yellow-400 to-orange-500"
              emoji="🏖️"
            />
            <Link to="/gastos" className="...">
            <DollarSign className="h-8 w-8 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">Gastos</h3>
            <p className="text-sm text-gray-500">Registrar gastos mensuales</p>
            </Link>
          </div>

          {/* Mensaje para profesores */}
          {!isAdmin && (
            <div className="mt-4 text-center bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              <Rocket className="h-10 w-10 mx-auto mb-2 text-[#F8B50E] animate-bounce-slow" />
              <p className="text-base font-medium text-white">
                Bienvenido, profesor. 🎯
              </p>
              <p className="text-xs text-white/70">
                Gestiona tus clases y alumnos desde aquí.
              </p>
              <p className="text-[10px] text-white/50 mt-1 flex items-center justify-center gap-1">
                <Star className="h-2.5 w-2.5 text-[#F8B50E]" />
                <span>GōkuLab - Juega, Aprende y Emprende</span>
                <Star className="h-2.5 w-2.5 text-[#F8B50E]" />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estilos para animaciones */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Componente CardGoku - con degradados suaves
function CardGoku({ to, icon, title, description, color, emoji }: any) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-3 md:p-4 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]`}
    >
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between mb-1.5">
        <div className="transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 text-white">
          {icon}
        </div>
        {emoji && (
          <span className="text-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500">
            {emoji}
          </span>
        )}
      </div>
      
      <div className="relative text-white">
        <h3 className="text-sm md:text-base font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {title}
        </h3>
        <p className="text-[10px] text-white/90 mt-0.5">{description}</p>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
    </Link>
  );
}