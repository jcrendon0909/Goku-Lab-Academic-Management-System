import { useState } from 'react';
import { crearReagendacion } from '../../services/api';

interface ReagendacionFormProps {
  data: any;
  onClose: () => void;
}

export default function ReagendacionForm({ data, onClose }: ReagendacionFormProps) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState('2 horas');
  const [profesorNuevo, setProfesorNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = async () => {
  try {
    setGuardando(true);

    const payload = {
      _id: data.ragendacion._id,
      ReagendacionId: `REA${Date.now()}`,
      idAlumno: data.alumno.idAlumno,
      nombreAlumno: data.alumno.nombreAlumno,
      IdgrupoOrigen: data.clase.idGrupo,
      idGrupoNuevo: data.clase.idGrupo,
      nombreCurso: data.clase.title,
      profesorOriginal: data.clase.teacher?.name || '',
      profesorNuevo: profesorNuevo || data.clase.teacher?.name || '',
      fechaHoraOriginal: `${new Date(data.clase.date).toISOString()} ${data.clase.startTime}`,
      fechaHoraNueva: `${fecha} ${hora}`,
      motivo: 'Reagendado desde sistema',
      FechaMovimiento: new Date().toISOString(),
      estatus: 'reagendado'
    };

    console.log('PAYLOAD REAGENDACION:', payload);

    await crearReagendacion(payload);

    alert('Reagendación guardada correctamente');
    onClose();
  } catch (error) {
    console.error(error);
    alert('Error al guardar la reagendación');
  } finally {
    setGuardando(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Reprogramación de Clase</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <p className="text-sm text-cyan-600 font-medium">
          Para {data.alumno.nombreAlumno}
        </p>

        <div className="border rounded-xl p-4">
          <h3 className="font-semibold mb-3">Clase Original</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Materia</div>
              <div className="font-medium">{data.clase.title}</div>
            </div>
            <div>
              <div className="text-gray-500">Profesor</div>
              <div className="font-medium">{data.clase.teacher?.name}</div>
            </div>
            <div>
              <div className="text-gray-500">Horario Original</div>
              <div className="font-medium">
                {data.clase.startTime} - {data.clase.endTime}
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-4 space-y-4">
          <h3 className="font-semibold">Nueva Fecha, Hora y Duración</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Hora de Inicio</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Duración</label>
              <select
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option>1 hora</option>
                <option>2 horas</option>
                <option>3 horas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Profesor nuevo</label>
            <input
              type="text"
              value={profesorNuevo}
              onChange={(e) => setProfesorNuevo(e.target.value)}
              placeholder="Opcional"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          Esta clase quedará marcada como <strong>“Reprogramado”</strong>.
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border">
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={guardando}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Confirmar Reprogramación'}
          </button>
        </div>
      </div>
    </div>
  );
}