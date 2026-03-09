# Template Source Migration Status

Last updated: 2026-03-09

## Summary

The template-source migration is complete. The major runtime-style source trees have been moved out of repo-root dot-directories for Cursor, Codex, and OpenCode, and the remaining Claude-facing surfaces have been classified into template source, synced mirrors, root-level shared source, or intentional root-level Claude-native source.

The final adapter layout decision is now made: keep the current root-level template directories (`claude-template/`, `cursor-template/`, `codex-template/`, and `opencode-template/`) as the long-term structure.

The repository is now in the accepted end state:

- `cursor-template/` is the tracked Cursor adapter source
- `codex-template/` is the tracked Codex adapter source
- `opencode-template/` is the tracked OpenCode adapter source
- `claude-template/` exists and currently contains the Claude hook config source
- runtime directories like `.claude/`, `.cursor/`, `.codex/`, and `.opencode/` are intended to be install outputs or local state, not canonical repo source
- Claude-native repo surfaces such as `CLAUDE.md` and `.claude-plugin/` intentionally remain at repo root and are not template-migration leftovers

## Completed

### 1. Cursor source migration

Completed via:

- commit `c0e5e66` `refactor: move cursor and codex sources to template dirs`

What was done:

- moved tracked Cursor source from `.cursor/` to `cursor-template/`
- rewired installer and verification logic to use `cursor-template/`
- updated relevant docs and tests to stop treating repo `.cursor/` as canonical source

### 2. Codex source migration

Completed via:

- commit `c0e5e66` `refactor: move cursor and codex sources to template dirs`

What was done:

- moved tracked Codex source from `.codex/` to `codex-template/`
- rewired installer and workflow verification to use `codex-template/`
- updated relevant docs and tests to stop treating repo `.codex/` as canonical source

### 3. OpenCode source migration

Completed via:

- commit `51e4d29` `refactor: move opencode sources to template dir`

What was done:

- moved tracked OpenCode source from `.opencode/` to `opencode-template/`
- rewired metadata validation, workflow verification, docs, and tests to use `opencode-template/`

### 4. Stop tracking local Claude package-manager state

Completed via:

- commit `a601ebe` `chore: stop tracking local claude package manager config`

What was done:

- removed tracked `.claude/package-manager.json`
- documented it as ignored local-only runtime state

### 5. Claude hook config migration

Completed via:

- commit `d448be7` `refactor: move claude hook config to template dir`

What was done:

- moved tracked Claude hook source from `hooks/claude/hooks.json` to `claude-template/hooks.json`
- kept `hooks/hooks.json` as the Claude-facing mirror
- updated hook platform logic, validators, docs, and tests

### 6. Validation state confirmed after Claude slice

Confirmed locally after the Claude hook move:

- `node .\\tests\\run-all.js --profile claude` passed
- `node .\\tests\\run-all.js --profile codex` passed

Additional targeted checks that passed during this migration:

- `node scripts/verify-tool-setups.js`
- `node scripts/smoke-codex-workflows.js`
- `node scripts/ci/validate-hook-mirrors.js`
- `node scripts/ci/validate-hooks.js`
- `node scripts/ci/validate-runtime-ignores.js`
- `node scripts/ci/validate-markdown-links.js`
- `node scripts/ci/validate-markdown-path-refs.js`

### 7. Claude closeout and migration-complete criteria

Completed in the final closeout pass:

- expanded Claude classification in [template-source-migration-inventory.md](template-source-migration-inventory.md) to cover:
  - `claude-template/` source
  - Claude-facing mirrors
  - root-level shared MDT source
  - root-level Claude-native source outside templates
  - local/runtime-only state
- locked the source-vs-mirror ownership contract for Claude hook config
- added runtime-dir ignore enforcement for `.claude/`, `.cursor/`, `.codex/`, and `.opencode/`
- aligned migration docs and README wording around the completed state

## Final Accepted Layout

- `claude-template/`, `cursor-template/`, `codex-template/`, and `opencode-template/` are the canonical per-tool template dirs.
- `claude-template/hooks.json` is the canonical Claude hook config source.
- `hooks/hooks.json` is the synced Claude-facing mirror and must not become the source of truth.
- `CLAUDE.md` and `.claude-plugin/` are intentional root-level Claude-native artifacts.
- Shared MDT assets such as schemas, commands, agents, skills, and scripts remain at repo root.
- `.claude/`, `.cursor/`, `.codex/`, and `.opencode/` are runtime/install dirs only.

## Migration-Complete Checklist

- no tracked tool-template source remains under repo-root runtime dirs
- Claude hook edits happen in `claude-template/hooks.json`, not in `hooks/hooks.json`
- runtime-dir ignore coverage exists for `.claude/`, `.cursor/`, `.codex/`, and `.opencode/`
- migration docs and README describe the same accepted layout
- the following commands pass:
  - `node scripts/verify-tool-setups.js`
  - `node scripts/smoke-codex-workflows.js`
  - `node scripts/ci/validate-hook-mirrors.js`
  - `node scripts/ci/validate-hooks.js`
  - `node scripts/ci/validate-runtime-ignores.js`
  - `node scripts/ci/validate-markdown-links.js`
  - `node scripts/ci/validate-markdown-path-refs.js`
  - `node .\tests\run-all.js --profile claude`
  - `node .\tests\run-all.js --profile codex`

## Newly Locked Decision

Final top-level adapter layout:

- keep root-level:
  - `claude-template/`
  - `cursor-template/`
  - `codex-template/`
  - `opencode-template/`
- do **not** introduce an additional `templates/` parent directory in this migration

Rationale:

- minimizes churn in installer/test/doc paths that already target `*-template/`
- keeps migration focused on source ownership boundaries rather than broad structural reshuffles
- allows the next work item to focus on clarifying and completing the Claude adapter model


## Known Decisions

- Runtime/install directories should not be tracked as canonical source.
- `.claude/`, `.cursor/`, `.codex/`, and `.opencode/` are intended to be local state or rendered outputs.
- Root-level shared MDT assets should not automatically be treated as Claude-only just because Claude was the original reference implementation.
- Claude-native repo surfaces do not have to live under `claude-template/` if they are repo metadata or project guidance rather than install-template content.
- The current template-source move is about source ownership and layout, not broad feature redesign.

## Follow-Up Outside This Migration

The template-source migration itself is done. Remaining work should be tracked as normal stabilization or parity follow-up, for example:

- wider docs cleanup outside the migration notes
- Cursor parity work listed in `NEXT-STEPS.md`
- deeper workflow smoke coverage for Claude and OpenCode

## Notes For Future Agents

- Use this file as the first status read.
- Use [template-source-migration-plan.md](template-source-migration-plan.md) for the intended architecture.
- Use [template-source-migration-inventory.md](template-source-migration-inventory.md) for the original source classification.
- Confirm actual completion state against git history when needed, especially these commits:
  - `c0e5e66`
  - `51e4d29`
  - `a601ebe`
  - `d448be7`
