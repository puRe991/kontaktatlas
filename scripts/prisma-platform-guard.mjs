import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const isUnsupportedWindows32Bit = process.platform === 'win32' && process.arch === 'ia32';

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
    '1. 32-Bit-Node.js deinstallieren.',
    '2. 64-Bit-Node.js 20 LTS oder 22 LTS installieren.',
    '3. Im Projektordner ausführen: npm run install:clean',
    '4. Danach erneut starten: npm run dev',
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
