import { Link } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  CreditCard, 
  Calendar, 
  BarChart3, 
  UserCog,
  Home
} from 'lucide-react'; // Instala lucide-react si no lo tienes: npm install lucide-react

export function AdminDashboard() {
  const adminCards = [
    { to: '/alumnos', icon: Users, label: 'Alumnos', description: 'Gestionar alumnos' },
    { to: '/maestros', icon: UserCog, label: 'Maestros', description: 'Gestionar profesores y salarios' },
    { to: '/cursos', icon: BookOpen, label: 'Cursos', description: 'Gestionar cursos' },
    { to: '/pagos', icon: CreditCard, label: 'Pagos', description: 'Ver pagos' },
    { to: '/reschedule', icon: Calendar, label: 'Reagendar', description: 'Gestionar reagendaciones' },
    { to: '/reportes/rentabilidad', icon: BarChart3, label: 'Rentabilidad', description: 'Ver rentabilidad por profesor' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Home className="w-8 h-8 text-blue-600" />
          Panel de Administración
        </h1>
        <p className="text-gray-500 mt-1">Gestiona todos los aspectos del sistema</p>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 p-6 border border-gray-100 hover:border-blue-200 flex flex-col items-start hover:-translate-y-1"
          >
            <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <card.icon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-800 group-hover:text-blue-700">
              {card.label}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}