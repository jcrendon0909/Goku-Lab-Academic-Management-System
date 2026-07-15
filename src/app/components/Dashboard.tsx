import { Link } from 'react-router-dom';
import { 
  Users, BookOpen, DollarSign, UserCog, 
  BarChart3, Calendar, Clock, ShieldCheck, Sparkles, Rocket,
  Star, Zap
} from 'lucide-react';
import { esAdmin } from '../../utils/roles';

export function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = esAdmin(user.rol);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video de fondo desde R2 - Opacidad muy baja (0.15) */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-15"
        poster="https://media.gokulab.mx/Galery/diseno-videojuegos1.jpg"
      >
        <source src="https://media.gokulab.mx/Galery/videos/gokulabfondo.mp4" type="video/mp4" />
        {/* Fallback con gradiente si el video no carga */}
      </video>
      
      {/* Overlay con gradiente de colores corporativos (muy sutil) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#26AAA3]/10 via-[#67A934]/5 to-[#F8B50E]/5" />
      
      {/* Contenido principal */}
      <div className="relative z-10 min-h-screen p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header con logo */}
          <div className="flex items-center gap-4 mb-8">
            <img 
              src="https://media.gokulab.mx/logo.jpg" 
              alt="GōkuLab" 
              className="h-16 w-16 object-contain rounded-full shadow-lg border-2 border-white/20"
            />
            <div>
              <h1 
                className="text-4xl font-bold text-white drop-shadow-lg"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                GōkuLab
              </h1>
              <p className="text-white/90 text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F8B50E]" />
                Juega, Aprende y Emprende
                <Sparkles className="h-4 w-4 text-[#F8B50E]" />
              </p>
            </div>
          </div>

          {/* Mensaje de bienvenida */}
          <div className="mb-8 flex items-center gap-3">
            <Star className="h-8 w-8 text-[#F8B50E] animate-pulse" />
            <div>
              <p className="text-2xl font-semibold text-white drop-shadow-lg">
                ¡Hola, {user.nombreCompleto || 'Gokulabero'}! 🚀
              </p>
              <p className="text-white/80 flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#26AAA3]" />
                {isAdmin ? 'Administra tu academia con poder Goku' : 'Explora tu calendario y clases'}
              </p>
            </div>
          </div>

          {/* Grid de tarjetas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Alumnos */}
            {isAdmin && (
              <CardGoku
                to="/alumnos"
                icon={<Users className="h-8 w-8" />}
                title="Alumnos"
                description="Gestión de estudiantes"
                color="from-[#26AAA3] to-[#26AAA3]/80"
              />
            )}

            {/* Cursos */}
            {isAdmin && (
              <CardGoku
                to="/cursos"
                icon={<BookOpen className="h-8 w-8" />}
                title="Cursos"
                description="Administrar cursos"
                color="from-[#67A934] to-[#67A934]/80"
              />
            )}

            {/* Pagos */}
            {isAdmin && (
              <CardGoku
                to="/pagos"
                icon={<DollarSign className="h-8 w-8" />}
                title="Pagos"
                description="Historial y estado"
                color="from-[#F8B50E] to-[#F8B50E]/80"
              />
            )}

            {/* Maestros */}
            {isAdmin && (
              <CardGoku
                to="/maestros"
                icon={<UserCog className="h-8 w-8" />}
                title="Maestros"
                description="Gestión de profesores"
                color="from-[#D61A1F] to-[#D61A1F]/80"
              />
            )}

            {/* Rentabilidad */}
            {isAdmin && (
              <CardGoku
                to="/reportes/rentabilidad"
                icon={<BarChart3 className="h-8 w-8" />}
                title="Rentabilidad"
                description="Análisis financiero"
                color="from-[#26AAA3] to-[#67A934]"
              />
            )}

            {/* Usuarios */}
            {isAdmin && (
              <CardGoku
                to="/admin/usuarios"
                icon={<ShieldCheck className="h-8 w-8" />}
                title="Usuarios"
                description="Gestionar cuentas"
                color="from-[#67A934] to-[#F8B50E]"
              />
            )}

            {/* Reagendaciones */}
            <CardGoku
              to="/reschedule"
              icon={<Calendar className="h-8 w-8" />}
              title="Reagendaciones"
              description="Cambios de clase"
              color="from-[#26AAA3] to-[#26AAA3]/80"
            />

            {/* Calendario */}
            <CardGoku
              to="/calendario"
              icon={<Clock className="h-8 w-8" />}
              title="Calendario"
              description="Tu agenda de clases"
              color="from-[#F8B50E] to-[#F8B50E]/80"
            />
          </div>

          {/* Mensaje para profesores */}
          {!isAdmin && (
            <div className="mt-8 text-center text-white bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <Rocket className="h-12 w-12 mx-auto mb-3 text-[#F8B50E]" />
              <p className="text-lg font-medium">Bienvenido, profesor.</p>
              <p className="text-sm text-white/80">Aquí puedes gestionar tus reagendaciones y ver tu calendario de clases.</p>
              <p className="text-xs text-white/60 mt-2 flex items-center justify-center gap-1">
                <Star className="h-3 w-3" />
                <span>GōkuLab - Juega, Aprende y Emprende</span>
                <Star className="h-3 w-3" />
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta con estilo GōkuLab
function CardGoku({ to, icon, title, description, color }: any) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-6 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]`}
    >
      {/* Efecto de brillo */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icono con animación */}
      <div className="relative text-white mb-4 transform group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
        {icon}
      </div>
      
      {/* Contenido */}
      <div className="relative text-white">
        <h3 className="text-xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {title}
        </h3>
        <p className="text-sm text-white/90 mt-1">{description}</p>
      </div>
      
      {/* Borde decorativo */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/30 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
      
      {/* Partículas decorativas */}
      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
    </Link>
  );
}