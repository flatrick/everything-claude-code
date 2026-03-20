## 1. CLI Failure Reporting

- [ ] 1.1 Update the learning command wrapper in `scripts/mdt.js` to emit a fallback message for non-zero subprocess exits with empty stdout and stderr.
- [ ] 1.2 Ensure the fallback message still preserves the command's failure exit status.

## 2. Runtime Review

- [ ] 2.1 Review analyze-related learning subprocesses for obvious cases where they should emit a brief stderr line before exiting non-zero.
- [ ] 2.2 Confirm successful analyze paths print a visible completion or no-op line.

## 3. Regression Coverage

- [ ] 3.1 Add or update tests for empty-output learning-command failures.
- [ ] 3.2 Add or update tests for timeout-related learning-command failure visibility.
