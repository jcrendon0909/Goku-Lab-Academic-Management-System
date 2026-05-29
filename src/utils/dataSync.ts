import { useEffect } from "react";

/** Evento global para refrescar listas tras inscripciones, bajas, pagos, etc. */
export const GOKU_DATA_CHANGED = "goku:data-changed";

const SYNC_CHANNEL = "goku-lab-data-sync";

let syncChannel: BroadcastChannel | null = null;

function getSyncChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!syncChannel) {
    syncChannel = new BroadcastChannel(SYNC_CHANNEL);
  }
  return syncChannel;
}

export function notifyDataChanged(detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const payload = detail || {};

  window.dispatchEvent(
    new CustomEvent(GOKU_DATA_CHANGED, { detail: payload })
  );

  try {
    getSyncChannel()?.postMessage(payload);
  } catch {
    /* ignorar si el canal no está disponible */
  }
}

/**
 * Recarga datos cuando otra sección (o pestaña) modifica inscripciones, pagos o calendario.
 */
export function useSyncDataReload(onReload: () => void) {
  useEffect(() => {
    const handler = () => onReload();

    window.addEventListener(GOKU_DATA_CHANGED, handler);

    const channel = getSyncChannel();
    channel?.addEventListener("message", handler);

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) onReload();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener(GOKU_DATA_CHANGED, handler);
      channel?.removeEventListener("message", handler);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [onReload]);
}
