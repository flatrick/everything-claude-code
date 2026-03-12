# Codex Manual Verification

Last verified:
- `2026-03-12`

Tested with version:
- `Codex CLI 0.114.0`

Use this page for quick Codex sanity checks and deeper runtime verification in a real local Codex session.

## Quick Smoke

Run:

```bash
mdt verify tool-setups
mdt smoke tool-setups
mdt smoke workflows --tool codex
```

Installed-home equivalents:

```bash
node ~/.codex/mdt/scripts/mdt.js smoke tool-setups
node ~/.codex/mdt/scripts/mdt.js smoke workflows --tool codex
```

## Deeper Checks

- install verification under `~/.codex/`
- `AGENTS.md`, skills, and rules visibility
- explicit/manual continuous-learning flows
- optional external observer behavior when installed
