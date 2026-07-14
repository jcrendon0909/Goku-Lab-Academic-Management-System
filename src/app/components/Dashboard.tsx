import { Link } from 'react-router-dom';
import { esAdmin } from '../../utils/roles';

export function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = esAdmin(user.rol);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjetas existentes */}
        <Link to="/alumnos" className="block p-6 bg-white rounded-lg shadow hover:shadow-md">
          <h3 className="text-xl font-semibold">Alumnos</h3>
          <p className="text-gray-600">Gestionar alumnos</p>
        </Link>
        <Link to="/cursos" className="block p-6 bg-white rounded-lg shadow hover:shadow-md">
          <h3 className="text-xl font-semibold">Cursos</h3>
          <p className="text-gray-600">Gestionar cursos</p>
        </Link>
        <Link to="/pagos" className="block p-6 bg-white rounded-lg shadow hover:shadow-md">
          <h3 className="text-xl font-semibold">Pagos</h3>
          <p className="text-gray-600">Ver pagos</p>
        </Link>
        {/* 👇 Nueva tarjeta solo para admin */}
        {isAdmin && (
          <Link to="/maestros" className="block p-6 bg-white rounded-lg shadow hover:shadow-md">
            <h3 className="text-xl font-semibold">Maestros</h3>
            <p className="text-gray-600">Gestionar profesores y salarios</p>
          </Link>
        )}
        {/* Otras tarjetas (reschedule, reportes, etc.) */}
        {isAdmin && (
          <Link to="/reportes/rentabilidad" className="block p-6 bg-white rounded-lg shadow hover:shadow-md">
            <h3 className="text-xl font-semibold">Rentabilidad</h3>
            <p className="text-gray-600">Ver rentabilidad por profesor</p>
          </Link>
        )}
      </div>
    </div>
  );
}