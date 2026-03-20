## Why

The repo still contains example surfaces named and framed as Claude-only artifacts under `examples/*CLAUDE*.md`, even though MDT's current contract is tool-agnostic by default and keeps tool-specific differences explicit. Those examples create drift pressure by making Claude-shaped examples look like the generic baseline.

## What Changes

- Audit the remaining Claude-only example/reference files under `examples/*CLAUDE*.md`.
- Retire files that no longer represent a useful current MDT example surface.
- Generalize files that still have value so they describe tool-agnostic MDT guidance or explicitly scoped tool-specific examples.
- Update any references so current docs do not point maintainers toward stale Claude-only example material as the default model.

## Capabilities

### New Capabilities

- `example-surface-governance`: Defines how example/reference surfaces must align with MDT's tool-agnostic-by-default current contract.

### Modified Capabilities

- `tool-capability-docs`: Tighten the docs-pack boundary so example/reference files do not silently redefine the default cross-tool model.

## Impact

- Affected files under `examples/` and any docs or references that point to those examples.
- Affected maintainer understanding of whether Claude-shaped examples are generic MDT defaults or explicitly tool-specific.
