## Why

`ai-learning` is still implemented through a split layout: shared runtime code outside the skill tree, a Codex-specific overlay with duplicated pieces, and analyzer flows that can fail or hang for tool-specific reasons. That makes the capability hard to reason about, fragile across install contexts, and out of sync with the intended "one canonical source plus additive overlays" model.

## What Changes

- Move the ai-learning runtime core into the shared `skills/ai-learning/` tree so the skill becomes the canonical capability home in both repo and installed contexts.
- Retire duplicate Codex ai-learning runtime content and keep Codex-specific differences limited to additive metadata or config.
- Replace fragile multi-candidate internal import chains with stable skill-relative entrypoints.
- Fix `mdt learning analyze` so analyzer payload delivery does not depend on interactive Read-tool behavior and does not fail silently on timeout or empty subprocess output.
- Verify that hook-enabled and hook-free learning flows still route through one shared runtime model after the layout change.

## Capabilities

### New Capabilities

- `ai-learning-runtime-layout`: Defines the canonical ai-learning runtime layout, stable internal entrypoints, and additive overlay boundary for tool-specific ai-learning material.
- `ai-learning-analysis-runtime`: Defines analyzer invocation, payload transport, timeout behavior, and failure reporting for `mdt learning analyze`.

### Modified Capabilities

- `ai-learning`: Tighten the existing ai-learning capability so the shared skill tree is not just the canonical documentation home but also the canonical runtime home, and so analyzer/runtime behavior is explicit.
- `install-packages`: Update install expectations for ai-learning packaging after the canonical runtime tree and additive overlay rules change.

## Impact

- Affected code under `skills/ai-learning/`, `scripts/lib/continuous-learning/`, `scripts/codex-observer.js`, `scripts/mdt.js`, install metadata, and related tests.
- Affected install shape for Claude, Cursor, and Codex learning surfaces.
- Affected maintainer verification for ai-learning runtime parity across repo, temp copies, and installed homes.
