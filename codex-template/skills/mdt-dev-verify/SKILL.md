---
name: mdt-dev-verify
description: Verify MDT's shipped Codex setup against the local workflow contract. Use when auditing Codex support, checking whether installed setup files still exist, validating Codex workflow coverage, or producing a readiness report without relying on CI or live model calls.

---

# MDT Dev Verify

## When to Use

Use this skill when auditing MDT's local Codex adapter, validating documented Codex workflow coverage, or producing a Codex readiness report without relying on CI or live model calls.

## Source Of Truth

In MDT repo mode, read these first:
1. `docs/tools/capability-matrix.md`
2. `docs/tools/workflow-matrix.md`
3. `scripts/lib/tool-workflow-contract.js`

In installed global tool mode:
1. read `~/.codex/skills/mdt-dev-verify/SKILL.md`
2. read `~/.codex/mdt/scripts/lib/tool-workflow-contract.js`
3. treat `~/.codex/` plus `~/.codex/mdt/` as the install surface
4. do not fail just because the full repo docs pack is absent

## Required Workflow

### MDT repo mode

1. Run `mdt verify tool-setups`.
2. If the Codex CLI is installed locally, run `mdt dev smoke tool-setups`.
3. Run `mdt dev smoke workflows --tool codex`.
4. If the scripted smoke passes, point to `docs/testing/manual-verification/codex.md` for the required real Codex session check.
5. Summarize results by workflow, by Codex readiness, and by any remaining manual-runtime checks.

### Installed global tool mode

1. Run `node ~/.codex/mdt/scripts/mdt.js dev smoke tool-setups`.
2. Run `node ~/.codex/mdt/scripts/mdt.js dev smoke workflows --tool codex`.
3. Point to `docs/testing/manual-verification/codex.md` for the required real Codex session check.
4. Summarize readiness from the installed global surfaces and clearly separate scripted smoke from pending manual-runtime checks.

## Rules

- Do not rely on GitHub Actions or CI for this workflow.
- Do not require authentication, network access, or a live model session to count a local smoke check as useful.
- If the Codex CLI is not installed locally, mark its smoke status as `SKIP`.
- If the docs and the contract disagree, fix the disagreement before expanding scope.
- Do not treat script-only smoke output as proof that Codex runtime surfaces such as real-session patching are healthy.
