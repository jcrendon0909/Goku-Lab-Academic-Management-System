import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { toast } from 'sonner';

interface AlumnoAsistencia {
  idAlumno: string;
  nombreAlumno: string;
  estado: 'presente' | 'ausente' | 'justificado';
  observaciones: string;
  asistenciaId: string | null;
}

interface Grupo {
  IdGrupo: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  nombreProfesor: string;
}

export function AsistenciaPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alumnos, setAlumnos] = useState<AlumnoAsistencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargandoGrupos, setCargandoGrupos] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const esAdmin = user?.rol === 'admin';

  // Cargar grupos
  useEffect(() => {
    const cargarGrupos = async () => {
      try {
        setCargandoGrupos(true);
        const res = await apiFetch('/asistencia/grupos-para-profesor');
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Error al cargar grupos');
        }
        const data = await res.json();
        setGrupos(data);
      } catch (error) {
        toast.error('Error al cargar grupos: ' + (error as Error).message);
        console.error(error);
      } finally {
        setCargandoGrupos(false);
      }
    };
    cargarGrupos();
  }, []);

  // Cargar asistencia cuando cambia grupo o fecha
  useEffect(() => {
    if (grupoSeleccionado && fecha) {
      cargarAsistencia();
    }
  }, [grupoSeleccionado, fecha]);

  const cargarAsistencia = async () => {
    setCargando(true);
    try {
      const res = await apiFetch(`/asistencia/grupo/${grupoSeleccionado}?fecha=${fecha}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al cargar asistencia');
      }
      const data = await res.json();
      setAlumnos(data.alumnos || []);
    } catch (error) {
      toast.error('Error al cargar asistencia: ' + (error as Error).message);
      console.error(error);
      setAlumnos([]);
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstado = (idAlumno: string, nuevoEstado: 'presente' | 'ausente' | 'justificado') => {
    setAlumnos((prev) =>
      prev.map((a) =>
        a.idAlumno === idAlumno ? { ...a, estado: nuevoEstado } : a
      )
    );
  };

  const cambiarObservacion = (idAlumno: string, observacion: string) => {
    setAlumnos((prev) =>
      prev.map((a) =>
        a.idAlumno === idAlumno ? { ...a, observaciones: observacion } : a
      )
    );
  };

  const guardarAsistencia = async () => {
    if (!grupoSeleccionado || !fecha || alumnos.length === 0) {
      toast.error('No hay datos para guardar');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        grupoId: grupoSeleccionado,
        fecha,
        alumnos: alumnos.map((a) => ({
          idAlumno: a.idAlumno,
          nombreAlumno: a.nombreAlumno,
          estado: a.estado,
          observaciones: a.observaciones || '',
        })),
      };

      const res = await apiFetch('/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar');
      }

      toast.success('✅ Asistencia guardada correctamente');
      await cargarAsistencia();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar asistencia');
      console.error(error);
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarTodos = (estado: 'presente' | 'ausente' | 'justificado') => {
    setAlumnos((prev) =>
      prev.map((a) => ({ ...a, estado }))
    );
  };

  if (cargandoGrupos) {
    return <div className="p-8 text-center text-gray-500">⏳ Cargando grupos...</div>;
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 drop-shadow-lg flex items-center gap-2">
          <span className="bg-yellow-300 p-2 rounded-full shadow-lg">📋</span>
          {esAdmin ? 'Tomar Asistencia (Admin)' : '📝 Tomar Asistencia'}
        </h1>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-xl border-2 border-blue-200 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">📚 Grupo</label>
          <select
            value={grupoSeleccionado}
            onChange={(e) => setGrupoSeleccionado(e.target.value)}
            className="w-full border-2 border-blue-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">Seleccionar grupo</option>
            {grupos.map((g) => (
              <option key={g.IdGrupo} value={g.IdGrupo}>
                {g.nombreCurso} ({g.diaClase} {g.horaClase}) - {g.nombreProfesor}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">📅 Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border-2 border-blue-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
        <button
          onClick={cargarAsistencia}
          disabled={!grupoSeleccionado}
          className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:scale-105 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Cargar
        </button>
      </div>

      {/* Lista de alumnos */}
      {grupoSeleccionado && (
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-blue-200">
          <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 border-b-2 border-blue-200 flex flex-wrap justify-between items-center gap-2">
            <h2 className="font-bold text-gray-700 text-lg flex items-center gap-2">
              <span>👥</span> Alumnos - {fecha}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCambiarTodos('presente')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border-2 border-green-300 hover:bg-green-200 transition"
              >
                ✅ Todos Presentes
              </button>
              <button
                onClick={() => handleCambiarTodos('ausente')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border-2 border-red-300 hover:bg-red-200 transition"
              >
                ❌ Todos Ausentes
              </button>
              <button
                onClick={guardarAsistencia}
                disabled={guardando || alumnos.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:scale-105 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? '⏳ Guardando...' : '💾 Guardar Asistencia'}
              </button>
            </div>
          </div>

          {cargando ? (
            <div className="p-8 text-center text-gray-500">⏳ Cargando alumnos...</div>
          ) : alumnos.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-lg">
              😅 No hay alumnos inscritos en este grupo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">👤 Alumno</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📌 Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">📝 Observaciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alumnos.map((alumno, index) => (
                    <tr key={alumno.idAlumno} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {alumno.nombreAlumno}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => cambiarEstado(alumno.idAlumno, 'presente')}
                            className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition ${
                              alumno.estado === 'presente'
                                ? 'bg-green-100 text-green-700 border-green-400'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-green-50'
                            }`}
                          >
                            ✅ Presente
                          </button>
                          <button
                            onClick={() => cambiarEstado(alumno.idAlumno, 'ausente')}
                            className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition ${
                              alumno.estado === 'ausente'
                                ? 'bg-red-100 text-red-700 border-red-400'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-red-50'
                            }`}
                          >
                            ❌ Ausente
                          </button>
                          <button
                            onClick={() => cambiarEstado(alumno.idAlumno, 'justificado')}
                            className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition ${
                              alumno.estado === 'justificado'
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-400'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-yellow-50'
                            }`}
                          >
                            📝 Justificado
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <input
                          type="text"
                          placeholder="Observación"
                          value={alumno.observaciones || ''}
                          onChange={(e) => cambiarObservacion(alumno.idAlumno, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}