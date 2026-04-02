import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "goku_lab",
      family: 4
    });

    console.log("MongoDB conectado correctamente");
    console.log("Base usada:", mongoose.connection.name);
  } catch (error) {
    console.error("Error al conectar MongoDB:", error.message);
    process.exit(1);
  }
}; 