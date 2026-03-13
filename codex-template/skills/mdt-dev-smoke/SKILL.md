---
name: mdt-dev-smoke
description: Run a quick MDT Codex dev smoke check from an installed dev setup using the shipped global smoke scripts.

---

# MDT Dev Smoke

## When to Use

Use this skill for a fast Codex sanity check after a `--dev` install or when a
Codex setup may have drifted from the documented MDT contract.

## Required Workflow

1. Run `node ~/.codex/mdt/scripts/mdt.js dev smoke tool-setups`.
2. Run `node ~/.codex/mdt/scripts/mdt.js dev smoke workflows --tool codex`.
3. If the scripted smoke passes, point to `docs/testing/manual-verification/codex.md` for the required real Codex session check before calling the setup fully verified.
4. Summarize the scripted smoke result as `PASS`, `FAIL`, or `SKIP`.
5. If anything fails, name the missing file or broken surface before proposing broader changes.

## Output Format

Return:

- overall smoke status
- top failure or skip reason
- exact next remediation step

## Rules

- Do not guess from memory.
- Do not require network access or a live model session.
- Treat `EPERM` or `EACCES` subprocess failures as environment limitations and report `SKIP`, not `FAIL`.
- Make it explicit that scripted smoke proves install surfaces, not every runtime behavior inside a live Codex session.
- Use `mdt-dev-verify` when the user wants a deeper Codex readiness audit beyond this smoke pass.
