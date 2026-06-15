import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export const isUnsupportedWindows32Bit = process.platform === 'win32' && process.arch === 'ia32';
const reexecFlag = 'KONTAKTATLAS_PRISMA_REEXEC_64BIT_NODE';

function uniqueExistingPaths(paths) {
  return [...new Set(paths.filter(Boolean))].filter((path) => existsSync(path));
}

export function findWindows64BitNode() {
  if (!isUnsupportedWindows32Bit) return null;

  const candidates = uniqueExistingPaths([
    process.env.ProgramW6432 && join(process.env.ProgramW6432, 'nodejs', 'node.exe'),
    process.env['ProgramFiles'] && join(process.env['ProgramFiles'], 'nodejs', 'node.exe'),
  ]);

  return candidates.find((candidate) => candidate !== process.execPath) ?? null;
}

export function reexecWithWindows64BitNodeIfAvailable(scriptUrl, args = process.argv.slice(2)) {
  if (!isUnsupportedWindows32Bit || process.env[reexecFlag] === '1') return false;

  const node64Path = findWindows64BitNode();
  if (!node64Path) return false;

  console.log(`[kontakt-atlas:prisma] 32-Bit-Node erkannt. Starte Prisma-Schritt erneut mit 64-Bit-Node: ${node64Path}`);
  const result = spawnSync(node64Path, [scriptUrl, ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      [reexecFlag]: '1',
    },
  });

  if (result.error) {
    console.error('[kontakt-atlas:prisma] 64-Bit-Node konnte nicht gestartet werden:', result.error.message);
    return false;
  }

  process.exit(result.status ?? 1);
}

export function windows32BitPrismaMessage(commandLabel) {
  return [
    `Prisma ${commandLabel} kann unter 32-Bit-Node.js auf Windows nicht zuverlässig ausgeführt werden.`,
    '',
    `Erkannt: Node ${process.version}, Plattform ${process.platform}, Architektur ${process.arch}.`,
    '',
    'Ursache:',
    'Prisma 5 liefert die benötigten Windows-Engines für moderne Windows-Setups als 64-Bit-Binaries aus.',
    'Mit 32-Bit-Node.js endet der Start der Schema Engine häufig nur mit "spawn UNKNOWN".',
    '',
    'Behebung:',
    '1. 64-Bit-Node.js 20 LTS oder 22 LTS installieren.',
    '2. Falls Windows weiterhin 32-Bit-Node nutzt: 32-Bit-Node.js deinstallieren oder PATH so anpassen, dass C:\\Program Files\\nodejs vor C:\\Program Files (x86)\\nodejs steht.',
    '3. Im Projektordner ausführen: npm run install:clean',
    '4. Danach erneut starten: npm run dev',
    '',
    'Hinweis: Wenn eine 64-Bit-Node-Installation unter C:\\Program Files\\nodejs gefunden wird, startet dieses Projekt den Prisma-Schritt automatisch damit neu.',
    '',
    'Wichtig: npm run install:32bit kann Installationsartefakte bereinigen, ersetzt aber keine fehlende 64-Bit-Prisma-Engine.',
  ].join('\n');
}

export async function writeWindows32BitAdvisory(root, commandLabel) {
  const advisoryFile = join(root, 'prisma', 'WINDOWS_32BIT_UNSUPPORTED.txt');
  const message = windows32BitPrismaMessage(commandLabel);
  await writeFile(advisoryFile, `${message}\n`, 'utf8');
  return { advisoryFile, message };
}
