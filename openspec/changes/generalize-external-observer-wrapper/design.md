## Context

The repo already separates concerns in practice:

- shared observer runtime in `scripts/lib/continuous-learning/observer-runtime.js`
- Codex-facing outer wrapper in `scripts/codex-observer.js`

That means the generic part already exists, but the outer contract is still named and packaged as if Codex owns the observer-wrapper concept. The intended change is not to claim new tool support, but to make the abstraction honest: generic wrapper contract, Codex-only current realization.

## Goals / Non-Goals

**Goals:**
- Rename and document the external observer wrapper as a generic MDT concept.
- Preserve current realized support as Codex-only until other tools actually adopt it.
- Keep package, test, and compatibility language aligned with the generalized contract.

**Non-Goals:**
- Do not claim observer-wrapper support for new tools before implementation exists.
- Do not redesign the shared observer runtime itself unless the rename/generalization reveals a real gap.
- Do not collapse tool-specific observer defaults into a fake cross-tool parity story.

## Decisions

### Generalize the wrapper contract, not the support claims
The wrapper concept becomes generic, while realized support remains explicitly Codex-only today.

Alternative considered: keep the Codex-specific name until a second tool exists.
Rejected because the shared runtime and intended abstraction are already broader than the current name.

### Keep Codex as the first concrete realization
Docs, tests, and install metadata should continue to say that Codex is the current realization of the generic wrapper.

Alternative considered: rename everything and imply generic multi-tool support immediately.
Rejected because that would overclaim current behavior.

### Rename the optional package consistently
If the wrapper contract becomes generic, the optional package and script naming should align so users and maintainers do not have to reason through a misleading Codex-only label.

Alternative considered: rename only the script file.
Rejected because package/test/doc language would still preserve the same conceptual mismatch.

## Risks / Trade-offs

- The rename touches package metadata, docs, and tests broadly -> Mitigation: keep the behavioral scope narrow and update all references in one change.
- Generic naming may tempt later overclaiming -> Mitigation: keep current capability docs explicit that Codex is still the only realized support today.

## Migration Plan

1. Define the generic wrapper contract in specs.
2. Rename the wrapper script and optional package surfaces to generic names.
3. Update tests, compatibility docs, and install metadata.
4. Reconfirm docs still describe Codex as the only current realization.

## Open Questions

- What the best generic wrapper name is, e.g. `external-observer.js` versus `agent-observer.js`.
- Whether the optional package should keep continuity with the existing package name or be renamed fully.
