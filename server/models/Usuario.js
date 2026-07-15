import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema(
  {
    usuario: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nombreCompleto: { type: String, required: true },
    rol: {
      type: String,
      enum: ["admin", "profesor", "recepcion"],
      default: "profesor",
    },
    idProfesor: { type: String, default: "" }, // Vinculación con profesor

    // ===== CAMPOS PARA RESET DE CONTRASEÑA =====
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  {
    collection: "usuarios",
    timestamps: true,
  }
);

const Usuario = mongoose.model("Usuario", usuarioSchema);
export default Usuario;