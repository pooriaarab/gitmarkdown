import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '.agents/design.md');
const destination = resolve(root, 'public/design.md');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
