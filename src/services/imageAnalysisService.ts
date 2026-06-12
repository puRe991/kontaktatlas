export interface BasicImageAnalysis {
  width?: number;
  height?: number;
  aspectRatio?: number;
  probablyPerson: boolean;
  probablyVehicle: boolean;
  probablyScreenshotOrText: boolean;
  dark: boolean;
  blurry: boolean;
  formatHint: string;
}

export function analyzeImageMetadata(
  fileName: string,
  mimeType: string,
  width?: number,
  height?: number,
  fileSize = 0,
): BasicImageAnalysis {
  const lower = fileName.toLowerCase();
  const aspectRatio =
    width && height ? Number((width / height).toFixed(2)) : undefined;
  return {
    width,
    height,
    aspectRatio,
    probablyPerson: /profil|person|portrait|avatar|foto/.test(lower),
    probablyVehicle: /auto|fahrzeug|car|vw|bmw|audi|opel|golf|corsa/.test(
      lower,
    ),
    probablyScreenshotOrText:
      /screenshot|screen|profilseite/.test(lower) || mimeType.includes("png"),
    dark: false,
    blurry: fileSize > 0 && fileSize < 2048,
    formatHint: mimeType || "unbekannt",
  };
}
