## Why

The dev-smoke tool-setup probes already treat `EPERM` and `EACCES` process-spawn failures as `SKIP` with a rerun hint, but the surrounding docs do not clearly explain that this is an environment limitation rather than a tool failure. That leaves maintainers with incomplete guidance when smoke results are skipped in restricted local sessions.

## What Changes

- Document the restricted-session `SKIP` behavior for smoke tool-setup probes when local process spawn is blocked.
- Clarify that `EPERM`/`EACCES` smoke skips are environment limitations, not evidence that the tool setup itself is broken.
- Update local verification and manual verification guidance so maintainers know when and where to rerun.
- Tighten the verification contract so smoke output remains explicit about rerunning in a shell or session that allows local process spawn.

## Capabilities

### New Capabilities

- `restricted-session-smoke-guidance`: Defines how MDT documents and interprets smoke `SKIP` results caused by restricted local environments.

### Modified Capabilities

- `tool-setup-verification`: Tighten the smoke verification contract around environment-blocked `SKIP` results.
- `workflow-contracts`: Clarify the `mdt-dev-smoke` workflow outcome when local environment restrictions block CLI probes.

## Impact

- Affected smoke-verification docs and manual verification guidance.
- Affected interpretation of existing smoke output for Claude, Cursor, and Codex when local process spawn is blocked.
