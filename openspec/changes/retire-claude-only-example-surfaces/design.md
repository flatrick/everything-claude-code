## Context

The repo's current docs and specs now treat MDT as tool-agnostic by default, with per-tool differences called out explicitly. The remaining `examples/*CLAUDE*.md` files predate that tighter framing and risk teaching Claude-specific structure as if it were the generic default.

This change is intentionally narrow. It is about example/reference material, not about changing audited tool capability claims or shipped install surfaces.

## Goals / Non-Goals

**Goals:**
- Remove or rewrite example/reference files that imply Claude is the generic MDT baseline.
- Preserve examples that still help contributors, but only if they are generalized or explicitly scoped.
- Keep references aligned so stale example files stop acting as informal source-of-truth material.

**Non-Goals:**
- Do not remove legitimate Claude-specific current-state docs under `docs/tools/`.
- Do not change actual tool capability claims unless a current-state doc is also wrong.
- Do not broaden this into a full examples-directory redesign.

## Decisions

### Examples must either be generic or explicitly scoped
Example/reference files in `examples/` should either model tool-agnostic MDT guidance or state clearly that they are tool-specific.

Alternative considered: keep Claude-specific names and rely on contributor judgment.
Rejected because the current repo has already been tightening against implicit Claude-first assumptions.

### Retire stale examples instead of keeping low-value placeholders
If an example no longer reflects a useful current MDT pattern, it should be deleted rather than preserved for history.

Alternative considered: keep all old examples with a warning banner.
Rejected because low-value examples still create drift and search noise.

## Risks / Trade-offs

- Removing examples may reduce quick-start material -> Mitigation: preserve any genuinely useful content by generalizing it.
- References may break if examples are deleted -> Mitigation: sweep references in the same change.

## Migration Plan

1. Inventory `examples/*CLAUDE*.md`.
2. Decide per file: retire, rename/generalize, or keep as explicitly tool-specific.
3. Update any references that still point to retired names.

## Open Questions

- Whether any of the existing CLAUDE-named examples should become `AGENTS.md` or generic MDT examples instead.
- Whether the examples directory should eventually adopt a more structured naming convention.
