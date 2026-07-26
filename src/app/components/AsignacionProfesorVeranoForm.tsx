import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { Plus, User, Calendar, Clock, DollarSign } from 'lucide-react';

interface Profesor {
  idProfesor: string;
  nombre: string;
  tipoPago?: 'por_hora' | 'fijo_mensual';
  salarioPorHora?: number;
  salarioMensual?: number;
}

interface Asignacion {
  idProfesor: string;
  nombreProfesor?: string;
  dias: number[];
  horasPorDia: number;
  costoHora: number;
  semanas: number;
}

interface AsignacionProfesorFormProps {
  cursoId: string;
  onSuccess: () => void;
  onCancel: () => void;
  asignacionExistente?: Asignacion & { _id?: string };
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function AsignacionProfesorVeranoForm({ 
  cursoId, 
  onSuccess, 
  onCancel,
  asignacionExistente 
}: AsignacionProfesorFormProps) {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({
    idProfesor: asignacionExistente?.idProfesor || '',
    dias: asignacionExistente?.dias || [],
    horasPorDia: asignacionExistente?.horasPorDia || 1,
    costoHora: asignacionExistente?.costoHora || 0,
    semanas: asignacionExistente?.semanas || 1,
  });

  // Cargar lista de profesores
  useEffect(() => {
    const cargarProfesores = async () => {
      try {
        const res = await apiFetch('/profesores');
        if (!res.ok) throw new Error('Error al cargar profesores');
        const data = await res.json();
        setProfesores(data);
      } catch (error) {
        toast.error('Error al cargar profesores');
        console.error(error);
      }
    };
    cargarProfesores();
  }, []);

  // ✅ Auto-completar costo por hora al seleccionar profesor
  useEffect(() => {
    if (formData.idProfesor) {
      const profesor = profesores.find(p => p.idProfesor === formData.idProfesor);
      if (profesor) {
        let costoBase = 0;
        if (profesor.tipoPago === 'por_hora' && profesor.salarioPorHora) {
          costoBase = profesor.salarioPorHora;
        } else if (profesor.tipoPago === 'fijo_mensual' && profesor.salarioMensual) {
          // Estimación: 160 horas/mes (4 semanas × 40h)
          costoBase = Math.round(profesor.salarioMensual / 160);
        }
        // Solo si no es edición (para no sobrescribir un valor personalizado)
        if (!asignacionExistente) {
          setFormData(prev => ({ ...prev, costoHora: costoBase }));
        }
      }
    }
  }, [formData.idProfesor, profesores, asignacionExistente]);

  const toggleDia = (dia: number) => {
    setFormData(prev => ({
      ...prev,
      dias: prev.dias.includes(dia)
        ? prev.dias.filter(d => d !== dia)
        : [...prev.dias, dia]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idProfesor) {
      toast.error('Selecciona un profesor');
      return;
    }
    if (formData.dias.length === 0) {
      toast.error('Selecciona al menos un día');
      return;
    }

    setCargando(true);
    try {
      const url = asignacionExistente?._id 
        ? `/cursos-verano/asignaciones/${asignacionExistente._id}`
        : `/cursos-verano/${cursoId}/asignaciones`;
      const method = asignacionExistente?._id ? 'PATCH' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar');
      }

      toast.success(asignacionExistente?._id ? '✅ Asignación actualizada' : '✅ Profesor asignado');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    } finally {
      setCargando(false);
    }
  };

  const profesorSeleccionado = profesores.find(p => p.idProfesor === formData.idProfesor);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200 shadow-xl">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-blue-600" />
        {asignacionExistente?._id ? 'Editar asignación' : 'Asignar profesor'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Profesor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profesor</label>
          <select
            value={formData.idProfesor}
            onChange={(e) => setFormData({ ...formData, idProfesor: e.target.value })}
            className="w-full border-2 border-blue-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80"
            disabled={!!asignacionExistente?._id}
          >
            <option value="">Seleccionar profesor</option>
            {profesores.map((p) => (
              <option key={p.idProfesor} value={p.idProfesor}>
                {p.nombre} {p.tipoPago === 'por_hora' ? `($${p.salarioPorHora}/h)` : `($${p.salarioMensual}/mes)`}
              </option>
            ))}
          </select>
        </div>

        {/* Días */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Días de clase</label>
          <div className="flex flex-wrap gap-2">
            {DIAS_SEMANA.map((nombre, index) => (
              <button
                key={index}
                type="button"
                onClick={() => toggleDia(index)}
                className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition ${
                  formData.dias.includes(index)
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {nombre.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Horas por día */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Clock className="h-4 w-4 inline mr-1" />
            Horas por día
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="8"
            value={formData.horasPorDia}
            onChange={(e) => setFormData({ ...formData, horasPorDia: parseFloat(e.target.value) || 0 })}
            className="w-full border-2 border-blue-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80"
          />
        </div>

        {/* Costo por hora (con auto-completado) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <DollarSign className="h-4 w-4 inline mr-1" />
            Costo por hora ($)
            {profesorSeleccionado && (
              <span className="text-xs text-gray-400 ml-2">
                (Base: ${profesorSeleccionado.tipoPago === 'por_hora' 
                  ? profesorSeleccionado.salarioPorHora 
                  : Math.round((profesorSeleccionado.salarioMensual || 0) / 160)}/h)
              </span>
            )}
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={formData.costoHora}
            onChange={(e) => setFormData({ ...formData, costoHora: parseFloat(e.target.value) || 0 })}
            className="w-full border-2 border-blue-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80"
          />
          <p className="text-xs text-gray-400 mt-1">
            💡 Puedes modificar este valor para casos especiales.
          </p>
        </div>

        {/* Semanas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Número de semanas</label>
          <input
            type="number"
            min="1"
            max="12"
            value={formData.semanas}
            onChange={(e) => setFormData({ ...formData, semanas: parseInt(e.target.value) || 1 })}
            className="w-full border-2 border-blue-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/80"
          />
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={cargando}
            className={`px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium flex items-center gap-2 ${
              cargando ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Plus className="h-4 w-4" />
            {cargando ? 'Guardando...' : asignacionExistente?._id ? 'Actualizar' : 'Asignar'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}