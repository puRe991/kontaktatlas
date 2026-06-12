import type { ApiResult } from "../types/global";

export async function unwrap<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(result.error || "Unbekannter IPC-Fehler");
  return result.data as T;
}

export const api = () => {
  if (!window.kontaktAtlas)
    throw new Error(
      "KontaktAtlas-API nicht verfügbar. Bitte in Electron starten.",
    );
  return window.kontaktAtlas;
};
