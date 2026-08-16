import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';
import { X, UserPlus, Search, Save } from 'lucide-react';

interface InscripcionVeranoFormProps {
  cursoId: string;
  cursoFechaInicio: string;
  cursoFechaFin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InscripcionVeranoForm({ 
  cursoId, 
  cursoFechaInicio, 
  cursoFechaFin, 
  onSuccess, 
  onCancel 
}: InscripcionVeranoFormProps) {
  const [busqueda, setBusqueda] = useState('');
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any>(null);
  const [mostrarCrearAlumno, setMostrarCrearAlumno] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({
    idAlumno: '',
    nombreAlumno: '',
    telefono: '',
    tutor: '',
    montoPago: 0,
    semanasPagadas: 1,
    fechaInicio: cursoFechaInicio || new Date().toISOString().split('T')[0],
    fechaFin: cursoFechaFin || new Date().toISOString().split('T')[0],
    notas: '',
  });

  // Buscar alumnos
  useEffect(() => {
    const buscarAlumnos = async () => {
      if (!busqueda.trim()) {
        setAlumnos([]);
        return;
      }
      try {
        const res = await apiFetch(`/alumnos?q=${encodeURIComponent(busqueda)}`);
        if (!res.ok) throw new Error('Error al buscar');
        const data = await res.json();
        setAlumnos(data);
      } catch (error) {
        console.error(error);
      }
    };
    const delay = setTimeout(buscarAlumnos, 300);
    return () => clearTimeout(delay);
  }, [busqueda]);

  const seleccionarAlumno = (alumno: any) => {
    setAlumnoSeleccionado(alumno);
    setFormData(prev => ({
      ...prev,
      idAlumno: alumno.idAlumno,
      nombreAlumno: alumno.nombreAlumno,
      telefono: alumno.telefono || '',
      tutor: alumno.tutor || '',
    }));
    setBusqueda('');
    setAlumnos([]);
  };

  const limpiarSeleccion = () => {
    setAlumnoSeleccionado(null);
    setFormData(prev => ({
      ...prev,
      idAlumno: '',
      nombreAlumno: '',
      telefono: '',
      tutor: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idAlumno && !formData.nombreAlumno) {
      toast.error('Selecciona o crea un alumno');
      return;
    }
    if (!formData.montoPago || formData.montoPago <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setCargando(true);
    try {
      let idAlumno = formData.idAlumno;
      if (!idAlumno && formData.nombreAlumno) {
        const res = await apiFetch('/alumnos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombreAlumno: formData.nombreAlumno.trim(),
            telefono: formData.telefono || '',
            tutor: formData.tutor || '',
            estatus: 'Activo'
          })
        });
        if (!res.ok) throw new Error('Error al crear alumno');
        const nuevoAlumno = await res.json();
        idAlumno = nuevoAlumno.idAlumno;
      }

      const payload = {
        idAlumno,
        nombreAlumno: formData.nombreAlumno.trim(),
        montoPago: parseFloat(formData.montoPago as any),
        semanasPagadas: parseInt(formData.semanasPagadas as any),
        fechaInicio: formData.fechaInicio, // ✅ CORREGIDO
        fechaFin: formData.fechaFin,       // ✅ CORREGIDO
        notas: formData.notas || '',
      };

      const res = await apiFetch(`/cursos-verano/${cursoId}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al inscribir');
      }

      toast.success('✅ Alumno inscrito correctamente');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al inscribir');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-yellow-200 shadow-xl max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-yellow-600" />
          Inscribir alumno
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Buscador de alumnos */}
        {!alumnoSeleccionado ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar alumno existente
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Escribe nombre o ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full border-2 border-yellow-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              {alumnos.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {alumnos.map((a) => (
                    <li
                      key={a.idAlumno}
                      onClick={() => seleccionarAlumno(a)}
                      className="px-4 py-2 hover:bg-yellow-50 cursor-pointer text-sm"
                    >
                      {a.idAlumno} - {a.nombreAlumno}
                      {a.telefono && <span className="text-gray-400 ml-2">📞 {a.telefono}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMostrarCrearAlumno(true)}
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 font-medium"
            >
              + Crear nuevo alumno
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 p-3 rounded-xl border-2 border-blue-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{alumnoSeleccionado.nombreAlumno}</p>
              <p className="text-xs text-gray-600">ID: {alumnoSeleccionado.idAlumno}</p>
              {alumnoSeleccionado.telefono && <p className="text-xs text-gray-600">📞 {alumnoSeleccionado.telefono}</p>}
            </div>
            <button
              type="button"
              onClick={limpiarSeleccion}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Cambiar
            </button>
          </div>
        )}

        {/* Crear alumno nuevo (expandible) */}
        {mostrarCrearAlumno && !alumnoSeleccionado && (
          <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-300">
            <h4 className="font-medium text-gray-700 mb-2">Nuevo alumno</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nombre completo *"
                value={formData.nombreAlumno}
                onChange={(e) => setFormData({ ...formData, nombreAlumno: e.target.value })}
                className="border-2 border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="border-2 border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
              />
              <input
                type="text"
                placeholder="Tutor"
                value={formData.tutor}
                onChange={(e) => setFormData({ ...formData, tutor: e.target.value })}
                className="border-2 border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarCrearAlumno(false)}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Datos de inscripción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto pagado ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.montoPago}
              onChange={(e) => setFormData({ ...formData, montoPago: parseFloat(e.target.value) || 0 })}
              className="w-full border-2 border-yellow-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semanas pagadas *
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={formData.semanasPagadas}
              onChange={(e) => setFormData({ ...formData, semanasPagadas: parseInt(e.target.value) || 1 })}
              className="w-full border-2 border-yellow-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha inicio
            </label>
            <input
              type="date"
              value={formData.fechaInicio}
              onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
              className="w-full border-2 border-yellow-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha fin
            </label>
            <input
              type="date"
              value={formData.fechaFin}
              onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
              className="w-full border-2 border-yellow-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas
          </label>
          <input
            type="text"
            placeholder="Observaciones (opcional)"
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            className="w-full border-2 border-yellow-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white/80"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={cargando}
            className={`px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition font-medium flex items-center gap-2 ${
              cargando ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Save className="h-4 w-4" />
            {cargando ? 'Guardando...' : 'Inscribir'}
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