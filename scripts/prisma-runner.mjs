import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function createPrismaEnv(extraEnv = {}) {
  return {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? 'file:./storage/kontaktatlas.db',
    PRISMA_CLIENT_ENGINE_TYPE: 'binary',
    PRISMA_CLI_QUERY_ENGINE_TYPE: 'binary',
    ...extraEnv,
  };
}

function runNodeScript(scriptPath, args, root, env) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env,
  });
}

export function runPrisma(root, args, env = createPrismaEnv()) {
  const cliPath = join(root, 'node_modules', 'prisma', 'build', 'index.js');

  // Calling the Prisma JavaScript entry point via the current Node binary avoids
  // Windows .cmd shim failures such as `spawnSync npx.cmd EINVAL` on 32-bit Node.
  if (existsSync(cliPath)) {
    return runNodeScript(cliPath, args, root, env);
  }

  if (process.env.npm_execpath && existsSync(process.env.npm_execpath)) {
    return runNodeScript(process.env.npm_execpath, ['exec', '--', 'prisma', ...args], root, env);
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return spawnSync(npmCommand, ['exec', '--', 'prisma', ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env,
  });
}
