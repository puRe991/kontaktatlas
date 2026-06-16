import { contextBridge, ipcRenderer } from "electron";

const invoke = <T>(channel: string, payload?: unknown): Promise<T> =>
  ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld("kontaktAtlas", {
  dashboard: () => invoke("dashboard:get"),
  persons: {
    list: () => invoke("persons:list"),
    get: (id: string) => invoke("persons:get", id),
    create: (payload: unknown) => invoke("persons:create", payload),
    update: (payload: unknown) => invoke("persons:update", payload),
    delete: (id: string) => invoke("persons:delete", id),
    linkManual: (payload: unknown) => invoke("persons:linkManual", payload),
  },
  vehicles: {
    list: () => invoke("vehicles:list"),
    create: (payload: unknown) => invoke("vehicles:create", payload),
    delete: (id: string) => invoke("vehicles:delete", id),
    linkManual: (payload: unknown) => invoke("vehicles:linkManual", payload),
  },
  relationships: {
    list: () => invoke("relationships:list"),
    create: (payload: unknown) => invoke("relationships:create", payload),
    delete: (id: string) => invoke("relationships:delete", id),
    linkManual: (payload: unknown) => invoke("relationships:linkManual", payload),
  },
  importDrafts: {
    list: () => invoke("importDrafts:list"),
    analyze: (payload: unknown) => invoke("importDrafts:analyze", payload),
    acceptSelected: (payload: unknown) =>
      invoke("importDrafts:acceptSelected", payload),
    discard: (id: string) => invoke("importDrafts:discard", id),
    deleteRawText: (id: string) => invoke("importDrafts:deleteRawText", id),
  },
  media: {
    list: () => invoke("media:list"),
    import: (payload: unknown) => invoke("media:import", payload),
    suggestions: () => invoke("media:suggestions"),
    acceptSuggestion: (payload: unknown) =>
      invoke("media:acceptSuggestion", payload),
    rejectSuggestion: (id: string) => invoke("media:rejectSuggestion", id),
    delete: (id: string) => invoke("media:delete", id),
    linkManual: (payload: unknown) => invoke("media:linkManual", payload),
  },
  search: (query: string) => invoke("search:global", query),
  exportJson: () => invoke("export:json"),
});
