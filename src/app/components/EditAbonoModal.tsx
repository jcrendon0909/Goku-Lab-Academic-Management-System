import React, { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface EditAbonoModalProps {
  abono: any;
  onClose: () => void;
  onConfirm: (abonoId: string, data: any) => Promise<void>;
}

export function EditAbonoModal({ abono, onClose, onConfirm }: EditAbonoModalProps) {
  const [monto, setMonto] = useState<number | string>(abono.montoAbono || 0);
  const [metodo, setMetodo] = useState<string>(abono.metodoAbono || 'Efectivo');
  const [fecha, setFecha] = useState<string>(
    abono.fechaAbono ? new Date(abono.fechaAbono).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [notas, setNotas] = useState<string>(abono.notas || '');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setCargando(true);
    try {
      await onConfirm(abono.abonoId, {
        montoAbono: montoNum,
        metodoAbono: metodo,
        fechaAbono: fecha,
        notas: notas.trim(),
      });
      toast.success('Abono actualizado correctamente');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al editar abono');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-purple-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-white font-black text-lg leading-tight">Editar Abono</h2>
            <p className="text-purple-100 text-xs font-medium mt-0.5">
              {abono.nombreAlumno} • {abono.abonoId}
            </p>
          </div>
          <button onClick={onClose} className="text-purple-100 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Método
              </label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Notas
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Corrección de monto..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 shadow-sm shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}