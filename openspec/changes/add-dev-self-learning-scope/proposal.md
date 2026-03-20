## Why

MDT's learning runtime already supports project-scoped state under `.../mdt/homunculus/`, but it does not distinguish "learning about MDT itself" from "learning about a user project". For MDT development installs, that makes repo-internal learning state look like an ordinary project scope even when the maintainer is working on MDT as the product.

## What Changes

- Add a reserved `.self` learning scope under `~/.{tool}/mdt/homunculus/.self/` for MDT-meta learning on `--dev` installs.
- Use `.self` only when the runtime is operating from the MDT repo under a dev install and no explicit project-root override takes precedence.
- Keep `.self` using the same internal directory structure as a normal project scope.
- Preserve existing project-scoped behavior for normal installs and for non-MDT repositories.

## Capabilities

### New Capabilities

- `dev-self-learning-scope`: Defines the reserved `.self` learning scope used for MDT-meta learning during dev installs.

### Modified Capabilities

- `ai-learning`: Tighten learning-scope behavior so dev installs can route MDT-meta learning into a reserved `.self` scope.
- `environment-detection`: Tighten path and scope selection rules for runtime helpers when a dev-install `.self` scope is applicable.
- `mdt-installation`: Extend the `--dev` contract to include the reserved `.self` learning scope behavior for MDT development installs.

## Impact

- Affected learning-scope selection in `detect-project` and related ai-learning runtime helpers.
- Affected `--dev` install behavior and any install marker needed to identify a dev install.
- Affected tests for project detection and homunculus path selection.
