export function parseJsonOrFallback<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("[kontakt-atlas] Ungültiges JSON ignoriert", error);
    return fallback;
  }
}
