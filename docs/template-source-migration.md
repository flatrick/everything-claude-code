# Template Source Migration

This document is the entrypoint for the template-source migration record.

Use these documents together:

- [Plan](template-source-migration-plan.md) — target architecture, phases, risks, and verification plan
- [Inventory](template-source-migration-inventory.md) — original classification of tracked runtime-style source assets
- [Status](template-source-migration-status.md) — final completion state, accepted layout, and verification checklist

## Purpose

The migration separates:

- canonical MDT source assets
- per-tool adapter/template source
- generated or machine-local runtime directories

The goal is to stop treating repo-root runtime-style directories like `.cursor/`, `.codex/`, `.opencode/`, and `.claude/` as canonical tracked source.

## Current State

The migration is now structurally complete:

- Cursor source moved to `cursor-template/`
- Codex source moved to `codex-template/`
- OpenCode source moved to `opencode-template/`
- Claude hook config moved to `claude-template/hooks.json`
- local Claude package-manager state stopped being tracked
- repo-root runtime dirs are treated as install outputs or local state, not canonical source

Claude-specific repo surfaces that intentionally remain outside template dirs are documented in the inventory/status notes. The main example is the hook config split:

- `claude-template/hooks.json` is the canonical tracked source
- `hooks/hooks.json` is the synced Claude-facing mirror

For the latest exact state, see [Status](template-source-migration-status.md).
