#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrismaEnv, runPrisma } from './prisma-runner.mjs';
import {
  isUnsupportedWindows32Bit,
  reexecWithWindows64BitNodeIfAvailable,
  writeWindows32BitAdvisory,
} from './prisma-platform-guard.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const isWin = process.platform === 'win32';
const is32Bit = process.arch === 'ia32';
const schema = join(root, 'prisma', 'schema.prisma');
const advisoryFile = join(root, 'prisma', 'GENERATE_FAILED_32BIT.txt');

const stalePaths = [
  join(root, 'node_modules', '.prisma', 'client'),
  join(root, 'node_modules', '@prisma', 'client', '.prisma'),
];

function log(message) {
  console.log(`[kontakt-atlas:prisma] ${message}`);
}

async function removeIfPresent(path) {
  if (!existsSync(path)) return;
  await rm(path, { recursive: true, force: true, maxRetries: isWin ? 5 : 0, retryDelay: 250 });
  log(`Alte Prisma-Artefakte entfernt: ${path}`);
}

function runPrismaGenerate(extraEnv = {}) {
  return runPrisma(root, ['generate', '--schema', schema], createPrismaEnv(extraEnv));
}

async function main() {
  log(`Node ${process.version}, Plattform ${process.platform}, Architektur ${process.arch}`);

  if (isUnsupportedWindows32Bit) {
    reexecWithWindows64BitNodeIfAvailable(fileURLToPath(import.meta.url));
  }

  for (const path of stalePaths) {
    await removeIfPresent(path);
  }

  let result = runPrismaGenerate();
  if (result.status === 0) {
    await rm(advisoryFile, { force: true });
    return;
  }

  if (is32Bit) {
    if (isUnsupportedWindows32Bit) {
      const { advisoryFile: windowsAdvisoryFile, message: windowsMessage } = await writeWindows32BitAdvisory(root, 'generate');
      console.warn(`\n${windowsMessage}\n`);
      log(`Windows-32-Bit-Hinweis gespeichert unter: ${windowsAdvisoryFile}`);
    }

    log('Prisma generate ist auf einem 32-Bit-System fehlgeschlagen. Starte Fallback ohne Engine-Download-Prüfung.');
    result = runPrismaGenerate({ PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: '1' });
    if (result.status === 0) {
      await rm(advisoryFile, { force: true });
      return;
    }

    const message = [
      'Prisma Client konnte auf diesem 32-Bit-System nicht erzeugt werden.',
      '',
      'Empfohlener Fallback:',
      '1. npm run install:32bit',
      '2. Falls das weiterhin scheitert: Node.js 18/20 als 32-Bit neu installieren und npm cache clean --force ausführen.',
      '3. Wenn Prisma-Engines weiterhin fehlen, die App auf einem 64-Bit-System bauen oder eine 64-Bit-Node.js-Installation verwenden.',
      '',
      'Die Installation wird nicht hart abgebrochen, damit npm install auf 32-Bit-Systemen alte Artefakte bereinigen und die restlichen Pakete installieren kann.',
    ].join('\n');
    await writeFile(advisoryFile, `${message}\n`, 'utf8');
    console.warn(`\n${message}\n`);
    process.exit(0);
  }

  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error('[kontakt-atlas:prisma] Unerwarteter Fehler:', error);
  process.exit(1);
});
