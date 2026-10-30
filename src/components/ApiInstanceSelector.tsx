import { useEffect, useState } from "react";
import {
  obtenerConfiguracionApi,
  cambiarInstanciaApi,
  usarInstanciaPorDefecto,
  type ApiInstance,
} from "../services/api";

type Origen = "localStorage" | "config.json" | "env" | "default";

export function ApiInstanceSelector() {
  const [instancias, setInstancias] = useState<ApiInstance[]>([]);
  const [activa, setActiva] = useState<string>("");
  const [origen, setOrigen] = useState<Origen | "">("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerConfiguracionApi()
      .then((cfg) => {
        setInstancias(cfg.instancias);
        setActiva(cfg.activa);
        setOrigen(cfg.origen);
      })
      .finally(() => setCargando(false));
  }, []);

  // No mostrar nada mientras carga, ni si no hay instancias configuradas
  // y el usuario no tiene un override manual.
  if (cargando) return null;
  if (instancias.length === 0 && origen !== "localStorage") return null;

  const seleccionActual = instancias.some((i) => i.url === activa) ? activa : "";

  const handleChange = (nuevaUrl: string) => {
    if (nuevaUrl === seleccionActual) return;

    const etiqueta =
      instancias.find((i) => i.url === nuevaUrl)?.label ||
      nuevaUrl ||
      "Automático (config.json)";

    const ok = window.confirm(
      `¿Cambiar al servidor?\n\n${etiqueta}\n\nLa página se recargará para aplicar el cambio.`
    );
    if (!ok) return;

    if (!nuevaUrl) usarInstanciaPorDefecto();
    else cambiarInstanciaApi(nuevaUrl);
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        padding: "6px 10px",
        border: "1px solid #d0d7de",
        borderRadius: 6,
        background: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
      title={`Origen actual: ${origen}`}
    >
      <label htmlFor="api-instance-select" style={{ opacity: 0.7 }}>
        Servidor:
      </label>
      <select
        id="api-instance-select"
        value={seleccionActual}
        onChange={(e) => handleChange(e.target.value)}
        style={{ fontSize: 13, padding: "2px 4px" }}
      >
        <option value="">Automático (config.json)</option>
        {instancias.map((inst) => (
          <option key={inst.id} value={inst.url}>
            {inst.label}
          </option>
        ))}
      </select>
    </div>
  );
}