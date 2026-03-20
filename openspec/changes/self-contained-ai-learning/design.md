## Context

`ai-learning` currently spans `skills/ai-learning/`, Codex-specific overlay files, and shared runtime code under `scripts/lib/continuous-learning/`. That split makes internal imports fragile, lets Codex-specific files drift into a second implementation tree, and leaves `mdt learning analyze` dependent on tool-specific invocation details that can fail silently.

The existing plan material already converged on the intended direction: one canonical shared skill tree, thin tool-specific adapters, and analyzer transport that does not require interactive file reads from the model. This design turns that plan into an OpenSpec change shape.

## Goals / Non-Goals

**Goals:**
- Make `skills/ai-learning/` the canonical runtime home, not just the canonical documentation or packaging home.
- Keep Codex-specific ai-learning material additive and limited to metadata, config, or integration shims.
- Replace fragile internal multi-candidate import chains with stable skill-relative imports.
- Make `mdt learning analyze` deterministic about timeout handling, payload delivery, and failure reporting.

**Non-Goals:**
- Do not introduce the broader compose model here.
- Do not define a new generic dependency schema outside the existing package and sidecar model.
- Do not create a separate Codex runtime implementation.

## Decisions

### Move the shared runtime core under `skills/ai-learning/`
The runtime core will move under the shared skill tree so repo, temp-copy, and installed-home behavior all anchor to the same capability home.

Alternative considered: keep runtime code under `scripts/lib/continuous-learning/` and tighten path discovery.
Rejected because it preserves a split ownership model and keeps runtime coupling outside the canonical skill tree.

### Keep tool-specific ai-learning differences additive
Codex-specific ai-learning files will be limited to metadata, config, or thin integration add-ons. Runtime logic stays in the shared skill tree.

Alternative considered: keep a full Codex overlay tree for convenience.
Rejected because it creates a second implementation surface and increases drift risk.

### Use bounded payload delivery for analysis
Analyzer input will be provided by stdin or a bounded temp-file path controlled by the runtime, not by asking the model to read files interactively.

Alternative considered: keep the existing prompt-driven Read-tool approach.
Rejected because it can hang in tool-enabled environments and leaves behavior dependent on tool-specific approval flows.

### Make non-zero analyzer exits user-visible
The outer CLI must emit a fallback error message when analysis exits non-zero without stdout or stderr.

Alternative considered: rely on subprocess output only.
Rejected because the current silent-failure mode is not acceptable as a supported user-facing path.

## Risks / Trade-offs

- Runtime move breaks hidden callers -> Mitigation: cross-check all references before removing the old location and add temp-copy/install-path tests.
- Codex overlay still contains unique config -> Mitigation: port unique config into additive shared-skill or overlay metadata before removing duplicate runtime content.
- Analyzer behavior may differ across tools -> Mitigation: verify on at least one hook-enabled tool and one hook-free tool before closing the change.
- Install closure may shift after runtime relocation -> Mitigation: re-run sidecar and closure validation as part of the change.

## Migration Plan

1. Move the ai-learning runtime core into `skills/ai-learning/` and update all internal callers.
2. Remove duplicate Codex runtime content after porting any unique metadata/config.
3. Replace internal path fallback chains with stable relative imports.
4. Update analyze payload transport and fallback error handling.
5. Revalidate install metadata, temp-copy behavior, and installed-home behavior.

## Open Questions

- Whether any Codex-specific metadata should live in the shared skill tree versus a minimal overlay fragment.
- Whether analyzer timeout should become a dedicated CLI option or remain an internal tuned default.
