# Claude Code Manual Verification

Last verified:
- `2026-03-12`

Tested with version:
- `Claude Code 2.1.73`

Use this page for quick Claude Code sanity checks and deeper runtime verification when MDT is installed into `~/.claude/`.

## Preconditions

1. Start from a clean repo checkout or remove the existing MDT files under `~/.claude/`.
2. Install MDT into Claude Code with `mdt install typescript continuous-learning`.
3. Confirm that `~/.claude/settings.json`, `~/.claude/commands/smoke.md`, and `~/.claude/skills/ai-learning/` exist.

## Quick Smoke

Run:

```bash
mdt smoke tool-setups --tool claude
mdt smoke workflows --tool claude
```

Installed-home equivalent:

```bash
node ~/.claude/mdt/scripts/mdt.js smoke tool-setups --tool claude
node ~/.claude/mdt/scripts/mdt.js smoke workflows --tool claude
```

## Deeper Checks

- hook execution and hook side effects
- session summary persistence
- continuous-learning observation capture
- Claude-native commands, agents, and memory behavior

## Required Real-Session Check

After the scripted smoke passes, open a real Claude Code session in this repo and verify at least one small end-to-end MDT-guided task:

1. Ask Claude to make a tiny disposable documentation or test-only edit in the repo.
2. Confirm it follows repo guidance from `AGENTS.md` and prefers MDT workflow behavior rather than free-form ad hoc edits.
3. If hooks or continuous-learning are installed, confirm the expected runtime side effect appears where the install says it should.
4. Record any mismatch between scripted smoke and Claude session behavior before calling the setup fully verified.
