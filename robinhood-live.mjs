// Live, read-only Robinhood Chain adapter.
// Launch decoding follows the public Pons V2 integration surface and the
// MIT-licensed provider pattern in https://github.com/lunarresearcher/copy.
const RPC = globalThis.process?.env?.RH_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const LAUNCH_TOPIC = '0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO = '0x0000000000000000000000000000000000000000';
const EXPLORER = 'https://robinhoodchain.blockscout.com';
const hex = value => `0x${BigInt(value).toString(16)}`;
const lower = value => String(value || '').toLowerCase();
const topicAddress = topic => `0x${String(topic).slice(-40)}`;
const word = (data, index) => `0x${String(data || '0x').slice(2 + index * 64, 2 + (index + 1) * 64)}`;
const balanceSelector = address => `0x70a08231${lower(address).replace('0x', '').padStart(64, '0')}`;

function decodeString(data) {
  try {
    const body = String(data || '0x').slice(2);
    if (!body) return '';
    const fromHex = value => new TextDecoder().decode(Uint8Array.from(value.match(/.{1,2}/g) || [], byte => Number.parseInt(byte, 16))).replace(/\0/g, '');
    if (body.length === 64) return fromHex(body.replace(/00+$/, ''));
    const offset = Number(BigInt(`0x${body.slice(0, 64)}`));
    const length = Number(BigInt(`0x${body.slice(offset * 2, offset * 2 + 64)}`));
    return fromHex(body.slice(offset * 2 + 64, offset * 2 + 64 + length * 2));
  } catch { return ''; }
}

async function pool(items, limit, fn) {
  const result = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { result[index] = await fn(items[index], index); } catch { result[index] = null; }
    }
  }));
  return result.filter(Boolean);
}

export class RobinhoodLive {
  constructor() {
    this.id = 0;
    this.cache = { at: 0, head: 0n, tokens: [], error: null, source: 'Robinhood RPC · Pons V2 factory' };
  }

