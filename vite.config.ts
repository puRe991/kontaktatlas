import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Electron lädt die gebaute App per file://. Relative Asset-Pfade verhindern,
  // dass index.html im Paket fälschlich /assets vom Dateisystem-Root lädt.
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist' },
  test: { environment: 'jsdom', globals: true }
});
