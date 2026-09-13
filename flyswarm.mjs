#!/usr/bin/env node
import { FlySwarmSimulation } from '../src/simulation.mjs';

const sim = new FlySwarmSimulation();
const lime = '\x1b[38;2;200;255;0m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';
console.log(`${lime}FLYSWARM${reset} ${dim}connectome signal engine · SIMULATION${reset}`);
console.log(`${dim}synthetic wallets · synthetic markets · paper execution only${reset}\n`);
for (let i = 0; i < 18; i++) {
  const s = sim.tick();
  const tx = s.transfers[0];
  const signal = s.signals[0];
  console.log(`${dim}${String(s.meta.tick).padStart(3, '0')}${reset} ${tx.alias.padEnd(8)} → ${tx.fresh} → $${tx.token}  $${tx.amount.toLocaleString()}`);
  if (signal?.id === `sig-${s.meta.tick}`) console.log(`    ${lime}${signal.status.padEnd(5)} ${signal.score}/100${reset} · ${signal.cohortSize} wallets · memory ${signal.memory.matched}/${signal.memory.runs} · ${signal.token}`);
}
