## Why

MDT already has a shared observer runtime that is conceptually tool-agnostic, but the outer wrapper, package naming, tests, and documentation still frame the external observer surface as Codex-specific. That makes the abstraction narrower than the repo intent: Codex is only the first current consumer, not the owner of the concept.

## What Changes

- Generalize the external observer wrapper contract so it is described as a tool-agnostic external observer surface.
- Rename the Codex-specific wrapper and related package/docs/tests so the naming no longer implies Codex owns the concept.
- Keep current realized support scoped to Codex until another tool actually uses the wrapper.
- Preserve the distinction between a generic observer-wrapper contract and current Codex-only realization.

## Capabilities

### New Capabilities

- `external-observer-wrapper`: Defines the tool-agnostic external observer wrapper contract.

### Modified Capabilities

- `ai-learning`: Tighten the observer model so the external wrapper is generic while current realized support remains explicitly tool-scoped.
- `install-packages`: Update package/install metadata so the optional observer wrapper is not named as inherently Codex-specific.
- `tool-surfaces`: Clarify that the observer wrapper is a generic runtime surface even when only one tool currently realizes it.

## Impact

- Affected runtime wrapper naming, package metadata, docs, tests, and compatibility checks.
- Affected future extensibility for other hook-free or external-observer tool realizations without overclaiming current support.
