import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from './Calendar'; // Asegúrate de que la ruta sea correcta
import { apiFetch } from '../../services/api';

export function CalendarioProfesor() {
  const [clases, setClases] = useState([]);
  const [cargando, setCargando] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const idProfesor = user.idProfesor; // Asumimos que el usuario tiene este campo

  useEffect(() => {
    if (!idProfesor) {
      setCargando(false);
      return;
    }
    // Aquí iría la llamada a la API para obtener las clases del profesor
    // Por ahora, usamos el componente Calendar con filtro (si el componente lo soporta)
    // Si no, podríamos usar datos mock o adaptar el Calendar para recibir un filtro
    const cargarClases = async () => {
      try {
        const res = await apiFetch(`/calendario?profesor=${idProfesor}`);
        const data = await res.json();
        setClases(data);
      } catch (error) {
        console.error('Error al cargar calendario:', error);
      } finally {
        setCargando(false);
      }
    };
    cargarClases();
  }, [idProfesor]);

  if (cargando) return <div className="p-8 text-center">Cargando calendario...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mi Calendario de Clases</h1>
        </div>

        {!idProfesor ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
            <p className="text-yellow-800">No tienes un perfil de profesor vinculado.</p>
            <p className="text-sm text-yellow-600 mt-2">Contacta al administrador para asignarte un ID de profesor.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <Calendar
              events={clases} // Ajusta según la estructura de tu Calendar
              // Si el Calendar no acepta un array de eventos, deberías adaptarlo.
              // Como alternativa, puedes mostrar una lista simple.
            />
          </div>
        )}
      </div>
    </div>
  );
}