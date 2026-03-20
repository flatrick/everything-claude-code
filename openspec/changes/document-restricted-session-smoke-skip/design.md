## Context

`scripts/mdt-dev-smoke-tool-setups.js` already converts `EPERM` and `EACCES` spawn failures into `SKIP` with the detail `probe blocked by local environment (...)`. Tests already cover that behavior. The missing piece is contract clarity: current docs tell maintainers to record `SKIP` when tools are not installed, but they do not explain restricted-session `SKIP` well enough.

This change is documentation and contract alignment for behavior that already exists in the smoke runner.

## Goals / Non-Goals

**Goals:**
- Make restricted-session `SKIP` behavior explicit in current verification docs.
- Clarify that blocked process spawn is an environment limitation and should trigger rerun guidance.
- Keep smoke result interpretation consistent across tools.

**Non-Goals:**
- Do not change the existing smoke runner's basic `EPERM`/`EACCES` handling unless the docs reveal a real mismatch.
- Do not convert environment-blocked `SKIP` into `FAIL`.
- Do not broaden this into a general permissions-diagnostics feature.

## Decisions

### Keep environment-blocked probe results as `SKIP`
Restricted local sessions should remain non-failing smoke outcomes because the probe result is inconclusive about the tool itself.

Alternative considered: treat `EPERM`/`EACCES` as `FAIL`.
Rejected because the current code and tests already distinguish environment blockage from tool misconfiguration.

### Document rerun guidance in verification material
The current contract should explicitly tell maintainers to rerun from a shell/session that allows local process spawn.

Alternative considered: leave the guidance only in the raw smoke detail string.
Rejected because the detail string alone is too easy to miss or misinterpret.

## Risks / Trade-offs

- More doc detail can make verification pages denser -> Mitigation: keep the wording narrow and tied to the restricted-session case only.
- Maintainers may still overgeneralize SKIP -> Mitigation: explicitly distinguish "tool not installed" from "probe blocked by local environment".

## Migration Plan

1. Update current verification docs to mention restricted-session `SKIP` behavior and rerun guidance.
2. Align workflow/verification specs to match the documented interpretation.
3. Verify the documented wording matches the actual smoke runner detail string and tests.

## Open Questions

- Whether the workflow matrix should call out restricted-session `SKIP` inline or rely on local-verification and manual-verification pages.
