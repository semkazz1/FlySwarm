const HUNTERS = [
  ['0x7A31…C91F', 'Mantis', 78, 184],
  ['0xB04E…18AA', 'Ghost', 71, 132],
  ['0x19F2…D620', 'Proteus', 75, 119],
  ['0xC821…07D4', 'Kite', 68, 96],
  ['0x5D99…B310', 'Orbit', 73, 88],
  ['0xE400…A72C', 'Ilsa', 66, 74],
  ['0xA91B…42E0', 'Bram', 69, 62],
  ['0xD118…F802', 'Kett', 64, 51]
].map(([address, alias, winRate, pnl]) => ({ address, alias, winRate, pnl }));

const TOKENS = [
  { symbol: 'MOLT', name: 'Molt Season', liquidity: 184000 },
  { symbol: 'BUZZ', name: 'Terminal Buzz', liquidity: 92000 },
  { symbol: 'LARVA', name: 'Larva Protocol', liquidity: 128000 },
  { symbol: 'EYE', name: 'Compound Eye', liquidity: 241000 }
];

const COHORT_MEMORY = [
  { members: ['Mantis', 'Ghost', 'Proteus'], runs: 7, hitRate: 71, medianReturn: 2.8, history: [
    { token: 'PEST', age: '12d', result: 4.6, peak: 7.9 }, { token: 'WING', age: '31d', result: 2.1, peak: 3.4 }, { token: 'MITE', age: '48d', result: -0.4, peak: 1.3 }
  ] },
  { members: ['Kite', 'Orbit', 'Ilsa'], runs: 5, hitRate: 60, medianReturn: 1.9, history: [
    { token: 'HIVE', age: '8d', result: 3.2, peak: 5.1 }, { token: 'GLOW', age: '22d', result: 1.7, peak: 2.6 }, { token: 'DUST', age: '57d', result: -0.6, peak: 1.1 }
  ] },
  { members: ['Mantis', 'Bram', 'Kett'], runs: 4, hitRate: 75, medianReturn: 3.2, history: [
    { token: 'ANT', age: '17d', result: 5.4, peak: 8.8 }, { token: 'CELL', age: '39d', result: 2.8, peak: 4.0 }, { token: 'ECHO', age: '63d', result: 1.4, peak: 2.2 }
  ] }
];

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const shortFresh = n => `0x${(0xA4F00 + n * 0x91D).toString(16).toUpperCase()}…${(0xB000 + n * 0x67).toString(16).slice(-4).toUpperCase()}`;
const now = () => new Date().toISOString();

export class FlySwarmSimulation {
  constructor(seed = 20240627) {
    this.seed = seed;
    this.random = mulberry32(seed);
    this.listeners = new Set();
    this.reset();
  }

  reset() {
    this.tickNo = 0;
    this.transfers = [];
    this.signals = [];
    this.positions = [];
    this.activeToken = 0;
    this.focusToken = null;
    this.config = { enabled: false, minScore: 78, maxPosition: 250 };
    this.network = { nodes: [], edges: [] };
    this.seedScene();
  }

  seedScene() {
    for (let i = 0; i < 9; i++) this.tick();
  }

