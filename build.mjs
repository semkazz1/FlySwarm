import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'server'), { recursive: true });
await mkdir(path.join(dist, 'client'), { recursive: true });
await mkdir(path.join(dist, '.openai'), { recursive: true });
await cp(path.join(root, 'public'), path.join(dist, 'client'), { recursive: true });
await cp(path.join(root, 'src'), path.join(dist, 'server', 'src'), { recursive: true });
await cp(path.join(root, 'worker.mjs'), path.join(dist, 'server', 'index.js'));
const manifest = JSON.parse(await readFile(path.join(root, '.openai', 'hosting.json'), 'utf8'));
await writeFile(path.join(dist, '.openai', 'hosting.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('built dist/server/index.js + dist/client');
