#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const isWin = process.platform === 'win32';
const targets = [
  'node_modules',
  'dist',
  'dist-electron',
  'release',
  join('prisma', 'GENERATE_FAILED_32BIT.txt'),
];

for (const target of targets) {
  const path = join(root, target);
  if (!existsSync(path)) continue;
  await rm(path, { recursive: true, force: true, maxRetries: isWin ? 5 : 0, retryDelay: 250 });
  console.log(`[kontakt-atlas:clean] Entfernt: ${target}`);
}
