import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";

declare const __dirname: string;

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function getPreloadPath(isDev: boolean) {
  return path.join(__dirname, isDev ? "preload.ts" : "preload.js");
}

async function loadRenderer(win: BrowserWindow, isDev: boolean) {
  const target = isDev ? DEV_SERVER_URL : path.join(__dirname, "../dist/index.html");

  try {
    if (isDev) {
      if (!DEV_SERVER_URL) throw new Error("VITE_DEV_SERVER_URL ist nicht gesetzt.");
      await win.loadURL(DEV_SERVER_URL);
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
