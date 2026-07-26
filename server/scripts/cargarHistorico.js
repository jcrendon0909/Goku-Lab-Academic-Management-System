// server/scripts/cargaDirecta.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const EXCEL_PATH = path.join(__dirname, "REGISTRO DE PAGOS.xlsx");
const ANIO_CARGA = 2026;

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log("✅ Conectado a MongoDB");

const db = client.db(); // usa la base de datos de la URI

// Leer Excel
const workbook = XLSX.readFile(EXCEL_PATH);
const sheets = workbook.SheetNames;
const hojas2026 = sheets.filter(name => 
  name.includes("26") && !name.includes("25") && 
  !["ALUMNO", "CAJA", "EFECTIVO", "DATOS DE FACTURACIÓN", "ENVIOS DE COMPROBANTES", "HISTORIALES", "Hoja1"].includes(name)
);

console.log(`📅 Procesando hojas: ${hojas2026.join(", ")}`);

// Contadores
let contAlumnos = await db.collection("alumnos").countDocuments();
let contCursos = await db.collection("cursos").countDocuments();
let contGrupos = await db.collection("grupos").countDocuments();
let contPagos = await db.collection("pago").countDocuments();
let contAbonos = await db.collection("abonos").countDocuments();

const alumnosMap = new Map();
const cursosMap = new Map();
const gruposMap = new Map();

const generarId = (prefijo, contador) => `${prefijo}${String(contador).padStart(3, "0")}`;
const normalizarNombre = (nombre) => String(nombre).trim().replace(/\s+/g, " ");

const parseFecha = (fechaStr) => {
  if (!fechaStr) return null;
  if (fechaStr instanceof Date) return fechaStr;
  if (typeof fechaStr === 'number') {
    const fecha = new Date((fechaStr - 25569) * 86400 * 1000);
    if (!isNaN(fecha)) return fecha;
  }
  const str = String(fechaStr).trim();
  if (!str) return null;
  const partes = str.split(/[\/\-]/);
  if (partes.length === 3) {
    let dia = parseInt(partes[0]);
    let mes = parseInt(partes[1]) - 1;
    let anio = parseInt(partes[2]);
    if (anio < 100) anio += 2000;
    if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio)) {
      const fecha = new Date(anio, mes, dia);
      if (!isNaN(fecha)) return fecha;
    }
  }
  const fecha = new Date(str);
  if (!isNaN(fecha)) return fecha;
  return null;
};

