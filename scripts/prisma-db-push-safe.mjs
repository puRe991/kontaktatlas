#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrismaEnv, runPrisma } from './prisma-runner.mjs';
import { isUnsupportedWindows32Bit, writeWindows32BitAdvisory } from './prisma-platform-guard.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const schema = join(root, 'prisma', 'schema.prisma');

function exitFrom(result) {
  if (result.error) {
    console.error('[kontakt-atlas:prisma] Prisma konnte nicht gestartet werden:', result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.log(`[kontakt-atlas:prisma] db push mit Prisma Binary Engine (Node ${process.version}, ${process.platform}/${process.arch})`);

if (isUnsupportedWindows32Bit) {
  const { advisoryFile, message } = await writeWindows32BitAdvisory(root, 'db push');
  console.error(`\n${message}\n`);
  console.error(`[kontakt-atlas:prisma] Hinweis gespeichert unter: ${advisoryFile}`);
  process.exit(1);
}

const result = runPrisma(root, ['db', 'push', '--schema', schema], createPrismaEnv());
exitFrom(result);
