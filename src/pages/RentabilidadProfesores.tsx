import React, { useEffect, useState } from 'react';
import { apiFetch } from '../app/services/api';
import { toast } from 'sonner';

interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
  modalidad: string;
}

interface Grupo {
  idGrupo: string;
  nombreCurso: string;
  diaClase: string;
  horaClase: string;
  alumnos: Alumno[];
}

interface ProfesorRentabilidad {
  idProfesor: string;
  nombre: string;
  totalHorasSemana: number;
  totalHorasMes: number;
  salarioPorHora: number;
  tipoPago: 'por_hora' | 'fijo_mensual';
  salarioMensual: number;
  costo: number;
  ingresos: number;
  utilidad: number;
  porcentaje: number;
  cantidadGrupos: number;
  grupos: Grupo[];
}

export default function RentabilidadProfesores() {
  const [data, setData] = useState<ProfesorRentabilidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [profesorExpandido, setProfesorExpandido] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (mes) params.append('mes', mes);
      if (anio) params.append('anio', anio);
      const res = await apiFetch(`/reportes/rentabilidad-profesores?${params.toString()}`);
      const data = await res.json();
      setData(data);
    } catch (error) {
      toast.error('Error al cargar rentabilidad');
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleExpandir = (id: string) => {
    setProfesorExpandido(profesorExpandido === id ? null : id);
  };

  const formatearMonto = (monto: number) => {
    return monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (cargando) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">📊 Rentabilidad de Profesores</h1>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Mes"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border p-2 w-20 rounded-lg"
          />
          <input
            type="number"
            placeholder="Año"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="border p-2 w-24 rounded-lg"
          />
          <button
            onClick={cargarDatos}
            className="bg-[#26AAA3] text-white px-4 py-2 rounded-lg"
          >
            Filtrar
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No hay datos para mostrar</div>
      ) : (
        <div className="grid gap-6">
          {data.map((prof) => (
            <div key={prof.idProfesor} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{prof.nombre}</h2>
                  <span className="text-sm text-gray-500">
                    {prof.cantidadGrupos} grupos · {prof.tipoPago === 'fijo_mensual' ? 'Salario fijo' : 'Por hora'}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Ingresos</div>
                    <div className="text-lg font-bold text-emerald-600">${formatearMonto(prof.ingresos)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Costo</div>
                    <div className="text-lg font-bold text-red-500">${formatearMonto(prof.costo)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Utilidad</div>
                    <div className={`text-lg font-bold ${prof.utilidad >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      ${formatearMonto(prof.utilidad)}
                    </div>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <div className="text-xs text-gray-500">%</div>
                    <div className={`text-lg font-bold ${prof.porcentaje >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {prof.porcentaje}%
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExpandir(prof.idProfesor)}
                    className="text-sm text-cyan-600 hover:underline"
                  >
                    {profesorExpandido === prof.idProfesor ? 'Ocultar grupos' : 'Ver grupos'}
                  </button>
                </div>
              </div>

              {profesorExpandido === prof.idProfesor && (
                <div className="p-4 bg-gray-50">
                  <div className="grid gap-4">
                    {prof.grupos.map((grupo) => (
                      <div key={grupo.idGrupo} className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-gray-800">{grupo.nombreCurso}</span>
                            <span className="ml-3 text-sm text-gray-500">
                              {grupo.diaClase} {grupo.horaClase}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{grupo.alumnos.length} alumnos</span>
                        </div>
                        {grupo.alumnos.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {grupo.alumnos.map((alumno) => (
                              <span
                                key={alumno.idAlumno}
                                className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs"
                              >
                                {alumno.nombreAlumno}
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${alumno.modalidad === 'Virtual' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {alumno.modalidad}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sin alumnos inscritos</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}