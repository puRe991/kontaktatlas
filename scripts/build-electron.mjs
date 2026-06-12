import { build } from 'esbuild';
import { rm } from 'node:fs/promises';

await rm('dist-electron', { recursive: true, force: true });
const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron', '@prisma/client', '.prisma/client']
};
await build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.js' });
await build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.js' });
