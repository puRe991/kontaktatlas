// Dev-only bootstrap: Electron loads preload scripts directly and does not
// consistently inherit the TypeScript loader used for the main process.
require('tsx/cjs');
require('./preload.ts');
