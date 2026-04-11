import React, { useState } from "react";
import { Calendar as CalendarIcon, X, AlertCircle } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Payment } from "../App";
import "react-day-picker/dist/style.css";

interface RescheduleModalProps {
  payment: Payment;
  onClose: () => void;
  onSave: (newDate: Date, reason: string) => void;
}

export function RescheduleModal({ payment, onClose, onSave }: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(payment.date);
  const [reason, setReason] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState(false);

  const handleSave = () => {
    if (!reason.trim() || !selectedDate) {
      setError(true);
      return;
    }
    onSave(selectedDate, reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Reagendar Pago</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-cyan-50 p-4 rounded-xl flex items-start gap-3 border border-cyan-100">
            <AlertCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-cyan-900 font-semibold">Alumno: {payment.studentName}</p>
              <p className="text-cyan-700">Monto actual: ${payment.amount}</p>
            </div>
          </div>

          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nueva Fecha</label>
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm hover:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            >
              <span className="font-medium text-gray-700">
                {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
              </span>
              <CalendarIcon className="w-4 h-4 text-cyan-500" />
            </button>

            {showCalendar && (
              <div className="absolute top-full left-0 mt-2 z-10 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 animate-in slide-in-from-top-2">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }}
                  locale={es}
                  styles={{
                    caption: { color: "#0891b2" },
                    head_cell: { color: "#6b7280", fontWeight: "bold" },
                    day_selected: { backgroundColor: "#0891b2", color: "white" },
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo del reagendamiento *</label>
              {error && !reason.trim() && <span className="text-[10px] text-red-500 font-bold uppercase">Requerido</span>}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: El padre solicitó cambio de fecha por viaje..."
              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none ${
                error && !reason.trim() ? 'border-red-300' : 'border-gray-200'
              }`}
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
