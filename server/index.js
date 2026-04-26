import 'dotenv/config';
console.log("CONTENIDO DE LA URI:", process.env.MONGODB_URI);

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import gruposRoutes from "./routes/grupos.js";
import inscripcionesRoutes from "./routes/inscripciones.js";
import reagendacionesRoutes from "./routes/reagendaciones.js";
import calendarioRoutes from "./routes/calendario.js";
import pagosRoutes from './routes/pagos.js';
import abonosRouter from "./routes/abonos.js";
import profesoresRoutes from "./routes/profesores.js";

dotenv.config({ path: "./server/.env" });

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.json({ ok: true, message: "API funcionando 🚀" });
});

app.use("/api/grupos", gruposRoutes);
app.use("/api/inscripciones", inscripcionesRoutes);
app.use("/api/reagendaciones", reagendacionesRoutes);
app.use("/api/calendario", calendarioRoutes);
app.use('/api/pagos', pagosRoutes);
app.use("/api/abonos", abonosRouter);
app.use("/api/profesores", profesoresRoutes);
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});