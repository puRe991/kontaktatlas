import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";
declare const __dirname: string;

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const DEV_SERVER_MAX_ATTEMPTS = 20;
const DEV_SERVER_RETRY_DELAY_MS = 500;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatLoadError(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

async function assertDevServerReachable(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Dev-Server antwortet mit HTTP ${response.status}.`);
  }
}

async function loadDevRendererWithRetry(win: BrowserWindow, url: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DEV_SERVER_MAX_ATTEMPTS; attempt += 1) {
    try {
      await assertDevServerReachable(url);
      await win.loadURL(url);
      return;
    } catch (error) {
      lastError = error;
      const hasAttemptsLeft = attempt < DEV_SERVER_MAX_ATTEMPTS;
      const message = formatLoadError(error);

      if (!hasAttemptsLeft) break;

      console.warn(
        `[kontakt-atlas:electron] Renderer noch nicht bereit (${attempt}/${DEV_SERVER_MAX_ATTEMPTS}): ${message}. Neuer Versuch in ${DEV_SERVER_RETRY_DELAY_MS} ms.`,
      );
      await wait(DEV_SERVER_RETRY_DELAY_MS);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Renderer konnte nach ${DEV_SERVER_MAX_ATTEMPTS} Versuchen nicht geladen werden.`);
}

function getPreloadPath(isDev: boolean) {
  return path.join(__dirname, isDev ? "dev-preload.cjs" : "preload.js");
}

async function loadRenderer(win: BrowserWindow, isDev: boolean) {
  const target = isDev ? DEV_SERVER_URL : path.join(__dirname, "../dist/index.html");

  try {
    if (isDev) {
      if (!DEV_SERVER_URL) throw new Error("VITE_DEV_SERVER_URL ist nicht gesetzt.");
      await loadDevRendererWithRetry(win, DEV_SERVER_URL);
      return;
    }

    await win.loadFile(path.join(__dirname, "../dist/index.html"));
  } catch (error) {
    console.error(
      `[kontakt-atlas:electron] Renderer konnte nicht geladen werden (${target ?? "unbekannt"}).`,
      error,
    );
  }
}

function createWindow() {
  const isDev = Boolean(DEV_SERVER_URL);
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "KontaktAtlas",
    backgroundColor: "#0b1220",
    webPreferences: {
      preload: getPreloadPath(isDev),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(
      `[kontakt-atlas:electron] Laden fehlgeschlagen (${code} ${description}): ${url}`,
    );
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[kontakt-atlas:electron] Renderer-Prozess beendet.", details);
  });

  void loadRenderer(win, isDev);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
