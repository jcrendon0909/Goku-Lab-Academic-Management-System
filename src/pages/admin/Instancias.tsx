import { useEffect, useState } from "react";
import {
  obtenerConfiguracionApi,
  cambiarInstanciaApi,
  usarInstanciaPorDefecto,
  type ApiInstance,
} from "../../services/api";

type Origen = "localStorage" | "config.json" | "env" | "default";
type EstadoConexion = "idle" | "probando" | "ok" | "error";

const ORIGEN_LABEL: Record<Origen, string> = {
  localStorage: "Selección manual (este navegador)",
  "config.json": "config.json (predeterminado)",
  env: "Variable de entorno del build",
  default: "Fallback de desarrollo (localhost)",
};

export function InstanciasPage() {
  const [instancias, setInstancias] = useState<ApiInstance[]>([]);
  const [activa, setActiva] = useState("");
  const [origen, setOrigen] = useState<Origen>("default");
  const [cargando, setCargando] = useState(true);
  const [estados, setEstados] = useState<Record<string, EstadoConexion>>({});

  useEffect(() => {
    obtenerConfiguracionApi()
      .then((cfg) => {
        setInstancias(cfg.instancias);
        setActiva(cfg.activa);
        setOrigen(cfg.origen);
      })
      .finally(() => setCargando(false));
  }, []);

  async function probarConexion(url: string) {
    setEstados((prev) => ({ ...prev, [url]: "probando" }));
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      await fetch(`${url}/health`, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      setEstados((prev) => ({ ...prev, [url]: "ok" }));
    } catch {
      setEstados((prev) => ({ ...prev, [url]: "error" }));
    }
  }

  function cambiar(url: string) {
    if (url === activa && origen === "localStorage") return;
    const label = instancias.find((i) => i.url === url)?.label ?? url;
    if (!window.confirm(`¿Cambiar al servidor?\n\n${label}\n\nLa página se recargará.`)) return;
    cambiarInstanciaApi(url);
  }

  function volverAlDefault() {
    if (
      !window.confirm(
        "¿Volver al servidor predeterminado (config.json)?\n\nLa página se recargará."
      )
    )
      return;
    usarInstanciaPorDefecto();
  }

  if (cargando) {
    return <div style={{ padding: 24 }}>Cargando configuración…</div>;
  }

  const urlSeleccionada = instancias.some((i) => i.url === activa) ? activa : "";

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Instancias del servidor</h1>
      <p style={{ color: "#555", marginTop: 0, marginBottom: 20 }}>
        Cambia entre las instancias de Render disponibles. El cambio se guarda en este navegador y
        se aplica al recargar la página.
      </p>

      <div
        style={{
          border: "1px solid #d0d7de",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          background: "#f6f8fa",
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            color: "#57606a",
            marginBottom: 6,
          }}
        >
          Conectado a
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 14, wordBreak: "break-all" }}>
          {activa || "(sin URL)"}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#57606a" }}>
          Origen: <strong>{ORIGEN_LABEL[origen]}</strong>
        </div>
        {origen === "localStorage" && (
          <button
            onClick={volverAlDefault}
            style={{ marginTop: 12, padding: "6px 12px", cursor: "pointer" }}
          >
            Volver al predeterminado
          </button>
        )}
      </div>

      {instancias.length === 0 ? (
        <div
          style={{
            border: "1px dashed #d0d7de",
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: "#57606a",
          }}
        >
          No hay instancias configuradas en <code>public/config.json</code>.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {instancias.map((inst) => {
            const esActiva = inst.url === urlSeleccionada;
            const estado = estados[inst.url] ?? "idle";
            return (
              <div
                key={inst.id}
                style={{
                  border: esActiva ? "2px solid #0969da" : "1px solid #d0d7de",
                  borderRadius: 8,
                  padding: 16,
                  background: esActiva ? "#ddf4ff" : "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {inst.label}
                      {esActiva && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 11,
                            background: "#0969da",
                            color: "#fff",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          ACTIVA
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#57606a",
                        wordBreak: "break-all",
                      }}
                    >
                      {inst.url}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => probarConexion(inst.url)}
                      disabled={estado === "probando"}
                      style={{ padding: "6px 12px", cursor: "pointer" }}
                    >
                      {estado === "probando"
                        ? "Probando…"
                        : estado === "ok"
                        ? "✅ Responde"
                        : estado === "error"
                        ? "❌ Sin respuesta"
                        : "Probar conexión"}
                    </button>
                    {!esActiva && (
                      <button
                        onClick={() => cambiar(inst.url)}
                        style={{
                          padding: "6px 12px",
                          cursor: "pointer",
                          background: "#0969da",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                        }}
                      >
                        Usar esta
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 12, color: "#57606a" }}>
        El cambio afecta solo a este navegador. Otros usuarios y dispositivos seguirán usando el
        servidor predeterminado definido en <code>config.json</code>.
      </p>
    </div>
  );
}