for (const sheetName of hojas2026) {
  console.log(`\n📄 Procesando hoja: ${sheetName}`);
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

  // Buscar encabezados
  let headerRowIndex = -1;
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && row.length > 0 && String(row[0] || "").trim().toUpperCase() === "FECHA") {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) continue;

  const headers = rawData[headerRowIndex].map(h => String(h || "").trim().toUpperCase());
  const colMap = {
    fecha: headers.findIndex(h => h.includes("FECHA")),
    estudiante: headers.findIndex(h => h.includes("ESTUDIANTE") || h.includes("ALUMNO")),
    monto: headers.findIndex(h => h.includes("MONTO")),
    metodo: headers.findIndex(h => h.includes("MÉTODO") || h.includes("METODO")),
    concepto: headers.findIndex(h => h.includes("CONCEPTO")),
    factura: headers.findIndex(h => h.includes("FACTURA")),
    recibido: headers.findIndex(h => h.includes("RECIBIDO")),
    observaciones: headers.findIndex(h => h.includes("OBSERVACIONES")),
  };

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;
    const isEmpty = row.every(cell => !cell || String(cell).trim() === "");
    if (isEmpty) continue;
    const firstCell = String(row[0] || "").trim();
    if (firstCell.includes("Cambio de terminal") || firstCell.includes("CORTE DE FACTURACIÓN")) continue;

    const fechaRaw = row[colMap.fecha] || "";
    const estudianteRaw = row[colMap.estudiante] || "";
    const montoRaw = row[colMap.monto] || 0;
    if (!fechaRaw || !estudianteRaw) continue;

    const fechaObj = parseFecha(fechaRaw);
    if (!fechaObj || isNaN(fechaObj)) continue;
    if (fechaObj.getFullYear() !== ANIO_CARGA) continue;

    const monto = parseFloat(montoRaw) || 0;
    if (monto <= 0) continue;

    const metodo = row[colMap.metodo] || "Efectivo";
    const concepto = row[colMap.concepto] || "Mensualidad";
    const factura = row[colMap.factura] || "No solicitada";
    const observaciones = row[colMap.observaciones] || "";

    // ===== ALUMNO =====
    const nombreAlumno = normalizarNombre(estudianteRaw);
    let alumno = alumnosMap.get(nombreAlumno);
    if (!alumno) {
      contAlumnos++;
      const idAlumno = generarId("ALU", contAlumnos);
      alumno = { idAlumno, nombreAlumno, telefono: "", email: "", estatus: "Activo" };
      await db.collection("alumnos").insertOne(alumno);
      alumnosMap.set(nombreAlumno, alumno);
      console.log(`   👤 Alumno: ${idAlumno} - ${nombreAlumno}`);
    }

    // ===== CURSO =====
    let nombreCurso = normalizarNombre(concepto);
    if (nombreCurso.includes("Mensualidad")) nombreCurso = "Curso general";
    let idCurso = cursosMap.get(nombreCurso);
    if (!idCurso) {
      contCursos++;
      idCurso = generarId("CUR", contCursos);
      await db.collection("cursos").insertOne({ idCurso, nombreCurso, precioMensualidad: monto, estatus: "Activo" });
      cursosMap.set(nombreCurso, idCurso);
      console.log(`   📚 Curso: ${idCurso} - ${nombreCurso}`);
    }

    // ===== GRUPO =====
    const keyGrupo = `${idCurso}|Lunes|10:00`;
    let idGrupo = gruposMap.get(keyGrupo);
    if (!idGrupo) {
      contGrupos++;
      idGrupo = generarId("GRU", contGrupos);
      const profesorEjemplo = await db.collection("profesores").findOne({ estatus: "Activo" });
      await db.collection("grupos").insertOne({
        IdGrupo: idGrupo, idCurso, nombreCurso,
        diaClase: "Lunes", horaClase: "10:00", duracionClase: "1:30 hr",
        idProfesor: profesorEjemplo?.idProfesor || "", nombreProfesor: profesorEjemplo?.nombre || "",
        precioMensualidad: monto, CapacidadMaxima: 20, Estatus: "Activo", fechaCreacion: fechaObj
      });
      gruposMap.set(keyGrupo, idGrupo);
      console.log(`   🏫 Grupo: ${idGrupo} - ${nombreCurso}`);
    }

    // ===== INSCRIPCIÓN =====
    const inscripcionExistente = await db.collection("inscripciones").findOne({
      idAlumno: alumno.idAlumno, grupoId: idGrupo, estatus: "Activa"
    });
    if (!inscripcionExistente) {
      await db.collection("inscripciones").insertOne({
        idAlumno: alumno.idAlumno, nombreAlumno: alumno.nombreAlumno, grupoId: idGrupo,
        modalidad: "Presencial", montoMensualidad: monto, diaPago: fechaObj.getDate(),
        fechaInicioPago: fechaObj, comentarios: observaciones, fechaInscripcion: fechaObj,
        estatus: "Activa"
      });
      console.log(`   📝 Inscripción: ${alumno.idAlumno} -> ${idGrupo}`);
    }

    // ===== PAGO =====
    const periodo = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth()+1).padStart(2,"0")}`;
    let pago = await db.collection("pago").findOne({ idAlumno: alumno.idAlumno, grupoId: idGrupo, periodo });
    if (!pago) {
      contPagos++;
      const idPago = generarId("PAG", contPagos);
      const docPago = {
        pagoId: idPago, idAlumno: alumno.idAlumno, grupoId: idGrupo,
        nombreAlumno: alumno.nombreAlumno, nombreCurso,
        montoPago: monto, diaPago: fechaObj.getDate(),
        fechaInicioPago: fechaObj, periodo,
        metodoPago: metodo, estatus: "Pagado",
        facturaRequerida: factura.toLowerCase().includes("solicitada"),
        notas: observaciones,
        fechaPago: fechaObj,
        activo: true,
        mesCorrespondiente: fechaObj.toLocaleString('es', { month: 'short' }).toUpperCase(),
        anio: fechaObj.getFullYear()
      };
      await db.collection("pago").insertOne(docPago);
      console.log(`   💰 Pago: ${idPago} - ${periodo}`);
    } else {
      await db.collection("pago").updateOne(
        { _id: pago._id },
        { $inc: { montoPago: monto } }
      );
      console.log(`   💰 Pago actualizado: ${pago.pagoId}`);
    }

    // ===== ABONO =====
    contAbonos++;
    const idAbono = generarId("ABO", contAbonos);
    await db.collection("abonos").insertOne({
      abonoId: idAbono,
      pagoId: pago ? pago.pagoId : null,
      idAlumno: alumno.idAlumno,
      grupoId: idGrupo,
      nombreAlumno: alumno.nombreAlumno,
      montoAbono: monto,
      metodoAbono: metodo,
      fechaAbono: fechaObj,
      notas: observaciones
    });
  }
}

console.log("\n✅ Carga completada.");
console.log(`👤 Alumnos: ${contAlumnos}`);
console.log(`📚 Cursos: ${contCursos}`);
console.log(`🏫 Grupos: ${contGrupos}`);
console.log(`💳 Pagos: ${contPagos}`);
console.log(`🧾 Abonos: ${contAbonos}`);

await client.close();
console.log("🔌 Desconectado.");