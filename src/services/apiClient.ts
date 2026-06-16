import type { ApiResult, KontaktAtlasApi } from "../types/global";

const unavailableMessage =
  "KontaktAtlas-API nicht verfügbar. Bitte in Electron starten.";

const unavailable = <T>(): Promise<ApiResult<T>> =>
  Promise.resolve({ ok: false, error: unavailableMessage });

const unavailableApi: KontaktAtlasApi = {
  dashboard: () => unavailable(),
  persons: {
    list: () => unavailable(),
    get: () => unavailable(),
    create: () => unavailable(),
    update: () => unavailable(),
    delete: () => unavailable(),
    linkManual: () => unavailable(),
  },
  vehicles: {
    list: () => unavailable(),
    create: () => unavailable(),
    delete: () => unavailable(),
    linkManual: () => unavailable(),
  },
  relationships: {
    list: () => unavailable(),
    create: () => unavailable(),
    delete: () => unavailable(),
    linkManual: () => unavailable(),
  },
  importDrafts: {
    list: () => unavailable(),
    analyze: () => unavailable(),
    acceptSelected: () => unavailable(),
    discard: () => unavailable(),
    deleteRawText: () => unavailable(),
  },
  media: {
    list: () => unavailable(),
    import: () => unavailable(),
    suggestions: () => unavailable(),
    acceptSuggestion: () => unavailable(),
    rejectSuggestion: () => unavailable(),
    delete: () => unavailable(),
    linkManual: () => unavailable(),
  },
  search: () => unavailable(),
  exportJson: () => unavailable(),
};

export async function unwrap<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) throw new Error(result.error || "Unbekannter IPC-Fehler");
  return result.data as T;
}

export const api = () => window.kontaktAtlas ?? unavailableApi;
