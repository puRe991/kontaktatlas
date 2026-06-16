declare global {
  interface Window {
    kontaktAtlas: KontaktAtlasApi;
  }
}
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
export interface KontaktAtlasApi {
  dashboard(): Promise<ApiResult<any>>;
  persons: {
    list(): Promise<ApiResult<any[]>>;
    get(id: string): Promise<ApiResult<any>>;
    create(payload: unknown): Promise<ApiResult<any>>;
    update(payload: unknown): Promise<ApiResult<any>>;
    delete(id: string): Promise<ApiResult<any>>;
  };
  vehicles: {
    list(): Promise<ApiResult<any[]>>;
    create(payload: unknown): Promise<ApiResult<any>>;
    delete(id: string): Promise<ApiResult<any>>;
  };
  relationships: {
    list(): Promise<ApiResult<any[]>>;
    create(payload: unknown): Promise<ApiResult<any>>;
    delete(id: string): Promise<ApiResult<any>>;
  };
  importDrafts: {
    list(): Promise<ApiResult<any[]>>;
    analyze(payload: unknown): Promise<ApiResult<any>>;
    acceptSelected(payload: unknown): Promise<ApiResult<any>>;
    discard(id: string): Promise<ApiResult<any>>;
    deleteRawText(id: string): Promise<ApiResult<any>>;
  };
  media: {
    list(): Promise<ApiResult<any[]>>;
    import(payload?: unknown): Promise<ApiResult<any[]>>;
    suggestions(): Promise<ApiResult<any[]>>;
    acceptSuggestion(payload: unknown): Promise<ApiResult<any>>;
    rejectSuggestion(id: string): Promise<ApiResult<any>>;
    delete(id: string): Promise<ApiResult<any>>;
    linkManual(payload: unknown): Promise<ApiResult<any>>;
  };
  search(query: string): Promise<ApiResult<any>>;
  exportJson(): Promise<ApiResult<any>>;
  importJson(payload: unknown): Promise<ApiResult<any>>;
}
