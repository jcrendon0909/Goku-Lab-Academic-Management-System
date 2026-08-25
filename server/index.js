import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

console.log("🔍 [1] Iniciando servidor...");

// ============================================================
// IMPORTACIÓN DE RUTAS
// ============================================================
console.log("🔍 [2] Importando rutas...");

import authRoutes from "./routes/auth.js";
console.log("  ✅ authRoutes importado");

import alumnosRoutes from "./routes/alumnos.js";
console.log("  ✅ alumnosRoutes importado");

import profesoresRoutes from "./routes/profesores.js";
console.log("  ✅ profesoresRoutes importado");

import gruposRoutes from "./routes/grupos.js";
console.log("  ✅ gruposRoutes importado");

import cursosRoutes from "./routes/cursos.js";
console.log("  ✅ cursosRoutes importado");

import inscripcionesRoutes from "./routes/inscripciones.js";
console.log("  ✅ inscripcionesRoutes importado");

import pagosRoutes from "./routes/pagos.js";
console.log("  ✅ pagosRoutes importado");

import abonosRoutes from "./routes/abonos.js";
console.log("  ✅ abonosRoutes importado");

import reagendacionesRoutes from "./routes/reagendaciones.js";
console.log("  ✅ reagendacionesRoutes importado");

import calendarioRoutes from "./routes/calendario.js";
console.log("  ✅ calendarioRoutes importado");

import gastosRoutes from "./routes/gastos.js";
console.log("  ✅ gastosRoutes importado");

import reportesRoutes from "./routes/reportes.js";
console.log("  ✅ reportesRoutes importado");

import usuariosRoutes from "./routes/usuarios.js";
console.log("  ✅ usuariosRoutes importado");

import  tes from "./routes/asistencia.js";
console.log("  ✅ asistenciaRoutes importado");

import cursosVeranoRoutes from "./routes/cursosVerano.js";
console.log("  ✅ cursosVeranoRoutes importado");

import adminRoutes from "./routes/admin.js";
console.log("  ✅ adminRoutes importado");
import asistenciaRoutes from './routes/asistencia.js';

// ✅ NUEVO: Importar rutas de pagos a profesores
import pagosProfesoresRoutes from "./routes/pagosProfesores.js";
console.log("  ✅ pagosProfesoresRoutes importado");

// ============================================================
// WHATSAPP Y CRON (opcional)
// ============================================================
console.log("🔍 [3] Importando WhatsApp y Cron...");
import cron from "node-cron";
import { initWhatsApp, sendWhatsAppMessage, isWhatsAppReady } from "./utils/whatsapp.js";
import Pago from "./models/Pago.js";
console.log("  ✅ WhatsApp y Cron importados");

// ============================================================
// CONFIGURACIÓN DE ENTORNO
// ============================================================
console.log("🔍 [4] Configurando dotenv...");
dotenv.config();
console.log("  ✅ dotenv configurado");

// ============================================================
// CREAR APP EXPRESS
// ============================================================
console.log("🔍 [5] Creando app Express...");
const app = express();
const PORT = process.env.PORT || 4000;
console.log(`  ✅ App creada. Puerto: ${PORT}`);

// ============================================================
// MIDDLEWARES
// ============================================================
console.log("🔍 [6] Configurando middlewares...");
app.use(cors());
console.log("  ✅ CORS configurado");

// ✅ MIDDLEWARE UTF-8 (asegura caracteres especiales)
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
console.log("  ✅ UTF-8 configurado");

app.use(express.json());
console.log("  ✅ JSON parser configurado");
app.use(express.urlencoded({ extended: true }));
console.log("  ✅ URL-encoded parser configurado");

// ============================================================
// CONEXIÓN A MONGODB
// ============================================================
console.log("🔍 [7] Conectando a MongoDB...");
connectDB();
console.log("  ✅ Conexión a MongoDB iniciada (esperando callback)");

// ============================================================
// MONTAR RUTAS
// ============================================================
console.log("🔍 [8] Montando rutas...");
app.use("/auth", authRoutes);
console.log("  ✅ /auth montada");

app.use("/alumnos", alumnosRoutes);
console.log("  ✅ /alumnos montada");

app.use("/profesores", profesoresRoutes);
console.log("  ✅ /profesores montada");

app.use("/grupos", gruposRoutes);
console.log("  ✅ /grupos montada");

app.use("/cursos", cursosRoutes);
console.log("  ✅ /cursos montada");

app.use("/inscripciones", inscripcionesRoutes);
console.log("  ✅ /inscripciones montada");

app.use("/pagos", pagosRoutes);
console.log("  ✅ /pagos montada");

app.use("/abonos", abonosRoutes);
console.log("  ✅ /abonos montada");

app.use("/reagendaciones", reagendacionesRoutes);
console.log("  ✅ /reagendaciones montada");

app.use("/calendario", calendarioRoutes);
console.log("  ✅ /calendario montada");

