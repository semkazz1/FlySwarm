import assert from 'node:assert/strict';
import { FlySwarmSimulation } from '../src/simulation.mjs';

const sim = new FlySwarmSimulation(20240627);
let state;
for (let i = 0; i < 24; i++) state = sim.tick();
assert.equal(state.meta.mode, 'SIMULATION');
assert.ok(state.transfers.length >= 20, 'expected a populated transfer tape');
assert.ok(state.signals.some(s => s.cohortSize >= 3), 'expected cohort convergence');
assert.ok(state.network.nodes.some(n => n.type === 'fresh'), 'expected fresh wallet nodes');
sim.updateConfig({ enabled: true, minScore: 55, maxPosition: 150 });
for (let i = 0; i < 16; i++) state = sim.tick();
assert.ok(state.positions.length > 0, 'expected a paper position');
assert.ok(state.positions.every(p => p.size === 150), 'expected configured paper size');
console.log(`ok · ${state.transfers.length} transfers · ${state.signals.length} signals · ${state.positions.length} paper positions`);
