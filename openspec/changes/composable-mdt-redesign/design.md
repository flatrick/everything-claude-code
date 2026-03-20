## Context

The current MDT install model keeps tool-facing assets at the tool root and MDT-owned runtime code under a nested `mdt/` tree. That works for the current baseline, but it creates path coupling between skill code and shared runtime files and makes "dev layout equals installed layout" harder to guarantee.

The older plan already framed this as a future architectural step, not an immediate bug fix. This design preserves that intent: define the target compose model now, but keep it explicitly downstream of the current dependency/support manifest model and a proven second shared-runtime consumer.

## Goals / Non-Goals

**Goals:**
- Define a compose model for building self-contained skill outputs from shared source code and declared metadata.
- Make dev staging and installed layouts structurally identical for composed skills.
- Keep compose integrated with the package/dependency resolver rather than inventing a parallel install system.

**Non-Goals:**
- Do not implement compose immediately just because ai-learning currently needs cleanup.
- Do not introduce transpilation, bundling, or symlink-based composition.
- Do not replace existing tool-facing surface locations.

## Decisions

### Compose is a resolver-driven assembly step
Compose will be treated as part of package resolution and install assembly, not as a separate ad hoc script convention.

Alternative considered: independent per-skill `compose.json` with a standalone compose engine.
Rejected because it risks diverging from the package/dependency model that already owns installability.

### Composed output must match between staging and installed homes
Dev staging and installed output must use the same composed shape so path problems surface before release.

Alternative considered: keep repo/dev and installed layouts different and rely on tests to bridge the gap.
Rejected because the path drift is the core problem the compose model is meant to remove.

### Composition uses file copies, not symlinks
The model must remain cross-platform and Windows-safe, so composition uses copied files rather than symlink assumptions.

Alternative considered: optional symlinks for local speed.
Rejected because consistency and portability are more important than micro-optimizing a copy step.

## Risks / Trade-offs

- Compose adds build-step complexity to a mostly zero-build repo -> Mitigation: keep the step declarative and integrate it with existing resolver flows.
- Metadata model could drift from dependency sidecars -> Mitigation: require compose declarations to align with package/dependency metadata instead of inventing a second schema.
- Compose may be overbuilt for one consumer -> Mitigation: keep this change future-facing until a second real shared-runtime consumer exists.

## Migration Plan

1. Define the composed-skill packaging requirements and resolver responsibilities in OpenSpec.
2. Wait until the current ai-learning cleanup is complete and a second shared-runtime consumer is real.
3. Implement compose assembly through the existing install/package resolution model.
4. Add parity verification between staging output and installed output before rollout.

## Open Questions

- Where compose declarations should live once the dependency/support model grows to cover them fully.
- Whether the staging output should live under a dedicated repo root or an artifact directory.
- Which future skill is the first real second consumer that justifies implementing compose.
