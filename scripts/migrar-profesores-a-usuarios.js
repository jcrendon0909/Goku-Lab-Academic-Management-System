import 'dotenv/config';
import { connectDB } from "../server/config/db.js";
import Profesor from "../server/models/Profesor.js";
import Usuario from "../server/models/Usuario.js";
import bcrypt from "bcryptjs";

const run = async () => {
  try {
    await connectDB();
    console.log("🔍 Buscando profesores sin usuario...");

    // Obtener todos los profesores activos
    const profesores = await Profesor.find({ estatus: "Activo" }).lean();
    console.log(`📊 Total profesores activos: ${profesores.length}`);

    // Obtener IDs de profesores que ya tienen usuario
    const usuariosExistentes = await Usuario.find({ idProfesor: { $ne: "" } }).lean();
    const idsConUsuario = usuariosExistentes.map((u) => u.idProfesor);
    console.log(`👤 Profesores con usuario: ${idsConUsuario.length}`);

    // Filtrar profesores sin usuario
    const profesoresSinUsuario = profesores.filter(
      (p) => !idsConUsuario.includes(p.idProfesor)
    );
    console.log(`🚀 Profesores sin usuario: ${profesoresSinUsuario.length}`);

    if (profesoresSinUsuario.length === 0) {
      console.log("✅ Todos los profesores ya tienen usuario.");
      process.exit(0);
    }

    // Crear usuarios para cada profesor
    let creados = 0;
    for (const prof of profesoresSinUsuario) {
      // Generar nombre de usuario a partir del nombre del profesor
      const nombreUsuario = prof.nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // eliminar tildes
        .replace(/[^a-z0-9]/g, ".") // reemplazar espacios y caracteres especiales por punto
        .replace(/\.+/g, ".") // evitar puntos múltiples
        .replace(/^\.|\.$/g, ""); // quitar puntos al inicio o final

      // Si el nombre de usuario ya existe, agregar un sufijo
      let usuarioFinal = nombreUsuario;
      let contador = 1;
      let existe = await Usuario.findOne({ usuario: usuarioFinal });
      while (existe) {
        usuarioFinal = `${nombreUsuario}${contador}`;
        existe = await Usuario.findOne({ usuario: usuarioFinal });
        contador++;
      }

      const passwordTemporal = "gokulab2026";
      const hashedPassword = await bcrypt.hash(passwordTemporal, 10);

      const nuevoUsuario = new Usuario({
        usuario: usuarioFinal,
        password: hashedPassword,
        nombreCompleto: prof.nombre,
        rol: "profesor",
        idProfesor: prof.idProfesor,
      });

      await nuevoUsuario.save();
      creados++;
      console.log(
        `✅ Usuario creado: ${usuarioFinal} (${prof.idProfesor} - ${prof.nombre})`
      );
    }

    console.log(`🎉 Migración completada. ${creados} usuarios creados.`);
    console.log(`🔑 Contraseña temporal para todos: "gokulab2026"`);
    console.log(
      "ℹ️  Los profesores deberán cambiar su contraseña al iniciar sesión."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en la migración:", error);
    process.exit(1);
  }
};

run();