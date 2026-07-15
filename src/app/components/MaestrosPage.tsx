import React, { useState, useEffect } from "react";
import {
  getProfesores,
  crearProfesor,
  renombrarProfesor,
  actualizarEstatusProfesor,
  eliminarProfesor,
} from "../../services/api";
import { toast } from "sonner";
import { CheckCircle, XCircle, User, UserPlus } from "lucide-react";

interface Profesor {
  idProfesor: string;
  nombre: string;
  estatus: "Activo" | "Inactivo";
  fechaNacimiento?: string | null;
  salarioPorHora?: number;
  tipoPago?: "por_hora" | "fijo_mensual";
  salarioMensual?: number;
  // No tenemos campo usuario en el profesor, pero lo consultaremos aparte
}

export function MaestrosPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [usuariosMap, setUsuariosMap] = useState<Record<string, string>>({}); // idProfesor -> usuario
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el formulario de creación
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [tipoPago, setTipoPago] = useState<"por_hora" | "fijo_mensual">("por_hora");
  const [salarioPorHora, setSalarioPorHora] = useState(0);
  const [salarioMensual, setSalarioMensual] = useState(0);
  const [crearUsuario, setCrearUsuario] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  // Estados para edición
  const [editando, setEditando] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editFechaNacimiento, setEditFechaNacimiento] = useState("");
  const [editTipoPago, setEditTipoPago] = useState<"por_hora" | "fijo_mensual">("por_hora");
  const [editSalarioPorHora, setEditSalarioPorHora] = useState(0);
  const [editSalarioMensual, setEditSalarioMensual] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [profesoresData, usuariosData] = await Promise.all([
        getProfesores(),
        // Obtener usuarios para mapear idProfesor -> usuario
        fetch("/api/usuarios", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
          .then(res => res.json())
          .catch(() => [])
      ]);
      setProfesores(profesoresData || []);
      // Construir mapa de idProfesor -> usuario
      const map: Record<string, string> = {};
      (usuariosData || []).forEach((u: any) => {
        if (u.idProfesor) {
          map[u.idProfesor] = u.usuario;
        }
      });
      setUsuariosMap(map);
    } catch (err) {
      setError("Error al cargar datos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: nombre.trim(),
        fechaNacimiento: fechaNacimiento || null,
        salarioPorHora: tipoPago === "por_hora" ? salarioPorHora : 0,
        tipoPago: tipoPago,
        salarioMensual: tipoPago === "fijo_mensual" ? salarioMensual : 0,
        crearUsuario: crearUsuario,
        usuario: crearUsuario ? usuario : undefined,
        password: crearUsuario ? password : undefined,
      };
      await crearProfesor(payload);
      toast.success("Profesor creado correctamente");
      // Limpiar formulario
      setNombre("");
      setFechaNacimiento("");
      setTipoPago("por_hora");
      setSalarioPorHora(0);
      setSalarioMensual(0);
      setCrearUsuario(false);
      setUsuario("");
      setPassword("");
      cargarDatos();
    } catch (err: any) {
      setError(err.message || "Error al crear profesor");
      console.error(err);
    }
  };

  const iniciarEdicion = (profesor: Profesor) => {
    setEditando(profesor.idProfesor);
    setEditNombre(profesor.nombre);
    setEditFechaNacimiento(profesor.fechaNacimiento || "");
    setEditTipoPago(profesor.tipoPago || "por_hora");
    setEditSalarioPorHora(profesor.salarioPorHora || 0);
    setEditSalarioMensual(profesor.salarioMensual || 0);
  };

  const guardarEdicion = async (idProfesor: string) => {
    try {
      // Actualizar nombre (endpoint existente)
      await renombrarProfesor(idProfesor, editNombre);
      // Actualizar datos extra
      const { actualizarDatosExtraProfesor } = await import("../../services/api");
      await actualizarDatosExtraProfesor(idProfesor, {
        fechaNacimiento: editFechaNacimiento || null,
        salarioPorHora: editTipoPago === "por_hora" ? editSalarioPorHora : 0,
        tipoPago: editTipoPago,
        salarioMensual: editTipoPago === "fijo_mensual" ? editSalarioMensual : 0,
      });
      toast.success("Datos actualizados");
      setEditando(null);
      cargarDatos();
    } catch (err: any) {
      setError(err.message || "Error al actualizar");
      console.error(err);
    }
  };

  const toggleEstatus = async (idProfesor: string, estatusActual: "Activo" | "Inactivo") => {
    try {
      const nuevoEstatus = estatusActual === "Activo" ? "Inactivo" : "Activo";
      await actualizarEstatusProfesor(idProfesor, nuevoEstatus);
      toast.success(`Profesor ${nuevoEstatus.toLowerCase()}`);
      cargarDatos();
    } catch (err: any) {
      setError(err.message || "Error al cambiar estatus");
      console.error(err);
    }
  };

  const eliminar = async (idProfesor: string) => {
    if (!confirm("¿Seguro que deseas eliminar este profesor?")) return;
    try {
      await eliminarProfesor(idProfesor);
      toast.success("Profesor eliminado");
      cargarDatos();
    } catch (err: any) {
      setError(err.message || "Error al eliminar");
      console.error(err);
    }
  };

  if (loading) return <div className="p-4 text-center">Cargando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Gestión de Profesores</h1>

      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

      {/* Formulario de creación */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 border rounded bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Nuevo Profesor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border p-2 rounded"
            required
          />
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            className="border p-2 rounded"
          />
          <select
            value={tipoPago}
            onChange={(e) => setTipoPago(e.target.value as "por_hora" | "fijo_mensual")}
            className="border p-2 rounded"
          >
            <option value="por_hora">Pago por hora</option>
            <option value="fijo_mensual">Pago fijo mensual</option>
          </select>
          {tipoPago === "por_hora" ? (
            <input
              type="number"
              step="0.01"
              placeholder="Salario por hora"
              value={salarioPorHora}
              onChange={(e) => setSalarioPorHora(parseFloat(e.target.value) || 0)}
              className="border p-2 rounded"
            />
          ) : (
            <input
              type="number"
              step="0.01"
              placeholder="Salario mensual"
              value={salarioMensual}
              onChange={(e) => setSalarioMensual(parseFloat(e.target.value) || 0)}
              className="border p-2 rounded"
            />
          )}
        </div>

        {/* Sección para crear usuario */}
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={crearUsuario}
              onChange={(e) => setCrearUsuario(e.target.checked)}
              className="h-4 w-4"
            />
            <label className="font-medium">Crear usuario para este profesor</label>
          </div>
          {crearUsuario && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Usuario (ej. nombre.apellido)"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="border p-2 rounded"
                required={crearUsuario}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border p-2 rounded"
                required={crearUsuario}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full md:w-auto"
        >
          Crear Profesor
        </button>
      </form>

      {/* Lista de profesores */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Fecha Nac.</th>
              <th className="p-2 border">Tipo Pago</th>
              <th className="p-2 border">Salario</th>
              <th className="p-2 border">Usuario</th>
              <th className="p-2 border">Estatus</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {profesores.map((prof) => (
              <tr key={prof.idProfesor} className="border-t">
                {editando === prof.idProfesor ? (
                  // Fila de edición (solo datos profesionales)
                  <>
                    <td className="p-2 border">{prof.idProfesor}</td>
                    <td className="p-2 border">
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="p-2 border">
                      <input
                        type="date"
                        value={editFechaNacimiento}
                        onChange={(e) => setEditFechaNacimiento(e.target.value)}
                        className="border p-1 rounded w-full"
                      />
                    </td>
                    <td className="p-2 border">
                      <select
                        value={editTipoPago}
                        onChange={(e) => setEditTipoPago(e.target.value as "por_hora" | "fijo_mensual")}
                        className="border p-1 rounded w-full"
                      >
                        <option value="por_hora">Por hora</option>
                        <option value="fijo_mensual">Fijo mensual</option>
                      </select>
                    </td>
                    <td className="p-2 border">
                      {editTipoPago === "por_hora" ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editSalarioPorHora}
                          onChange={(e) => setEditSalarioPorHora(parseFloat(e.target.value) || 0)}
                          className="border p-1 rounded w-full"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={editSalarioMensual}
                          onChange={(e) => setEditSalarioMensual(parseFloat(e.target.value) || 0)}
                          className="border p-1 rounded w-full"
                        />
                      )}
                    </td>
                    <td className="p-2 border text-center">
                      {usuariosMap[prof.idProfesor] ? (
                        <span className="text-green-600 flex items-center justify-center gap-1">
                          <CheckCircle className="h-4 w-4" /> {usuariosMap[prof.idProfesor]}
                        </span>
                      ) : (
                        <span className="text-gray-400 flex items-center justify-center gap-1">
                          <XCircle className="h-4 w-4" /> Sin usuario
                        </span>
                      )}
                    </td>
                    <td className="p-2 border">{prof.estatus}</td>
                    <td className="p-2 border">
                      <button
                        onClick={() => guardarEdicion(prof.idProfesor)}
                        className="bg-green-600 text-white px-2 py-1 rounded mr-1"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        className="bg-gray-400 text-white px-2 py-1 rounded"
                      >
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  // Fila normal
                  <>
                    <td className="p-2 border">{prof.idProfesor}</td>
                    <td className="p-2 border">{prof.nombre}</td>
                    <td className="p-2 border">
                      {prof.fechaNacimiento ? new Date(prof.fechaNacimiento).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-2 border">
                      {prof.tipoPago === "fijo_mensual" ? "Fijo Mensual" : "Por Hora"}
                    </td>
                    <td className="p-2 border">
                      {prof.tipoPago === "fijo_mensual" ? `$${prof.salarioMensual}` : `$${prof.salarioPorHora}/h`}
                    </td>
                    <td className="p-2 border text-center">
                      {usuariosMap[prof.idProfesor] ? (
                        <span className="text-green-600 flex items-center justify-center gap-1">
                          <User className="h-4 w-4" /> {usuariosMap[prof.idProfesor]}
                        </span>
                      ) : (
                        <span className="text-gray-400 flex items-center justify-center gap-1">
                          <XCircle className="h-4 w-4" /> Sin usuario
                        </span>
                      )}
                    </td>
                    <td className="p-2 border">{prof.estatus}</td>
                    <td className="p-2 border">
                      <button
                        onClick={() => iniciarEdicion(prof)}
                        className="bg-blue-600 text-white px-2 py-1 rounded mr-1"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleEstatus(prof.idProfesor, prof.estatus)}
                        className={`px-2 py-1 rounded mr-1 ${
                          prof.estatus === "Activo" ? "bg-yellow-600" : "bg-green-600"
                        } text-white`}
                      >
                        {prof.estatus === "Activo" ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => eliminar(prof.idProfesor)}
                        className="bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Eliminar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}