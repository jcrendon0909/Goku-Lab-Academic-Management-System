#!/bin/bash
# Genera un paquete con todos los archivos clave para transferir al chat nuevo

# Ir SIEMPRE a la carpeta donde está este script (raíz del proyecto)
cd "$(dirname "$0")" || exit 1

echo "📁 Directorio de trabajo: $(pwd)"
echo ""

# Verificar que estamos en la raíz del proyecto
if [ ! -d "server" ] || [ ! -d "src" ]; then
  echo "❌ ERROR: No estás en la raíz del proyecto."
  echo "   No se encontraron las carpetas 'server' ni 'src'."
  echo "   Mueve este script a la raíz del proyecto y vuelve a intentar."
  exit 1
fi

OUT="paquete-para-chat.txt"
> "$OUT"

ARCHIVOS=(
  # === Backend - Entry ===
  "server/index.js"
  "server/config/db.js"

  # === Modelos de ingresos ===
  "server/models/Pago.js"
  "server/models/Abono.js"
  "server/models/Inscripcion.js"
  "server/models/Alumno.js"
  "server/models/Grupo.js"
  "server/models/Curso.js"

  # === Modelos de gastos ===
  "server/models/Gasto.js"

  # === Modelos de profesores (costos) ===
  "server/models/Profesor.js"
  "server/models/PagoProfesor.js"
  "server/models/PagoProfesorVerano.js"
  "server/models/RegistroHorasProfesorVerano.js"

  # === Modelos de verano ===
  "server/models/CursoVerano.js"
  "server/models/InscripcionVerano.js"
  "server/models/AsignacionProfesorVerano.js"

  # === Rutas - Gastos y reportes ===
  "server/routes/gastos.js"
  "server/routes/reportes.js"
  "server/routes/finanzas.js"
  "server/routes/pagosProfesores.js"

  # === Utils relevantes ===
  "server/utils/generarId.js"
  "server/utils/cache.js"

  # === Frontend ===
  "src/services/api.ts"
)

ENCONTRADOS=0
NO_ENCONTRADOS=0

for f in "${ARCHIVOS[@]}"; do
  if [ -f "$f" ]; then
    echo "═══════════════════════════════════════════════════════" >> "$OUT"
    echo "=== $f ===" >> "$OUT"
    echo "═══════════════════════════════════════════════════════" >> "$OUT"
    cat "$f" >> "$OUT"
    echo "" >> "$OUT"
    echo "" >> "$OUT"
    ENCONTRADOS=$((ENCONTRADOS + 1))
  else
    echo "⚠️  NO EXISTE: $f" >> "$OUT"
    NO_ENCONTRADOS=$((NO_ENCONTRADOS + 1))
  fi
done

echo "✅ Paquete generado: $OUT"
echo "   Archivos incluidos: $ENCONTRADOS"
echo "   Archivos faltantes: $NO_ENCONTRADOS"
echo "   Tamaño: $(wc -l < "$OUT") líneas, $(wc -c < "$OUT") bytes"
echo ""
echo "Cópialo y pégalo en el chat nuevo."