app.use("/gastos", gastosRoutes);
console.log("  ✅ /gastos montada");

app.use("/reportes", reportesRoutes);
console.log("  ✅ /reportes montada");

app.use("/usuarios", usuariosRoutes);
console.log("  ✅ /usuarios montada");

app.use("/asistencia", asistenciaRoutes);
console.log("  ✅ /asistencia montada");

app.use("/cursos-verano", cursosVeranoRoutes);
console.log("  ✅ /cursos-verano montada");

app.use("/admin", adminRoutes);
console.log("  ✅ /admin montada");

// ✅ NUEVO: Montar rutas de pagos a profesores
app.use("/pagos-profesores", pagosProfesoresRoutes);
console.log("  ✅ /pagos-profesores montada");

// ============================================================
// RUTAS ADICIONALES
// ============================================================
console.log("🔍 [9] Configurando rutas adicionales...");
app.get("/", (req, res) => {
  res.send("API de Goku Lab funcionando");
});
console.log("  ✅ / configurada");

app.get("/test-whatsapp", async (req, res) => {
  try {
    const result = await Promise.race([
      (async () => {
        let intentos = 0;
        while (!isWhatsAppReady() && intentos < 20) {
          await new Promise((r) => setTimeout(r, 500));
          intentos++;
        }
        if (!isWhatsAppReady()) {
          throw new Error("WhatsApp no está listo después de 10 segundos.");
        }
        await sendWhatsAppMessage("525555052424", "Hola, esto es una prueba desde Goku Lab.");
        return { ok: true, mensaje: "Mensaje enviado" };
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: la operación tardó más de 15 segundos")), 15000)
      ),
    ]);
    res.json(result);
  } catch (error) {
    console.error("❌ Error en /test-whatsapp:", error.message);
    if (error.message.includes("no está listo") || error.message.includes("Timeout")) {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});
console.log("  ✅ /test-whatsapp configurada");

// ============================================================
// MANEJO DE ERRORES GLOBAL
// ============================================================
console.log("🔍 [10] Configurando middleware de errores...");
app.use((err, req, res, next) => {
  console.error("❌ Error global:", err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});
console.log("  ✅ Middleware de errores configurado");

// ============================================================
// INICIALIZAR WHATSAPP (ASÍNCRONO)
// ============================================================
console.log("🔍 [11] Iniciando WhatsApp (asíncrono)...");
const startWhatsApp = async () => {
  console.log("⏳ Iniciando cliente de WhatsApp...");
  try {
    await initWhatsApp();
    console.log("✅ WhatsApp Business listo para usar.");
  } catch (error) {
    console.error("❌ No se pudo iniciar WhatsApp:", error.message);
  }
};

// ============================================================
// CRON JOB (RECORDATORIOS)
// ============================================================
console.log("🔍 [12] Configurando Cron job...");
cron.schedule("0 8 * * *", async () => {
  console.log("⏰ Ejecutando recordatorios de pago por WhatsApp...");
  if (!isWhatsAppReady()) {
    console.warn("⚠️ WhatsApp no está listo. Reintentando conectar...");
    try {
      await initWhatsApp();
    } catch (e) {
      console.error("❌ No se pudo reconectar WhatsApp.");
      return;
    }
  }
  try {
    const hoy = new Date().getDate();
    const pagosPendientes = await Pago.find({
      diaPago: hoy,
      estatus: "pendiente",
    }).populate("idAlumno");
    console.log(`📋 Encontrados ${pagosPendientes.length} pagos pendientes.`);
    for (const pago of pagosPendientes) {
      const alumno = pago.idAlumno;
      if (alumno && alumno.telefono) {
        const mensaje = `
Hola ${alumno.nombreAlumno || "estudiante"},
Te recordamos que tu pago mensual de $${pago.montoMensualidad || "0"} está pendiente.
Fecha de corte: ${pago.diaPago} de cada mes.
Realiza tu pago a través de los medios disponibles en Goku Lab.
¡Gracias por confiar en nosotros!
- Goku Lab Team
        `.trim();
        try {
          await sendWhatsAppMessage(alumno.telefono, mensaje);
          console.log(`📩 Recordatorio enviado a ${alumno.nombreAlumno} (${alumno.telefono})`);
        } catch (error) {
          console.error(`❌ Falló envío a ${alumno.nombreAlumno}:`, error.message);
        }
      } else {
        console.warn(`⚠️ Alumno sin teléfono para el pago ${pago._id}`);
      }
    }
    console.log("✅ Proceso de recordatorios finalizado.");
  } catch (error) {
    console.error("❌ Error en cron de recordatorios:", error);
  }
});
console.log("⏰ Cron job de recordatorios programado para las 8:00 AM.");

// ============================================================
// INICIAR SERVIDOR
// ============================================================
console.log("🔍 [13] Iniciando servidor HTTP...");
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
console.log("🔍 [14] app.listen() ejecutado (el servidor debería estar escuchando)");