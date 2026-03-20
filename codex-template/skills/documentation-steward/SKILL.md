---
name: documentation-steward
description: Keep repository documentation current, accurate, well-placed, and easy to follow for both humans and LLMs. Use when auditing doc drift, correcting stale claims, deciding where docs belong, or validating documentation quality before a commit.

---

# Documentation Steward

Use this skill when the task is about keeping repository documentation correct, current, and easy to navigate.

## When to Use

- auditing Markdown drift across root docs, `docs/`, and runtime prompt assets
- deciding where a doc should live before rewriting it
- removing or de-authorizing stale docs that compete with current truth
- checking whether tool, workflow, or verification claims are still accurate

## Goal

Maintain one coherent documentation system that:
- keeps current truth in `docs/`
- keeps root docs thin and easy to scan
- keeps active planning in `docs/plans/`
- keeps ECC comparison in `docs/upstream-rename-map.md`
- keeps tool capability claims aligned with audited evidence when the repo has tool docs

## Core Taxonomy

Every Markdown surface should fit one of these buckets:
- current truth
- fast-find root entrypoint
- active plan
- archived plan
- ECC comparison
- runtime prompt asset
- example/reference

Destination rules:
- `README.md` and root entry shims: fast-find only
- `docs/`: current truth
- `docs/plans/active.md`: current active plan index
- `docs/plans/details/`: live plan files
- `docs/plans/archive/`: finished and rejected plans
- `docs/upstream-rename-map.md`: MDT-to-ECC translation only
- `openspec/changes/`: scoped active deltas
- `docs/plans/`: broader planning and coordination

## Required Workflow

1. Classify the doc surface before editing.
2. Update the authoritative current-state doc first.
3. Propagate that truth outward to root docs and runtime prompt assets.
4. Remove or de-authorize obsolete docs that would compete with the new truth.
5. Stamp environment-specific verification claims with exact tested versions.

## Tool Docs Rule

If the repository keeps audited tool capability pages under `docs/tools/`:

- treat `docs/tools/` as the source of truth for capability/support claims
- verify against local CLI behavior before trusting adapter files
- use repo adapter/config files as evidence, not proof of vendor support

## Never Do This

- never claim support without verification
- never let root docs become a second full manual
- never treat archived or example material as current truth
- never document raw runtime script entrypoints as the public MDT usage path
- never keep stale history docs around just because they once explained the transition
