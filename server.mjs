import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlySwarmSimulation } from './src/simulation.mjs';
import { RobinhoodLive } from './src/robinhood-live.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');
const port = Number(process.env.PORT || 4173);
const sim = new FlySwarmSimulation(Number(process.env.FLYSWARM_SEED || 20240627));
const live = new RobinhoodLive();
const clients = new Set();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

sim.onUpdate(state => {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(payload);
});
setInterval(() => sim.tick(), 1800).unref();

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8192) throw new Error('body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/tokens') return json(res, 200, await live.search(url.searchParams.get('q') || ''));
    const tokenMatch = url.pathname.match(/^\/api\/token\/(0x[a-fA-F0-9]{40})$/);
    if (tokenMatch) return json(res, 200, await live.detail(tokenMatch[1]));
    const holdersMatch = url.pathname.match(/^\/api\/token\/(0x[a-fA-F0-9]{40})\/holders$/);
    if (holdersMatch) return json(res, 200, await live.holders(holdersMatch[1]));
    if (url.pathname === '/api/state') return json(res, 200, sim.snapshot());
    if (url.pathname === '/api/config' && req.method === 'POST') return json(res, 200, sim.updateConfig(await body(req)));
    if (url.pathname === '/api/focus' && req.method === 'POST') return json(res, 200, sim.setFocus(await body(req)));
    if (url.pathname === '/api/reset' && req.method === 'POST') { sim.reset(); return json(res, 200, sim.snapshot()); }
    if (url.pathname === '/api/stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      clients.add(res);
      res.write(`data: ${JSON.stringify(sim.snapshot())}\n\n`);
      req.on('close', () => clients.delete(res));
      return;
    }
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.resolve(pub, rel);
    if (!file.startsWith(pub + path.sep) && file !== path.join(pub, 'index.html')) return json(res, 403, { error: 'forbidden' });
    await stat(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch (error) {
    json(res, error.code === 'ENOENT' ? 404 : 500, { error: error.message });
  }
});

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

server.listen(port, '127.0.0.1', () => console.log(`FlySwarm simulation → http://127.0.0.1:${port}`));
