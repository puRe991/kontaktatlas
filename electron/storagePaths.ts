import { app } from "electron";
import path from "node:path";

type StorageMode = "development" | "production";

export type AppStoragePaths = {
  mode: StorageMode;
  userDataRoot: string;
  storageRoot: string;
  imagesRoot: string;
  importsRoot: string;
  databaseFile: string;
};

function storageMode(): StorageMode {
  return app.isPackaged && !process.env.VITE_DEV_SERVER_URL
    ? "production"
    : "development";
}

/**
 * Returns all persistent KontaktAtlas storage paths.
 *
 * Production and development intentionally use separate directories below
 * Electron's per-app userData path, so local development cannot accidentally
 * read or modify a user's packaged-app data. Do not replace this with
 * process.cwd(): the working directory is not stable for installed apps.
 */
export function getAppStoragePaths(): AppStoragePaths {
  const mode = storageMode();
  const userDataRoot = app.getPath("userData");
  const storageRoot = path.join(
    userDataRoot,
    mode === "production" ? "storage" : "storage-dev",
  );

  return {
    mode,
    userDataRoot,
    storageRoot,
    imagesRoot: path.join(storageRoot, "images"),
    importsRoot: path.join(storageRoot, "imports"),
    databaseFile: path.join(storageRoot, "kontaktatlas.json"),
  };
}
