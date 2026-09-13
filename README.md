<p align="center">
  <img src="assets/flyswarm-connectome.png" alt="FlySwarm — connectome-inspired wallet intelligence" width="100%">
</p>

# FlySwarm

**The swarm remembers who moves together.**

FlySwarm is a live Robinhood Chain token explorer wrapped around a deterministic wallet-cohort simulation. It discovers recent Pons V2 launches from the factory, searches by ticker or contract, reads observed top-holder balances, and visualizes wallet activity as a bubble map. The selected real token then becomes the subject of a clearly labelled paper simulation: profitable synthetic wallets fund fresh addresses, a compact connectome-inspired graph recognizes a familiar group, and the paper sniper can open a simulated position. The **Swarm Trace** view lets you inspect each funding route, select a cohort wallet, open its dossier, and compare prior joint entries.

> **HYBRID DATA:** token contracts, metadata, Transfer logs, balances, holder nonces and available DexScreener market fields are live. Hunter identity, funding intent, cohort history, signal score, returns and paper positions are simulated. FlySwarm contains no key management, signer or transaction path.

## Run it

Node.js 20+ is the only requirement. There are no packages to install.

```bash
npm start
```

Open `http://127.0.0.1:4173`.

For a short terminal run:

```bash
npm run demo
```

For deterministic checks:

```bash
npm test
```

## What is live

- latest Pons V2 launches read from the published factory on Robinhood Chain;
- ticker search through recent launches and Robinhood pairs indexed by DexScreener;
- direct ERC-20 lookup by contract address;
- observed holders reconstructed from onchain `Transfer` logs and verified with current `balanceOf` calls;
- wallet activity class based on current outgoing transaction count.

The public Robinhood RPC is rate-limited. When it is temporarily unavailable, token selection falls back to current Robinhood Chain pairs from DexScreener. The holder panel then switches to a clearly marked deterministic demo instead of disappearing or pretending that fallback data is onchain.

## What the demo simulates

| Stage | What happens |
|---|---|
| Select | A real Robinhood token is selected from the live explorer |
| Sense | Ranked synthetic hunters fund synthetic fresh addresses |
| Route | One- or two-hop funding paths converge on a meme |
| Recall | The current wallet set is compared with remembered cohorts |
| Score | Cohort overlap, timing and liquidity produce an explainable score |
| Act | The optional paper sniper opens a simulated position |

The same seed produces the same simulation sequence. The browser receives each new state over a local event stream; configuration changes affect only the paper simulator.

## Why a fly brain?

FlySwarm is inspired by connectomics, not a claim to run an uploaded brain. The FlyWire project reconstructed an adult fruit-fly connectome with roughly 140,000 neurons and more than 50 million synapses. Loading that full research dataset would add enormous weight without improving this product demo, so FlySwarm uses a tiny purpose-built graph motif: sensory inputs → cohort memory → evidence score → paper action.

Read the exact boundary and source links in [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Design references

The product shape combines ideas from several MIT-licensed public projects without copying their source code:

- [COPY](https://github.com/lunarresearcher/copy): terminal-first signal flow and paper-first boundary.
- [Canary](https://github.com/Gipppp121/canary): deterministic evidence and read-only safety posture.
- [RUMZO](https://github.com/Nekt-0/rumzo): receipts and explicit synthetic labels.
- [HOP OUT](https://github.com/insomnia-vip/hop-out): visible assumptions instead of magic numbers.
- [FOMO Robinhood Radar](https://github.com/cvxv666/fomo-robinhood-radar): wallet provenance, bursts and cohort convergence.
- [bl888m](https://github.com/bl888m): restrained black/acid-lime editorial direction.

## Project map

```text
src/simulation.mjs     deterministic wallet + cohort engine
server.mjs             local-only HTTP, JSON API and event stream
public/                visual neural desk
bin/flyswarm.mjs       terminal simulation
test/                  deterministic behavior checks
```

## Boundary

This is an interface prototype and research-inspired market simulation. It does not observe deployed wallets, recommend trades or execute orders. “FIRE” describes a synthetic rules result, not financial advice.
