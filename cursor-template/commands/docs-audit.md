---
name: docs-audit
description: Audit the current repo docs for drift, stale links, and misplaced current truth.

---

# Docs Audit

Use this command to audit repository documentation health without guessing.

## Check These Surfaces

- current-state docs under `docs/`
- root fast-find docs
- active plans under `docs/plans/`
- scoped OpenSpec changes under `openspec/changes/`
- broader planning context under `docs/plans/`
- runtime prompt Markdown that teaches tool/workflow behavior

## Current Rules

- `docs/` is the current-truth surface
- `docs/plans/` is the planning surface
- `openspec/changes/` is the active scoped-change surface
- `docs/plans/` is the broader planning surface
- `docs/upstream-rename-map.md` is the ECC comparison surface
- current-state docs should use the documented public entrypoints
- environment-specific verification claims should be version-stamped

## Suggested Checks

- compare root docs against `docs/`
- compare runtime prompt assets against current docs
- look for stale version strings
- look for bare `node scripts/mdt.js` in current-state docs
- look for tool-specific assumptions presented as base MDT behavior
- look for active plans that are not reflected in `docs/plans/active.md`
