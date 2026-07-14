import { Link } from 'react-router-dom';
import { 
  Users, BookOpen, DollarSign, UserCog, 
  BarChart3, Calendar, Clock, ShieldCheck 
} from 'lucide-react';
import { esAdmin } from '../../utils/roles';

export function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = esAdmin(user.rol);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel de Control</h1>
        <p className="text-gray-600 mb-8">
          Bienvenido{user.nombreCompleto ? `, ${user.nombreCompleto}` : ''}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Tarjeta: Alumnos (solo admin) */}
          {isAdmin && (
            <Link
              to="/alumnos"
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-300"
            >
              <Users className="h-10 w-10 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Alumnos</h3>
              <p className="text-sm text-gray-500">Gestión completa de alumnos</p>
            </Link>
          )}

          {/* Tarjeta: Cursos (solo admin) */}
          {isAdmin && (
            <Link
              to="/cursos"
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-green-300"
            >
              <BookOpen className="h-10 w-10 text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Cursos</h3>
              <p className="text-sm text-gray-500">Administrar cursos y niveles</p>
            </Link>
          )}

          {/* Tarjeta: Pagos (solo admin) */}
          {isAdmin && (
            <Link
              to="/pagos"
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-yellow-300"
            >
              <DollarSign className="h-10 w-10 text-yellow-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Pagos</h3>
              <p className="text-sm text-gray-500">Historial y estado de pagos</p>
            </Link>
          )}

          {/* Tarjeta: Maestros (solo admin) */}
          {isAdmin && (
            <Link
              to="/maestros"
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-300"
            >
              <UserCog className="h-10 w-10 text-purple-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Maestros</h3>
              <p className="text-sm text-gray-500">Gestión de profesores y salarios</p>
            </Link>
          )}

          {/* Tarjeta: Rentabilidad (solo admin) */}
          {isAdmin && (
            <Link
              to="/reportes/rentabilidad"
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-red-300"
            >
              <BarChart3 className="h-10 w-10 text-red-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Rentabilidad</h3>
              <p className="text-sm text-gray-500">Análisis por profesor</p>
            </Link>
          )}

          {/* Tarjeta: Administrar Usuarios (solo admin) */}
          {isAdmin && (
            <Link
              to="/admin/usuarios"
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-indigo-300"
            >
              <ShieldCheck className="h-10 w-10 text-indigo-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-800">Usuarios</h3>
              <p className="text-sm text-gray-500">Gestionar cuentas y roles</p>
            </Link>
          )}

          {/* Tarjeta: Reagendaciones (visible para todos) */}
          <Link
            to="/reschedule"
            className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-cyan-300"
          >
            <Calendar className="h-10 w-10 text-cyan-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">Reagendaciones</h3>
            <p className="text-sm text-gray-500">Gestionar cambios de clase</p>
          </Link>

          {/* Tarjeta: Calendario Profesor (visible para todos) */}
          <Link
            to="/calendario"
            className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-orange-300"
          >
            <Clock className="h-10 w-10 text-orange-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">Calendario</h3>
            <p className="text-sm text-gray-500">Ver tu calendario de clases</p>
          </Link>
        </div>

        {/* Mensaje para profesores (si no es admin) */}
        {!isAdmin && (
          <div className="mt-8 text-center text-gray-600 bg-white rounded-2xl shadow-md p-8 border border-gray-100">
            <p className="text-lg font-medium">Bienvenido, profesor.</p>
            <p className="text-sm">Aquí puedes gestionar tus reagendaciones y ver tu calendario de clases.</p>
          </div>
        )}
      </div>
    </div>
  );
}