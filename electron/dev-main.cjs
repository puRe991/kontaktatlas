// Dev-only bootstrap: lets Electron execute the TypeScript main process
// without relying on NODE_OPTIONS propagation on Windows.
require('tsx/cjs');
require('./main.ts');
