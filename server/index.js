import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

// Importación de rutas existentes
import authRoutes from "./routes/auth.js";
import alumnosRoutes from "./routes/alumnos.js";
import profesoresRoutes from "./routes/profesores.js";
import gruposRoutes from "./routes/grupos.js";
import cursosRoutes from "./routes/cursos.js";
import inscripcionesRoutes from "./routes/inscripciones.js";
import pagosRoutes from "./routes/pagos.js";
import abonosRoutes from "./routes/abonos.js";
import reagendacionesRoutes from "./routes/reagendaciones.js";
import calendarioRoutes from "./routes/calendario.js";

// ===== NUEVAS RUTAS =====
import gastosRoutes from "./routes/gastos.js";
import reportesRoutes from "./routes/reportes.js";
import usuariosRoutes from "./routes/usuarios.js";

// ===== WHATSAPP Y CRON =====
import cron from "node-cron";
import { initWhatsApp, sendWhatsAppMessage, isWhatsAppReady } from "./utils/whatsapp.js";
import Pago from "./models/Pago.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB
connectDB();

// ==== RUTAS ====
app.use('/auth', authRoutes);
app.use('/alumnos', alumnosRoutes);
app.use('/profesores', profesoresRoutes);
app.use('/grupos', gruposRoutes);
app.use('/cursos', cursosRoutes);
app.use('/inscripciones', inscripcionesRoutes);
app.use('/pagos', pagosRoutes);
app.use('/abonos', abonosRoutes);
app.use('/reagendaciones', reagendacionesRoutes);
app.use('/calendario', calendarioRoutes);
app.use('/gastos', gastosRoutes);
app.use('/reportes', reportesRoutes);
app.use('/usuarios', usuariosRoutes);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API de Goku Lab funcionando");
});

// ============================================================
// Ruta de prueba para WhatsApp (MODIFICADA)
// ============================================================
// ============================================================
// Ruta de prueba para WhatsApp (CON TIMEOUT Y MANEJO ROBUSTO)
// ============================================================
app.get("/test-whatsapp", async (req, res) => {
  try {
    // Timeout de 15 segundos para toda la operación
    const result = await Promise.race([
      (async () => {
        // Esperar hasta que WhatsApp esté listo (máximo 10 segundos)
        let intentos = 0;
        while (!isWhatsAppReady() && intentos < 20) {
          await new Promise(r => setTimeout(r, 500));
          intentos++;
        }
        if (!isWhatsAppReady()) {
          throw new Error('WhatsApp no está listo después de 10 segundos.');
        }
        // Enviar mensaje
        await sendWhatsAppMessage("525555052424", "Hola, esto es una prueba desde Goku Lab.");
        return { ok: true, mensaje: "Mensaje enviado" };
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: la operación tardó más de 15 segundos')), 15000))
    ]);
    res.json(result);
  } catch (error) {
    console.error("❌ Error en /test-whatsapp:", error.message);
    // Si el error es de timeout o de cliente no listo, devolver 503
    if (error.message.includes('no está listo') || error.message.includes('Timeout')) {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});
// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// ============================================================
// INICIALIZAR WHATSAPP (de forma explícita y con logs)
// ============================================================
const startWhatsApp = async () => {
  console.log('⏳ Iniciando cliente de WhatsApp...');
  try {
    await initWhatsApp();
    console.log("✅ WhatsApp Business listo para usar.");
  } catch (error) {
    console.error("❌ No se pudo iniciar WhatsApp:", error.message);
    // No detenemos el servidor, solo mostramos el error
  }
};

// ============================================================
// ARRANQUE DEL SERVIDOR
// ============================================================
const startServer = async () => {
  try {
    // Conectar a MongoDB (ya está conectado arriba, pero lo dejamos)
    console.log('✅ MongoDB conectado');
    
    // Iniciar WhatsApp (NO BLOQUEA el servidor)
    startWhatsApp();

    // ============================================================
    // CRON JOB PARA RECORDATORIOS
    // ============================================================
    cron.schedule('0 8 * * *', async () => {
      console.log('⏰ Ejecutando recordatorios de pago por WhatsApp...');
      
      if (!isWhatsAppReady()) {
        console.warn('⚠️ WhatsApp no está listo. Reintentando conectar...');
        try {
          await initWhatsApp();
        } catch (e) {
          console.error('❌ No se pudo reconectar WhatsApp.');
          return;
        }
      }

      try {
        const hoy = new Date().getDate();
        const pagosPendientes = await Pago.find({
          diaPago: hoy,
          estatus: 'pendiente'
        }).populate('idAlumno');

        console.log(`📋 Encontrados ${pagosPendientes.length} pagos pendientes.`);

        for (const pago of pagosPendientes) {
          const alumno = pago.idAlumno;
          if (alumno && alumno.telefono) {
            const mensaje = `
Hola ${alumno.nombreAlumno || 'estudiante'},

Te recordamos que tu pago mensual de $${pago.montoMensualidad || '0'} está pendiente.

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

        console.log('✅ Proceso de recordatorios finalizado.');
      } catch (error) {
        console.error('❌ Error en cron de recordatorios:', error);
      }
    });

    console.log("⏰ Cron job de recordatorios programado para las 8:00 AM.");

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Ejecutar inicio
startServer();