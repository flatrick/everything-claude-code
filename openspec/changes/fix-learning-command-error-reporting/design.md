## Context

The current learning command path can surface a non-zero exit with no message when the underlying subprocess exits unsuccessfully without writing to stdout or stderr. That is especially visible in `mdt learning analyze`, where the user can be left with only an exit code and no explanation.

This is narrower than the broader self-contained ai-learning change. The goal here is not to redesign learning layout, but to establish a minimal CLI contract: supported learning commands must never fail silently.

## Goals / Non-Goals

**Goals:**
- Ensure learning command failures always produce a visible message.
- Keep success output explicit enough that users can tell the command completed.
- Define the boundary between outer CLI fallback messaging and runtime-specific stderr output.

**Non-Goals:**
- Do not redesign the full ai-learning runtime layout.
- Do not require every failure source to emit a bespoke rich error if a CLI-level fallback can safely cover it.
- Do not expand this into a general CLI error-handling overhaul outside learning commands.

## Decisions

### Outer CLI owns the no-output fallback
The outer learning command wrapper will print a fallback error message when a subprocess exits non-zero and both stdout and stderr are empty.

Alternative considered: require every learning subprocess to always write its own stderr.
Rejected because the wrapper is the only place that can guarantee the user-visible contract consistently.

### Runtime-specific errors can still add detail
Learning subprocesses may still emit richer stderr lines when they know the failure cause.

Alternative considered: rely only on the generic fallback.
Rejected because runtime-specific detail is still useful when available.

### Success should remain visibly confirmable
Successful learning commands should produce at least one user-visible line that confirms completion or a no-op result.

Alternative considered: rely on zero exit code alone.
Rejected because silent success is also weak UX for a supported interactive CLI path.

## Risks / Trade-offs

- Generic fallback messages can be less specific than runtime errors -> Mitigation: keep runtime stderr where available and use fallback only for empty-output failures.
- Changes might alter existing tests that asserted raw subprocess passthrough -> Mitigation: update tests to reflect the stronger visible-output contract.

## Migration Plan

1. Update the learning command wrapper to emit a fallback message on empty-output non-zero exits.
2. Review analyze-related subprocesses for obvious opportunities to emit stderr before exit.
3. Add regression tests for timeout and empty-output failure paths.

## Open Questions

- Whether the fallback should include the subcommand name in addition to the exit code.
- Whether all learning subcommands need explicit success output tightened now or only the ones already known to be weak.
