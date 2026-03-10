# Codex Manual Verification

Use this page for quick Codex sanity checks and deeper runtime verification in a
real local Codex session.

## Quick Smoke

Codex does not use the same markdown command surface as Claude Code or Cursor.
For Codex, the smoke path is:

- the `tool-setup-verifier` skill under `.agents/skills/`
- the local smoke scripts for the current repo mode:
  - MDT repo mode:
    - `node scripts/verify-tool-setups.js`
    - `node scripts/smoke-tool-setups.js`
    - `node scripts/smoke-codex-workflows.js`
  - installed target repo mode:
    - `node .agents/scripts/smoke-tool-setups.js`
    - `node .agents/scripts/smoke-codex-workflows.js`

Expected:
- in MDT repo mode, `verify-tool-setups.js` passes
- `smoke-tool-setups.js` reports Codex CLI probes as `PASS` when Codex is installed
- `smoke-codex-workflows.js` reports the current Codex MDT workflows as `PASS`

## Package Install

Install Codex with explicit packages:

```bash
node scripts/install-mdt.js --target codex typescript continuous-learning
```

If you want to test against a different repo without changing the current
workspace, use:

```bash
node scripts/install-mdt.js --target codex --project-dir ../scratch-repo typescript continuous-learning
```

Then confirm:

- `~/.codex/config.toml` exists
- `~/.codex/AGENTS.md` exists
- `.agents/skills/` contains the selected Codex skills
- `.agents/scripts/lib/` exists for MDT runtime helpers

## Continuous Learning

Codex currently uses an explicit workflow instead of hooks.

1. Check status:

```bash
node .agents/skills/continuous-learning-manual/scripts/codex-learn.js status
```

Expected:
- `Tool: codex`
- storage under project `.codex/homunculus/...`

2. Capture a concise session summary:

```bash
node .agents/skills/continuous-learning-manual/scripts/codex-learn.js capture < summary.txt
```

3. Run one explicit analysis pass:

```bash
node .agents/skills/continuous-learning-manual/scripts/codex-learn.js analyze
```

Expected:
- observations are archived after analysis
- `observer.log` is written under project `.codex/homunculus/projects/<id>/`
- project-scoped instincts can be created under `.codex/homunculus/projects/<id>/instincts/personal/`
- if the active Codex shell blocks subprocess spawn (`EPERM`/`EACCES`), treat
  that as an environment limitation, not as proof that project detection is broken

4. Generate one weekly retrospective:

```bash
node .agents/skills/continuous-learning-manual/scripts/codex-learn.js weekly --week 2026-W11
```

Expected:
- a summary file is written under `.codex/homunculus/projects/<id>/retrospectives/weekly/`
- the summary includes automation-oriented sections such as repeated commands,
  repeated files, repeated workflows, and automation candidates
- the output stays sparse and reflects only the requested ISO week

## Optional External Observer

For Codex specifically, an optional external Node observer is an acceptable
future design.

Use that direction when:

- project-scoped storage works
- explicit `capture` and `weekly` flows work
- but background `analyze` is blocked by the active Codex shell environment

The intended shape is:

- Codex sessions keep writing explicit local learning artifacts
- a separate Node process watches project `.codex/homunculus/`
- that process runs heavier analysis outside the restricted Codex session
- the explicit/manual flow remains the baseline even if the external observer is added later

## Likely Deeper Checks

- local Codex launch verification for this repo
- sandbox/profile verification for trusted local testing
- install and config verification under the Codex repo template
- manual checks for workflows driven by `AGENTS.md` and installed skills
- any future Codex-native continuous-learning behavior

## Notes

- Keep this page focused on behavior that must be verified in a real local Codex session.
- Keep CLI-first checks in [docs/tools/local-verification.md](../../tools/local-verification.md).
