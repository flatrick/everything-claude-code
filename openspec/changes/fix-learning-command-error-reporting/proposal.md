## Why

`mdt learning analyze` can fail with a non-zero exit and no visible explanation when the subprocess times out or exits without output. That is a user-facing failure in the supported CLI surface and leaves maintainers without a reliable contract for learning-command error reporting.

## What Changes

- Make learning commands emit a user-visible failure message when a subprocess exits non-zero without stdout or stderr.
- Keep successful learning commands visibly chatty enough to confirm outcome instead of relying only on exit code.
- Clarify the error-reporting boundary between the outer `mdt.js` CLI and the underlying learning runtime.
- Add regression coverage for empty-output failure paths in learning command execution.

## Capabilities

### New Capabilities

- `learning-command-error-reporting`: Defines visible error-reporting behavior for learning commands that invoke subprocesses.

### Modified Capabilities

- `ai-learning`: Tighten the supported ai-learning runtime contract so analysis and related learning commands do not fail silently.

## Impact

- Affected code in `scripts/mdt.js` and the learning/analyze runtime path.
- Affected user-visible CLI behavior for learning command failures.
- Affected tests for subprocess timeout and empty-output failure handling.
