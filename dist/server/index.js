import { FlySwarmEngine } from './src/engine.mjs';
import { RobinhoodLive } from './src/robinhood-live.mjs';

const sim = new FlySwarmEngine(20240627);
const live = new RobinhoodLive();

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/state') return json(sim.snapshot());
      if (url.pathname === '/api/tokens') return json(await live.search(url.searchParams.get('q') || ''));
      const tokenMatch = url.pathname.match(/^\/api\/token\/(0x[a-fA-F0-9]{40})$/);
      if (tokenMatch) return json(await live.detail(tokenMatch[1]));
      const holdersMatch = url.pathname.match(/^\/api\/token\/(0x[a-fA-F0-9]{40})\/holders$/);
      if (holdersMatch) return json(await live.holders(holdersMatch[1]));
      if (url.pathname === '/api/config' && request.method === 'POST') return json(sim.updateConfig(await request.json()));
      if (url.pathname === '/api/focus' && request.method === 'POST') return json(sim.setFocus(await request.json()));
      if (url.pathname === '/api/reset' && request.method === 'POST') { sim.reset(); return json(sim.snapshot()); }
      if (url.pathname === '/api/stream') {
        const state = sim.tick();
        return new Response(`retry: 1800\ndata: ${JSON.stringify(state)}\n\n`, {
          headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', 'access-control-allow-origin': '*' }
        });
      }
      if (!env.ASSETS) return json({ error: 'Static asset binding unavailable' }, 503);
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: error.message || 'request failed' }, 500);
    }
  }
};
