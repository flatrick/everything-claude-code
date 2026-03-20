## Why

MDT's ai-learning project detection currently has a clear scope-selection model: explicit project-root override first, then git-backed project identity, then cwd-hash fallback. Non-git VCS support is a reasonable extension of that model, but the backlog note is too underspecified to implement safely because it does not define the first-batch VCS scope, detection markers, precedence rules, or project-id naming contract.

## What Changes

- Audit non-git VCS systems that could extend MDT's existing project-detection model.
- Define which VCS, if any, should be supported in the first batch.
- Define the per-VCS root markers or detection strategy and how they fit into the existing precedence order.
- Define the project-id and directory naming contract for non-git VCS-backed projects.
- Do not implement non-git VCS detection yet; this change is discovery and contract-shaping only.

## Capabilities

### New Capabilities

- `non-git-project-detection-discovery`: Defines the discovery contract for extending ai-learning project detection beyond git-backed repositories.

### Modified Capabilities

- `ai-learning`: Clarify that project detection may eventually support additional VCS-backed identity beyond git, subject to an explicit contract.
- `environment-detection`: Clarify how future VCS-backed project detection fits beneath explicit project-root overrides and above cwd fallback.

## Impact

- Affected ai-learning project detection, project-id naming, and homunculus directory selection.
- Affected future tests for repository identity and fallback behavior across non-git VCS systems.