  async rpc(method, params = [], timeout = 12000) {
    const response = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'FlySwarm/0.2' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++this.id, method, params }),
      signal: AbortSignal.timeout(timeout)
    });
    if (!response.ok) throw new Error(`Robinhood RPC ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || 'Robinhood RPC error');
    return payload.result;
  }

  ethCall(to, data) { return this.rpc('eth_call', [{ to, data }, 'latest']); }

  async meta(address) {
    const [symbol, name, decimals, supply] = await Promise.allSettled([
      this.ethCall(address, '0x95d89b41'),
      this.ethCall(address, '0x06fdde03'),
      this.ethCall(address, '0x313ce567'),
      this.ethCall(address, '0x18160ddd')
    ]);
    return {
      address,
      symbol: symbol.status === 'fulfilled' ? decodeString(symbol.value) || 'TOKEN' : 'TOKEN',
      name: name.status === 'fulfilled' ? decodeString(name.value) || 'Robinhood token' : 'Robinhood token',
      decimals: decimals.status === 'fulfilled' ? Number(BigInt(decimals.value || 18)) : 18,
      totalSupplyRaw: supply.status === 'fulfilled' ? BigInt(supply.value || 0).toString() : '0'
    };
  }

  async latest(force = false) {
    if (!force && Date.now() - this.cache.at < 25000 && this.cache.tokens.length) return this.publicCache();
    try {
      const head = BigInt(await this.rpc('eth_blockNumber'));
      const logs = await this.rpc('eth_getLogs', [{
        address: FACTORY,
        topics: [LAUNCH_TOPIC],
        fromBlock: hex(head - 1600n),
        toBlock: 'latest'
      }], 18000);
      const raw = logs.slice(-36).reverse().map(log => ({
        address: topicAddress(log.topics[1]),
        curve: topicAddress(log.topics[2]),
        deployer: topicAddress(log.topics[3]),
        blockNumber: Number(BigInt(log.blockNumber)),
        transactionHash: log.transactionHash
      }));
      const enriched = await pool(raw, 6, async item => {
        const token = await this.meta(item.address);
        return {
          ...item, ...token,
          protocol: 'PONS V2',
          phase: 'CURVE',
          blocksAgo: Math.max(0, Number(head) - item.blockNumber),
          explorerUrl: `${EXPLORER}/token/${item.address}`,
          txUrl: `${EXPLORER}/tx/${item.transactionHash}`
        };
      });
      this.cache = { at: Date.now(), head, tokens: enriched, error: null, source: 'Robinhood RPC · Pons V2 factory' };
    } catch (error) {
      this.cache.error = error.message;
      this.cache.at = Date.now();
      try {
        const tokens = await this.dexTokens('robinhood');
        if (tokens.length) this.cache = { ...this.cache, tokens, source: 'DexScreener · Robinhood Chain pairs' };
      } catch {}
    }
    return this.publicCache();
  }

  publicCache() {
    return {
      mode: this.cache.tokens.length ? 'LIVE' : 'DEGRADED',
      source: this.cache.source,
      updatedAt: new Date(this.cache.at).toISOString(),
      head: this.cache.head.toString(),
      error: this.cache.error,
      items: this.cache.tokens
    };
  }

  async search(query) {
    const q = String(query || '').trim();
    const latest = await this.latest();
    if (!q) return latest;
    if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
      const cached = latest.items.find(item => lower(item.address) === lower(q));
      const item = cached || { ...(await this.meta(q)), protocol: 'ERC-20', phase: 'UNKNOWN', explorerUrl: `${EXPLORER}/token/${q}` };
      return { ...latest, items: [await this.withMarket(item)] };
    }
    const local = latest.items.filter(item => item.symbol.toLowerCase().includes(q.toLowerCase()) || item.name.toLowerCase().includes(q.toLowerCase()));
    let market = [];
    try { market = await this.dexTokens(q); } catch {}
    const merged = [...local, ...market].filter((item, index, all) => all.findIndex(x => lower(x.address) === lower(item.address)) === index);
    return { ...latest, source: market.length ? `${latest.source} · ticker search` : latest.source, items: merged.slice(0, 36) };
  }

  async dexTokens(query) {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`DexScreener ${response.status}`);
    const data = await response.json();
    return (data.pairs || []).filter(pair => pair.chainId === 'robinhood').map(pair => ({
        address: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        protocol: pair.dexId || 'DEX', phase: 'POOL',
        priceUsd: pair.priceUsd || null,
        liquidityUsd: pair.liquidity?.usd || null,
        volume24h: pair.volume?.h24 || null,
        priceChange24h: pair.priceChange?.h24 ?? null,
        imageUrl: pair.info?.imageUrl || null,
        explorerUrl: `${EXPLORER}/token/${pair.baseToken.address}`,
        dexUrl: pair.url
      })).filter((item, index, all) => all.findIndex(x => lower(x.address) === lower(item.address)) === index).slice(0, 36);
  }

  async withMarket(token) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`, { signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      const pair = (data.pairs || []).find(p => p.chainId === 'robinhood');
      if (!pair) return token;
      return {
        ...token,
        phase: 'POOL',
        priceUsd: pair.priceUsd || null,
        liquidityUsd: pair.liquidity?.usd || null,
        volume24h: pair.volume?.h24 || null,
        priceChange24h: pair.priceChange?.h24 ?? null,
        imageUrl: pair.info?.imageUrl || null,
        dexUrl: pair.url
      };
    } catch { return token; }
  }

  async detail(address) {
    const latest = await this.latest();
    const cached = latest.items.find(item => lower(item.address) === lower(address));
    return this.withMarket(cached || { ...(await this.meta(address)), protocol: 'ERC-20', phase: 'UNKNOWN', explorerUrl: `${EXPLORER}/token/${address}` });
  }

  async holders(address) {
    try { return await this.liveHolders(address); }
    catch (error) { return this.simulatedHolders(address, error.message); }
  }

  async liveHolders(address) {
    const latest = await this.latest();
    const token = latest.items.find(item => lower(item.address) === lower(address)) || await this.meta(address);
    const head = BigInt(await this.rpc('eth_blockNumber'));
    const knownBlock = token.blockNumber ? BigInt(token.blockNumber) : head - 6000n;
    const from = knownBlock > head - 6000n ? knownBlock : head - 6000n;
    const logs = await this.rpc('eth_getLogs', [{ address, topics: [TRANSFER_TOPIC], fromBlock: hex(from), toBlock: 'latest' }], 20000);
    const seen = [];
    for (const log of logs) {
      for (const topic of [log.topics?.[1], log.topics?.[2]]) {
        if (!topic) continue;
        const wallet = topicAddress(topic);
        if (lower(wallet) !== ZERO && !seen.some(x => lower(x) === lower(wallet))) seen.push(wallet);
      }
    }
    const sample = seen.slice(-160);
    const decimals = Number(token.decimals ?? 18);
    const supply = BigInt(token.totalSupplyRaw || (await this.meta(address)).totalSupplyRaw || 0);
    const holders = await pool(sample, 8, async wallet => {
      const [balanceHex, nonceHex, code] = await Promise.all([
        this.ethCall(address, balanceSelector(wallet)),
        this.rpc('eth_getTransactionCount', [wallet, 'latest']),
        this.rpc('eth_getCode', [wallet, 'latest'])
      ]);
      const balance = BigInt(balanceHex || 0);
      if (balance <= 0n) return null;
      const nonce = Number(BigInt(nonceHex || 0));
      const kind = nonce <= 3 ? 'NEW' : nonce <= 25 ? 'WARM' : 'ESTABLISHED';
      const accountType = code && code !== '0x' ? 'CONTRACT' : 'EOA';
      const percentage = supply > 0n ? Number(balance * 10000n / supply) / 100 : 0;
      return {
        address: wallet,
        balanceRaw: balance.toString(),
        balance: Number(balance) / 10 ** Math.min(decimals, 18),
        percentage,
        nonce,
        kind,
        accountType,
        explorerUrl: `${EXPLORER}/address/${wallet}`
      };
    });
    holders.sort((a, b) => b.percentage - a.percentage);
    return {
      mode: 'LIVE',
      source: `Robinhood RPC · Transfer logs from block ${from}`,
      coverage: token.blockNumber ? 'since token launch' : 'recent 6,000 blocks',
      heuristic: 'NEW ≤3 outgoing transactions · WARM ≤25 · ESTABLISHED >25',
      token: { address, symbol: token.symbol, name: token.name },
      items: holders.slice(0, 40)
    };
  }

  simulatedHolders(address, reason) {
    let seed = [...lower(address)].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const weights = Array.from({ length: 18 }, (_, index) => Math.max(.25, 22 / (index + 1) * (.65 + random() * .7)));
    const total = weights.reduce((sum, value) => sum + value, 0);
    const items = weights.map((weight, index) => {
      const body = Array.from({ length: 40 }, () => Math.floor(random() * 16).toString(16)).join('');
      const nonce = index < 6 ? Math.floor(random() * 4) : Math.floor(8 + random() * 120);
      const accountType = index % 7 === 0 ? 'CONTRACT' : 'EOA';
      return {
        address: `0x${body}`,
        balanceRaw: '0', balance: 0,
        percentage: weight / total * 100,
        nonce,
        kind: nonce <= 3 ? 'NEW' : nonce <= 25 ? 'WARM' : 'ESTABLISHED',
        accountType,
        explorerUrl: `${EXPLORER}/address/0x${body}`
      };
    });
    return {
      mode: 'SIMULATION',
      source: 'Deterministic holder demo',
      coverage: 'fallback holder map',
      heuristic: `RPC unavailable (${reason}). Holder distribution is simulated; token selection remains live`,
      token: { address }, items
    };
  }
}