  onUpdate(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { const snapshot = this.snapshot(); for (const fn of this.listeners) fn(snapshot); }

  updateConfig(input = {}) {
    if (typeof input.enabled === 'boolean') this.config.enabled = input.enabled;
    if (Number.isFinite(Number(input.minScore))) this.config.minScore = Math.max(55, Math.min(99, Number(input.minScore)));
    if (Number.isFinite(Number(input.maxPosition))) this.config.maxPosition = Math.max(10, Math.min(5000, Number(input.maxPosition)));
    this.emit();
    return this.snapshot();
  }

  setFocus(input = {}) {
    if (!input.symbol) return this.snapshot();
    this.focusToken = {
      symbol: String(input.symbol).slice(0, 18),
      name: String(input.name || input.symbol).slice(0, 80),
      liquidity: Math.max(1000, Number(input.liquidity) || 92000)
    };
    this.transfers = [];
    this.signals = [];
    this.network = { nodes: [], edges: [] };
    this.emit();
    return this.snapshot();
  }

  tick() {
    this.tickNo += 1;
    if ((this.tickNo - 1) % 12 === 0) this.activeToken = Math.floor((this.tickNo - 1) / 12) % TOKENS.length;
    const token = this.focusToken || TOKENS[this.activeToken];
    const cohort = COHORT_MEMORY[Math.floor((this.tickNo - 1) / 12) % COHORT_MEMORY.length];
    const memberIndex = (this.tickNo - 1) % 12;
    const preferred = memberIndex < cohort.members.length ? cohort.members[memberIndex] : null;
    const source = HUNTERS.find(h => h.alias === preferred) || HUNTERS[Math.floor(this.random() * HUNTERS.length)];
    const fresh = shortFresh(this.tickNo);
    const amount = Math.round(900 + this.random() * 6700);
    const transfer = {
      id: `tx-${this.tickNo}`,
      at: now(),
      age: 'now',
      source: source.address,
      alias: source.alias,
      fresh,
      token: token.symbol,
      amount,
      hop: this.random() > .76 ? 2 : 1
    };
    this.transfers.unshift(transfer);
    this.transfers = this.transfers.slice(0, 28);
    this.rebuildNetwork(token.symbol);
    this.detect(token, cohort);
    this.markPositions();
    this.emit();
    return this.snapshot();
  }

  detect(token, memory) {
    const recent = this.transfers.filter(t => t.token === token.symbol).slice(0, 8);
    const unique = [...new Set(recent.map(t => t.alias))];
    if (unique.length < 3) return;
    const overlap = memory.members.filter(m => unique.includes(m)).length;
    const timing = Math.max(0, 100 - (recent.length - unique.length) * 7);
    const memoryScore = Math.round((overlap / memory.members.length) * 100);
    const liquidityScore = Math.min(100, Math.round(token.liquidity / 2600));
    const score = Math.round(memoryScore * .44 + timing * .28 + liquidityScore * .18 + Math.min(unique.length * 4, 10));
    const last = this.signals[0];
    if (last?.token === token.symbol && last?.cohortSize === unique.length) return;
    const status = score >= 84 ? 'FIRE' : score >= 70 ? 'WATCH' : 'NOISE';
    const signal = {
      id: `sig-${this.tickNo}`,
      at: now(), token: token.symbol, name: token.name, status, score,
      cohortSize: unique.length, wallets: unique.slice(0, 6),
      fundingPaths: recent.slice(0, 6).map(t => `${t.alias} → ${t.fresh}`),
      memory: { matched: overlap, runs: memory.runs, hitRate: memory.hitRate, medianReturn: memory.medianReturn, history: memory.history },
      evidence: [
        `${unique.length} profitable wallets converged`,
        `${overlap}/${memory.members.length} familiar cohort members returned`,
        `$${token.liquidity.toLocaleString('en-US')} simulated liquidity`
      ]
    };
    this.signals.unshift(signal);
    this.signals = this.signals.slice(0, 12);
    if (this.config.enabled && score >= this.config.minScore && !this.positions.some(p => p.token === token.symbol && p.open)) {
      this.positions.unshift({ id: `pos-${this.tickNo}`, token: token.symbol, entry: 1, mark: 1, size: this.config.maxPosition, pnl: 0, open: true, signalId: signal.id });
    }
  }

  rebuildNetwork(token) {
    const recent = this.transfers.filter(t => t.token === token).slice(0, 7);
    const nodes = [{ id: token, label: `$${token}`, type: 'token', strength: 1 }];
    const edges = [];
    for (const [i, t] of recent.entries()) {
      if (!nodes.some(n => n.id === t.alias)) nodes.push({ id: t.alias, label: t.alias, type: 'hunter', strength: .8 });
      nodes.push({ id: t.fresh, label: t.fresh, type: 'fresh', strength: .42 });
      edges.push({ from: t.alias, to: t.fresh, pulse: i === 0 });
      edges.push({ from: t.fresh, to: token, pulse: i < 3 });
    }
    this.network = { nodes, edges };
  }

  markPositions() {
    for (const p of this.positions) {
      const drift = (this.random() - .43) * .07;
      p.mark = Math.max(.2, p.mark * (1 + drift));
      p.pnl = Math.round((p.mark - p.entry) * p.size * 100) / 100;
    }
  }

  snapshot() {
    const top = this.signals[0] || null;
    return {
      meta: {
        mode: 'SIMULATION', seed: this.seed, tick: this.tickNo,
        disclaimer: 'Synthetic market and wallet data. No keys. No transactions.'
      },
      pulse: {
        watchedWallets: HUNTERS.length,
        freshAddresses: new Set(this.transfers.map(t => t.fresh)).size,
        activeCohort: top?.cohortSize || 0,
        neuronMotifs: 14,
        paperPnl: Math.round(this.positions.reduce((sum, p) => sum + p.pnl, 0) * 100) / 100
      },
      config: { ...this.config },
      focusToken: this.focusToken,
      hunters: HUNTERS,
      transfers: this.transfers,
      signals: this.signals,
      positions: this.positions,
      network: this.network,
      memory: COHORT_MEMORY
    };
  }
}
