<p align="center">
  <img src="assets/flyswarm-connectome.png" alt="FlySwarm — wallet cohort intelligence for Robinhood Chain" width="100%">
</p>

<h1 align="center">FlySwarm</h1>

<p align="center"><code>the swarm remembers who moves together</code></p>

<p align="center">
  <a href="https://flyswarm-gyomei.bogdanforeveer228.chatgpt.site"><img src="https://img.shields.io/badge/OPEN_THE_RADAR-C8FF00?style=for-the-badge&labelColor=080905" alt="Open FlySwarm"></a>
  <img src="https://img.shields.io/badge/ROBINHOOD_CHAIN-LIVE-C8FF00?style=for-the-badge&labelColor=080905" alt="Robinhood Chain live">
  <img src="https://img.shields.io/badge/DEPENDENCIES-0-F4F5ED?style=for-the-badge&labelColor=080905" alt="Zero runtime dependencies">
</p>

FlySwarm is a wallet-cohort intelligence desk for Robinhood Chain. It watches token launches, maps top holders, traces profitable-wallet funding into fresh addresses, and recognizes when a familiar group converges on the same meme.

The result is one explainable signal: **who moved, where the funding came from, which wallets returned together, and how the same formation performed before.**

`live tokens → holder map → fresh-wallet routes → cohort recall → FIRE / WATCH / NOISE`

---

## The radar

| Surface | Status | What it does |
|---|---:|---|
| Token discovery | **LIVE** | Reads current Robinhood Chain pairs and recent Pons V2 launches |
| Ticker + contract search | **LIVE** | Resolves a symbol or an exact ERC-20 address |
| Bubble map | **LIVE / FALLBACK** | Maps observed holders; stays available during RPC interruptions |
| Swarm Trace | **ALPHA** | Reconstructs funding routes through fresh addresses |
| Cohort memory | **ALPHA** | Matches recurring wallet groups and prior joint entries |
| Signal desk | **ALPHA** | Produces an evidence-backed `FIRE / WATCH / NOISE` decision |
| Autosnipe plan | **ALPHA** | Applies a threshold and position-size rule without signing transactions |

## Open the desk

```bash
git clone <your-flyswarm-repository>
cd FlySwarm
npm start
```

Open `http://127.0.0.1:4173`.

No install step. No runtime packages. Node.js 20+ is enough.

```bash
npm run cli     # terminal feed
npm test        # deterministic engine check
```

## How it moves

```text
Robinhood RPC ─┐
               ├── token universe ── holder graph ──┐
DexScreener ───┘                                     │
                                                     ├── swarm score
wallet routes ── fresh addresses ── cohort memory ──┘       │
                                                             └── FIRE / WATCH / NOISE
```

Every signal keeps its receipts:

- profitable source wallet;
- funded fresh address;
- direct or relayed route;
- returning cohort members;
- past joint entries and outcomes;
- threshold and position plan.

## Data boundary

Token discovery, contracts, available market fields and successful RPC reads come from public Robinhood Chain and DexScreener sources. Cohort profitability, historical formations, inferred funding attribution and signal outcomes are **prototype data** until a production indexer is connected. The repository contains no private-key input, signer or transaction broadcaster.

## Project map

```text
src/             token adapter + cohort engine
public/          radar, Swarm Trace and signal desk
server.mjs       local HTTP API and event stream
worker.mjs       hosted Worker entrypoint
bin/             terminal feed
docs/            data model and research notes
test/            engine checks
```

## Why a fly brain?

FlySwarm borrows one useful idea from connectomics: simple local connections can reveal a larger recurring pattern. The product turns transfers into a compact graph—source wallets become sensory inputs, fresh addresses become relay nodes, and remembered cohorts become motifs that can fire a signal.

The full FlyWire dataset is intentionally not bundled. FlySwarm keeps only the graph architecture needed for the wallet-intelligence pipeline.

## License

MIT
