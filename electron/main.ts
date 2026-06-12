import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";

declare const __dirname: string;

function createWindow() {
  const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "KontaktAtlas",
    backgroundColor: "#0b1220",
    webPreferences: {
      preload: path.join(__dirname, isDev ? "preload.ts" : "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) void win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  else void win.loadFile(path.join(__dirname, "../dist/index.html"));
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
