# Claude Code Manual Verification

Last verified:
- `2026-03-12`

Tested with version:
- `Claude Code 2.1.73`

Use this page for quick Claude Code sanity checks and deeper runtime verification when MDT is installed into `~/.claude/`.

## Preconditions

1. Start from a clean repo checkout or remove the existing MDT files under `~/.claude/`.
2. Install MDT into Claude Code with `mdt install typescript continuous-learning`.
3. Confirm that `~/.claude/settings.json`, `~/.claude/commands/smoke.md`, and `~/.claude/skills/continuous-learning-manual/` exist.

## Quick Smoke

Run:

```bash
mdt smoke workflows --tool claude
```

Installed-home equivalent:

```bash
node ~/.claude/mdt/scripts/mdt.js smoke workflows --tool claude
```

## Deeper Checks

- hook execution and hook side effects
- session summary persistence
- continuous-learning observation capture
- Claude-native commands, agents, and memory behavior
