// Dev-only preload bootstrap.
// Keep this file as plain CommonJS: Electron loads preload scripts before the
// renderer and does not reliably run the TypeScript loader in that context.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('kontaktAtlas', {
  dashboard: () => invoke('dashboard:get'),
  persons: {
    list: () => invoke('persons:list'),
    get: (id) => invoke('persons:get', id),
    create: (payload) => invoke('persons:create', payload),
    update: (payload) => invoke('persons:update', payload),
    delete: (id) => invoke('persons:delete', id),
    linkManual: (payload) => invoke('persons:linkManual', payload),
  },
  vehicles: {
    list: () => invoke('vehicles:list'),
    create: (payload) => invoke('vehicles:create', payload),
    delete: (id) => invoke('vehicles:delete', id),
    linkManual: (payload) => invoke('vehicles:linkManual', payload),
  },
  relationships: {
    list: () => invoke('relationships:list'),
    create: (payload) => invoke('relationships:create', payload),
    delete: (id) => invoke('relationships:delete', id),
    linkManual: (payload) => invoke('relationships:linkManual', payload),
  },
  importDrafts: {
    list: () => invoke('importDrafts:list'),
    analyze: (payload) => invoke('importDrafts:analyze', payload),
    acceptSelected: (payload) => invoke('importDrafts:acceptSelected', payload),
    discard: (id) => invoke('importDrafts:discard', id),
    deleteRawText: (id) => invoke('importDrafts:deleteRawText', id),
  },
  media: {
    list: () => invoke('media:list'),
    import: (payload) => invoke('media:import', payload),
    suggestions: () => invoke('media:suggestions'),
    acceptSuggestion: (payload) => invoke('media:acceptSuggestion', payload),
    rejectSuggestion: (id) => invoke('media:rejectSuggestion', id),
    delete: (id) => invoke('media:delete', id),
    linkManual: (payload) => invoke('media:linkManual', payload),
  },
  search: (query) => invoke('search:global', query),
  exportJson: () => invoke('export:json'),
});
