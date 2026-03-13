---
name: tool-setup-verifier
description: Verify MDT's shipped Claude, Cursor, and Codex setups against the local workflow contract. Use when auditing tool support, checking whether setup files still exist, validating workflow coverage, or producing a per-tool readiness report without relying on GitHub Actions or live model calls.

---

# Tool Setup Verifier

## When to Use

Use this skill when auditing MDT's local tool adapters, validating documented workflow coverage, or producing a per-tool readiness report without relying on CI or live model calls.

## Source Of Truth

In MDT repo mode, read these first:
1. `docs/tools/capability-matrix.md`
2. `docs/tools/workflow-matrix.md`
3. `scripts/lib/tool-workflow-contract.js`

Treat the docs pack as the human-readable source of truth and the JS contract as the machine-readable enforcement surface.

In installed global tool mode:
1. read `~/.codex/skills/tool-setup-verifier/SKILL.md`
2. read `~/.codex/mdt/scripts/lib/tool-workflow-contract.js`
3. treat `~/.codex/` plus `~/.codex/mdt/` as the install surface
4. do not fail just because the full repo docs pack is absent

## Required Workflow

### MDT repo mode

1. Run `mdt verify tool-setups`.
2. If the relevant CLIs are installed locally, run `mdt smoke tool-setups`.
3. For deeper tool coverage, run `mdt smoke workflows --tool <tool>`.
4. For any tool whose scripted smoke passes, require the tool-specific runtime checklist under `docs/testing/manual-verification/` before calling the setup fully verified.
5. Summarize results by workflow, by tool, and by remaining manual-runtime checks.
6. If something fails, identify the missing file, stale doc claim, or broken local probe before proposing broader changes.

### Installed global tool mode

1. Run `node ~/.codex/mdt/scripts/mdt.js smoke tool-setups`.
2. Run `node ~/.codex/mdt/scripts/mdt.js smoke workflows --tool codex`.
3. Point to `docs/testing/manual-verification/codex.md` for the required real Codex session check.
4. Summarize readiness from the installed global surfaces and clearly separate scripted smoke from pending manual-runtime checks.

## Rules

- Do not rely on GitHub Actions or CI for this workflow.
- Do not require authentication, network access, or a live model session to count a local smoke check as useful.
- If a tool is not installed locally, mark its smoke status as `SKIP`.
- If the docs and the contract disagree, fix the disagreement before expanding scope.
- Do not treat script-only smoke output as proof that the in-tool runtime surfaces are healthy when a manual verification page exists for that tool.
