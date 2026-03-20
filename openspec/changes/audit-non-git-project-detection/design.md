## Context

The current private project-detection runtime identifies projects like this:

1. explicit project-root override
2. git-backed repository detection and remote naming
3. cwd-based fallback with a hashed project id

That contract is already reflected in current specs and tests. The backlog idea of adding Mercurial, SVN, Fossil, or Jujutsu support is really about whether step 2 should expand from "git-backed identity" to "VCS-backed identity" while preserving the existing precedence model.

## Goals / Non-Goals

**Goals:**
- Decide which non-git VCS systems are realistic for a first batch.
- Define how each candidate VCS would be detected and named.
- Preserve the current precedence contract around explicit project-root overrides and cwd fallback.
- Produce a follow-up implementation-ready contract if the audit supports it.

**Non-Goals:**
- Do not implement non-git VCS detection yet.
- Do not weaken the current explicit project-root override behavior.
- Do not broaden this into generic "any folder metadata" detection.

## Decisions

### Discovery comes before VCS expansion
MDT will not add non-git VCS support until the root markers, naming rules, and precedence behavior are explicit.

Alternative considered: add the suffixes listed in backlog directly.
Rejected because suffix names alone do not define detection correctness or collision behavior.

### Existing precedence stays the baseline
Any future VCS-backed detection must fit under explicit project-root overrides and above cwd-hash fallback.

Alternative considered: let non-git VCS detection compete ad hoc with the existing signals.
Rejected because the current precedence contract is one of the few stable parts of the existing model.

### Project naming must be deterministic across VCS types
If non-git VCS support is added, project ids and project directories must still be deterministic and collision-resistant.

Alternative considered: reuse only repo basename plus suffix.
Rejected because basename-only naming is too weak without a more explicit contract.

## Risks / Trade-offs

- Supporting multiple VCS systems could complicate detection code quickly -> Mitigation: keep the first batch narrow and explicit.
- Some VCS tools may not be installed locally, making CLI-based detection unreliable -> Mitigation: prefer filesystem markers where possible and define fallback rules explicitly.
- Naming contracts can drift between VCS types -> Mitigation: define the project-id contract before implementation.

## Migration Plan

1. Evaluate candidate VCS systems for detectable local markers and stable naming inputs.
2. Define the precedence and naming contract for any approved first-batch VCS systems.
3. Create a follow-up implementation change only after the detection and naming rules are explicit.

## Open Questions

- Which of Mercurial, SVN, Fossil, and Jujutsu are actually worth first-batch support.
- Whether VCS-backed project ids should use remote-derived naming where available for non-git systems.
- Whether some VCS systems should remain "verify only" rather than being implemented in the first batch.
