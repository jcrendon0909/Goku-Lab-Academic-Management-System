export function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET es obligatorio en producción");
  }
  console.warn(
    "[auth] JWT_SECRET no definido; usando valor de desarrollo. Configura server/.env"
  );
  return "dev-goku-lab-cambiar-en-produccion";
}
