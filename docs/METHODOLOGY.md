# Methodology and data boundary

## What the research actually provides

A connectome is a wiring diagram: neurons plus their connections. It is not a downloadable mind, a trained trading model or evidence that a fly brain can predict markets.

FlySwarm references two related milestones:

1. The 2023 FlyWire preprint introduced a whole-brain adult *Drosophila* connectome at unprecedented scale.
2. The peer-reviewed adult-brain reconstruction and network analyses were published in *Nature* in 2024. FlyWire's Codex explorer reports about 150,000 neurons and more than 50 million synapses in the current dataset.

Primary resources:

- [FlyWire Codex — Connectome Data Explorer](https://codex.flywire.ai/)
- [FlyWire 2023 connectome preprint](https://www.biorxiv.org/content/10.1101/2023.06.27.546656v1)
- [Neuronal wiring diagram of an adult brain — Nature](https://www.nature.com/articles/s41586-024-07558-y)
- [Network statistics of the whole-brain connectome of Drosophila — Nature](https://www.nature.com/articles/s41586-024-07968-y)

## Why the full dataset is not bundled

The source connectome contains tens of millions of synapses. FlySwarm uses the connectome as a product architecture rather than performing neuroscience analysis, so bundling the complete biological dataset would add substantial weight without improving the wallet pipeline. No biological data file is downloaded during install or runtime.

## The compact motif

The engine borrows one general graph idea:

```text
profitable wallet (sensory source)
        ↓
fresh funded address (relay)
        ↓
shared meme token (convergence)
        ↓
historical cohort match (memory)
        ↓
evidence score (decision)
        ↓
planned position (execution boundary)
```

The score is deterministic and explainable:

- 44% familiar-cohort overlap
- 28% funding-time proximity
- 18% liquidity sufficiency
- up to 10% cohort-size contribution

There is no machine learning model in the decision path.

## Prototype data boundary

The token explorer uses live public data. Recent token addresses and metadata come from Pons V2 factory events and ERC-20 calls on Robinhood Chain. Search results can include Robinhood pairs from DexScreener. The holder graph is reconstructed from observed ERC-20 `Transfer` logs and current `balanceOf` calls.

An EVM externally owned account has no canonical `createdAt` field. FlySwarm therefore labels wallet activity explicitly as an approximation: `NEW` means at most three outgoing transactions, `WARM` means at most 25, and `ESTABLISHED` means more than 25. Smart-contract accounts are identified separately. This is not proof of ownership, common control or funding intent.

Hunter aliases, profitability, inferred funding paths, cohort memory, hit rates, signal scores, returns and planned positions are generated prototype inputs until the production wallet indexer replaces them. The server binds only to `127.0.0.1` by default. There is no wallet connection, private-key input, signer or transaction broadcaster.

Live integration sources:

- [Robinhood Chain connection details](https://docs.robinhood.com/chain/connecting/)
- [Pons protocol and deployed contracts](https://docs.ponsfamily.com/v2)
- [DexScreener API](https://docs.dexscreener.com/api/reference)
