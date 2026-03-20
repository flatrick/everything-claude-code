## Why

The Codex dev smoke flow currently claims a supported workflow path that can fail in installed homes because `mdt.js` eagerly requires smoke helpers that are not packaged into `~/.codex/mdt/scripts/`. That leaves a concrete mismatch between the documented dev-smoke contract and the installed Codex experience.

## What Changes

- Fix Codex workflow smoke packaging so installed dev homes include the helpers needed by the supported smoke entrypoint.
- Ensure the smoke command only requires helpers that are actually present in the installed target or degrades cleanly by tool.
- Add targeted verification so Codex dev smoke packaging regressions are caught before release.
- Update the documented verification boundary if any helper remains intentionally maintainer-only or tool-scoped.

## Capabilities

### New Capabilities

- `codex-dev-smoke-packaging`: Defines the packaging and runtime requirements for Codex workflow smoke in installed dev homes.

### Modified Capabilities

- `tool-setup-verification`: Tighten the dev-smoke contract so supported Codex smoke entrypoints are actually installable and runnable from a dev home.
- `mdt-installation`: Update the dev-install contract for which smoke helpers are materialized under MDT-owned runtime paths.

## Impact

- Affected code in `scripts/mdt.js`, installed smoke helpers, dev install packaging, and smoke-related tests.
- Affected Codex `--dev` installs and maintainer verification workflows.
