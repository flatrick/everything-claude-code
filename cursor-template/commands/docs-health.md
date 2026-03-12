---
name: docs-health
description: Audit MDT docs for current-truth drift, stale links, and plan/backlog mismatches.

---

# Docs Health

Use this command to audit MDT documentation health without guessing.

## Check These Surfaces

- current-state docs under `docs/`
- root fast-find docs
- active plans under `docs/plans/`
- backlog items in `BACKLOG.md`
- runtime prompt Markdown that teaches MDT behavior

## Current Rules

- `docs/` is the current-truth surface
- `docs/plans/` is the planning surface
- `BACKLOG.md` is the active gap/deferred work surface
- `docs/upstream-rename-map.md` is the ECC comparison surface
- current-state docs should use `mdt ...` as the public entrypoint
- environment-specific verification claims should be version-stamped

## Suggested Checks

- compare root docs against `docs/`
- compare runtime prompt assets against current docs
- look for stale version strings
- look for bare `node scripts/mdt.js` in current-state docs
- look for tool-specific assumptions presented as base MDT behavior
- look for active plans that are not reflected in `docs/plans/active.md`
