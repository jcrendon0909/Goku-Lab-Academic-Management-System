/** Resuelve el grupoId real de la inscripción (no el id virtual del calendario). */
export function resolverGrupoIdInscripcion(
  student?: {
    grupoIdInscripcion?: string;
    idAlumno?: string;
  } | null,
  classData?: {
    idGrupo?: string;
    idGrupoOrigen?: string;
  } | null
): string {
  const inscripcion = String(student?.grupoIdInscripcion || "").trim();
  if (inscripcion) return inscripcion;

  const origenClase = String(classData?.idGrupoOrigen || "").trim();
  if (origenClase) return origenClase;

  const idGrupoClase = String(classData?.idGrupo || "").trim();
  const upper = idGrupoClase.toUpperCase();
  if (upper.startsWith("VIRTUAL_") || upper.startsWith("REAGENDACION_")) {
    return "";
  }

  return idGrupoClase;
}
