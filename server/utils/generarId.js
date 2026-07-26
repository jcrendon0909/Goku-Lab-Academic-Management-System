import Counter from "../models/Counter.js";

const prefijos = {
  alumno: 'ALU',
  profesor: 'PROF',
  grupo: 'GRU',
  curso: 'CUR',
  inscripcion: 'INS',
  pago: 'PAG',
  abono: 'ABO',
  reagendacion: 'REA',
  usuario: 'USR',
  cursoVerano: 'CV',
};

export const generarId = async (tipo) => {
  const prefijo = prefijos[tipo];
  if (!prefijo) {
    throw new Error(`Tipo de ID desconocido: ${tipo}`);
  }

  // Obtener el siguiente número de secuencia usando el modelo Counter
  const counter = await Counter.findOneAndUpdate(
    { nombre: tipo },
    { $inc: { secuencia: 1 } },
    { new: true, upsert: true, returnDocument: 'after' }
  );

  const numero = String(counter.secuencia).padStart(3, '0');
  return `${prefijo}${numero}`;
};