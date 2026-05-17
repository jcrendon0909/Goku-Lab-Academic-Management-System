import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Usuario from './models/Usuario.js';

dotenv.config({ path: "./.env" });

const listaAdmins = [
    { usuario: "Claudia.Sierra", nombreCompleto: "Claudia Sierra Magaña", clave: "admin123" },
    { usuario: "Juan.Rendon", nombreCompleto: "Juan Carlos Rendón Aguilar", clave: "admin123" },
    { usuario: "Marco", nombreCompleto: "Marco", clave: "admin123" }
];

const inicializarAdministradores = async () => {
    try {
        const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gokulab";
        await mongoose.connect(URI);
        console.log("?? Conectado a MongoDB...");

        console.log("\nVerificando lista de administradores...");
        console.log("=======================================");

        for (const adminInfo of listaAdmins) {
            const existeUser = await Usuario.findOne({ usuario: adminInfo.usuario.toLowerCase() });

            if (existeUser) {
                console.log(`El usuario '${adminInfo.usuario}' ya existe. Saltando...`);
                continue; 
            }

            const salt = await bcrypt.genSalt(10);
            const contrasenaEncriptada = await bcrypt.hash(adminInfo.clave, salt);

            const nuevoUsuario = new Usuario({
                usuario: adminInfo.usuario,
                password: contrasenaEncriptada,
                nombreCompleto: adminInfo.nombreCompleto,
                rol: "admin" 
            });

            await nuevoUsuario.save();
            console.log(`¡Usuario '${adminInfo.usuario}' creado con éxito!`);
        }

        console.log("=======================================");
        console.log("Proceso de inicialización terminado.\n");
        process.exit(0);

    } catch (error) {
        console.error("Error en el servidor al inicializar:", error);
        process.exit(1);
    }
};

inicializarAdministradores();