import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/jwtSecret.js";

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.slice(7);

  try {
    const secret = getJwtSecret();
    req.user = jwt.verify(token, secret);
    next();
  } catch (err) {
    if (err.message?.includes("JWT_SECRET")) {
      console.error(err.message);
      return res.status(500).json({ error: "Servidor no configurado" });
    }
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

/**
 * Restringe el acceso a uno o más roles. Usar después de verifyToken.
 * Ej: apiProtegida.use("/pagos", requireRole("admin"), pagosRoutes)
 */
export function requireRole(...rolesPermitidos) {
  const permitidos = rolesPermitidos.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    const rol = String(req.user?.rol || "").toLowerCase();
    if (!permitidos.includes(rol)) {
      return res.status(403).json({
        error: "No tienes permisos para acceder a este recurso",
      });
    }
    next();
  };
}
