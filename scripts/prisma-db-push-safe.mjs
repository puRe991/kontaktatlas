#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const isWin = process.platform === 'win32';
const command = isWin ? 'npx.cmd' : 'npx';
const schema = join(root, 'prisma', 'schema.prisma');

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./storage/kontaktatlas.db',
  PRISMA_CLIENT_ENGINE_TYPE: 'binary',
  PRISMA_CLI_QUERY_ENGINE_TYPE: 'binary',
};

function runPrisma(args) {
  return spawnSync(command, ['prisma', ...args, '--schema', schema], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env,
  });
}

function exitFrom(result) {
  if (result.error) {
    console.error('[kontakt-atlas:prisma] Prisma konnte nicht gestartet werden:', result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.log(`[kontakt-atlas:prisma] db push mit Prisma Binary Engine (Node ${process.version}, ${process.platform}/${process.arch})`);

const result = runPrisma(['db', 'push']);
exitFrom(result);
