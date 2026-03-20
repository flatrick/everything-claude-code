## Context

A concrete Codex bug already exists in the repo: installed dev homes can expose `mdt ... smoke workflows --tool codex`, but the runtime path fails because `scripts/mdt.js` eagerly loads smoke helpers that are not packaged into the installed `~/.codex/mdt/scripts/` tree. That is a real contract mismatch, not a documentation preference.

This change keeps the fix narrow: repair the install/runtime contract for Codex dev smoke without expanding the normal end-user install baseline.

## Goals / Non-Goals

**Goals:**
- Ensure supported Codex dev smoke entrypoints are runnable from an installed dev home.
- Align installed helper packaging with the helpers `mdt.js` actually requires.
- Add regression coverage for Codex dev smoke packaging.

**Non-Goals:**
- Do not broaden dev smoke into the normal end-user install surface.
- Do not change unrelated workflow-contract semantics.
- Do not claim full Codex runtime verification from smoke alone.

## Decisions

### Fix the contract at the install/runtime boundary
The supported smoke entrypoint must either package the required helpers or load them lazily by tool so installed Codex dev homes do not require absent files.

Alternative considered: document the failure as expected.
Rejected because the current docs and verification model already treat Codex dev smoke as a supported maintainer path.

### Keep Codex smoke scoped to dev installs
Any extra helper material needed for Codex smoke remains part of the `--dev` install surface only.

Alternative considered: ship smoke helpers in all installs.
Rejected because dev smoke is explicitly maintainer-only.

## Risks / Trade-offs

- Fix could unintentionally change smoke behavior for Claude or Cursor -> Mitigation: keep helper loading tool-scoped and run targeted smoke-related tests.
- Packaging more helpers into dev installs increases install surface slightly -> Mitigation: keep additions limited to helpers required by supported Codex smoke flows.

## Migration Plan

1. Identify which smoke helpers `mdt.js` loads during Codex workflow smoke.
2. Either package those helpers into dev installs or change loading to match installed tool scope.
3. Add tests for Codex dev install output and smoke invocation behavior.
4. Refresh any affected verification docs if the dev-smoke boundary wording changes.

## Open Questions

- Whether the cleanest fix is eager packaging or tool-scoped lazy loading in `mdt.js`.
- Whether other tool smoke flows have similar hidden eager-load assumptions.
