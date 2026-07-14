import React, { useEffect, useState } from "react";
// 👇 Ruta corregida: subimos a src y entramos a services
import { getRentabilidadProfesores } from "../services/api";

interface RentabilidadItem {
  idProfesor: string;
  nombre: string;
  totalHorasSemana: number;
  totalHorasMes: number;
  salarioPorHora: number;
  costo: number;
  ingresos: number;
  utilidad: number;
  porcentaje: number;
  grupos: number;
}

const RentabilidadProfesores: React.FC = () => {
  const [data, setData] = useState<RentabilidadItem[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState("Abr");
  const [anio, setAnio] = useState("2026");

  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await getRentabilidadProfesores({ mes, anio });
      setData(resultado);
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [mes, anio]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rentabilidad por Profesor</h1>

      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="border border-gray-300 rounded p-2"
          >
            {meses.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className="border border-gray-300 rounded p-2 w-24"
          />
        </div>
        <button
          onClick={cargarDatos}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Actualizar
        </button>
      </div>

      {cargando && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Profesor</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Horas/Sem</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Horas/Mes</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Salario x Hora</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Costo</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Ingresos</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Utilidad</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">%</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Grupos</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500">
                    No hay datos para mostrar
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.idProfesor} className="border-t border-gray-200">
                    <td className="px-4 py-2">{item.nombre}</td>
                    <td className="px-4 py-2">{item.totalHorasSemana.toFixed(1)}</td>
                    <td className="px-4 py-2">{item.totalHorasMes.toFixed(1)}</td>
                    <td className="px-4 py-2">${item.salarioPorHora.toFixed(2)}</td>
                    <td className="px-4 py-2">${item.costo.toFixed(2)}</td>
                    <td className="px-4 py-2">${item.ingresos.toFixed(2)}</td>
                    <td className={`px-4 py-2 font-semibold ${item.utilidad >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${item.utilidad.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">{item.porcentaje.toFixed(1)}%</td>
                    <td className="px-4 py-2">{item.grupos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RentabilidadProfesores;