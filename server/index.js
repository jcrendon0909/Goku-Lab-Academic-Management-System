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
import usuariosRoutes from './routes/usuarios.js';
// ...
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auth', authRoutes);
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
app.use("/api/auth", authRoutes);
app.use("/api/alumnos", alumnosRoutes);
app.use("/api/profesores", profesoresRoutes);
app.use("/api/grupos", gruposRoutes);
app.use("/api/cursos", cursosRoutes);
app.use("/api/inscripciones", inscripcionesRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/abonos", abonosRoutes);
app.use("/api/reagendaciones", reagendacionesRoutes);
app.use("/api/calendario", calendarioRoutes);

// ===== NUEVAS RUTAS =====
app.use("/api/gastos", gastosRoutes);
app.use("/api/reportes", reportesRoutes);

// Ruta de prueba (opcional)
app.get("/", (req, res) => {
  res.send("API de Goku Lab funcionando");
});

// Manejo de errores global (opcional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});