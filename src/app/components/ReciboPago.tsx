import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../services/api';
import { useReactToPrint } from 'react-to-print';

interface ReciboPagoProps {
  pagoId: string;
  onClose: () => void;
}

export function ReciboPago({ pagoId, onClose }: ReciboPagoProps) {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch(`/reportes/pagos/${pagoId}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, [pagoId]);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  if (cargando) return <div className="p-4 text-center">Cargando recibo...</div>;
  if (!data) return <div className="p-4 text-center">No se encontró el pago</div>;

  const { pago, abonos, totalAbonado } = data;
  const alumno = pago.idAlumno || {};

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div ref={componentRef} className="p-4 bg-white">
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">Recibo de Pago</h2>
            <p className="text-sm text-gray-600">Av. Vía Adolfo López Mateos 201-local 418 b, Sta Cruz Acatlan, Naucalpan</p>
          </div>

          <div className="grid grid-cols-2 gap-2 my-4">
            <p><strong>Folio:</strong> {pago.folio || 'AL/CF/2026-6-R036'}</p>
            <p><strong>Fecha de pago:</strong> {new Date(pago.fechaPago || Date.now()).toLocaleDateString()}</p>
            <p><strong>Fecha de consulta:</strong> {new Date().toLocaleString()}</p>
          </div>

          <h3 className="font-semibold text-lg mt-4 mb-2">DETALLES:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><strong>Estudiante:</strong> {alumno.nombreAlumno || 'N/A'}</p>
            <p><strong>Concepto:</strong> {pago.concepto || 'Mensualidad'}</p>
            <p><strong>Forma de Pago:</strong> {abonos[0]?.metodoAbono || pago.metodoPago || 'N/A'}</p>
            <p><strong>Facturación:</strong> {pago.facturaRequerida ? 'Solicitada' : 'No solicitada'}</p>
            <p><strong>Recibido por:</strong> {pago.recibidoPor || 'SYSTEM'}</p>
          </div>

          <div className="mt-4 border-t pt-4">
            <p><strong>Observaciones:</strong> {pago.observaciones || 'No aplica'}</p>
            <div className="flex justify-end mt-2">
              <p className="text-xl font-bold">Total: ${totalAbonado.toFixed(2)}</p>
            </div>
          </div>

          <div className="text-center mt-6 border-t pt-4 text-sm text-gray-600">
            <p>¡Gracias por tu pago!</p>
            <p>Tienes hasta antes último jueves del mes para solicitar tu factura.</p>
            <p>- Goku Lab Team</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cerrar</button>
          <button onClick={handlePrint} className="px-4 py-2 bg-[#26AAA3] text-white rounded-lg">Imprimir / PDF</button>
        </div>
      </div>
    </div>
  );
}