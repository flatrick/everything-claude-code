## Context

The ai-learning runtime already stores project-scoped state under the tool-relative homunculus directory and already has a clear scope-selection order: explicit project-root overrides, git-backed project detection, then cwd fallback. MDT development work introduces a special case: when the maintainer is working inside the MDT repo on a `--dev` install, the "project" is really MDT itself and should not necessarily be treated like an ordinary external project scope.

The `.self` idea is a narrow extension of the existing scope model, not a new learning subsystem.

## Goals / Non-Goals

**Goals:**
- Reserve `~/.{tool}/mdt/homunculus/.self/` for MDT-meta learning on `--dev` installs.
- Keep explicit project-root overrides stronger than `.self`.
- Keep `.self` using the same internal structure as a normal project-scoped learning directory.
- Avoid changing normal-install or non-MDT-repo behavior.

**Non-Goals:**
- Do not add a second global learning store outside homunculus.
- Do not expose a new user-facing top-level command unless runtime behavior proves it necessary.
- Do not change external user-project detection beyond the `.self` special case.

## Decisions

### `.self` is dev-install only
The reserved `.self` scope applies only when MDT is installed with `--dev`.

Alternative considered: always create `.self`.
Rejected because `.self` is specifically about MDT maintainers working on MDT, not normal end-user installs.

### Explicit project-root overrides still win
If `CLAUDE_PROJECT_DIR` or `MDT_PROJECT_ROOT` is set to a valid directory, that explicit root remains stronger than `.self`.

Alternative considered: force `.self` whenever the cwd is the MDT repo.
Rejected because explicit overrides are already the strongest scope-selection signal.

### `.self` only applies to the MDT repo
The reserved scope applies only when the runtime can determine that the cwd/effective repo is the MDT repository itself under a dev install.

Alternative considered: allow arbitrary repos to opt into `.self`.
Rejected because that would make `.self` a generic feature instead of a narrowly scoped MDT-meta facility.

### `.self` reuses the project-scope directory shape
The `.self` directory uses the same subdirectory structure as a normal project scope so the runtime can reuse existing file conventions.

Alternative considered: invent a new special-case file layout.
Rejected because the value is scope selection, not a new storage schema.

## Risks / Trade-offs

- Special-casing the MDT repo could make detection logic harder to reason about -> Mitigation: keep the activation rule explicit and test it directly.
- Install marker drift could cause `.self` to apply unexpectedly or not at all -> Mitigation: define one authoritative dev-install marker contract.
- Some maintainers may still want ordinary project-scoped behavior in the MDT repo -> Mitigation: explicit project-root overrides remain stronger than `.self`.

## Migration Plan

1. Define the dev-install marker used to tell runtime helpers that `.self` is allowed.
2. Update learning-scope selection to choose `.self` when in the MDT repo on a dev install and no explicit project-root override applies.
3. Reuse the normal project-scope directory shape under `.self/`.
4. Add tests for activation, precedence, and non-dev fallback behavior.

## Open Questions

- Which exact install artifact should be the authoritative dev-install marker.
- Whether status/reporting commands should display `.self` explicitly or keep it as an internal routing detail for now.
