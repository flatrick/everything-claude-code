## ADDED Requirements

### Requirement: Learning Commands Never Fail Silently
MDT MUST emit a user-visible failure message when a supported learning command exits unsuccessfully without subprocess output.

#### Scenario: Non-zero exit with no output gets a fallback message
- **WHEN** a supported learning command invokes a subprocess that exits non-zero and produces no stdout or stderr
- **THEN** MDT prints a fallback failure message for the user
- **AND** the command does not fail silently

#### Scenario: Fallback message preserves failure status
- **WHEN** MDT emits the fallback failure message
- **THEN** the command still exits unsuccessfully
- **AND** the user-visible output includes enough information to recognize the failure as command-level rather than normal command silence

### Requirement: Learning Command Success Is User-Visible
MDT MUST keep successful supported learning command outcomes visibly confirmable.

#### Scenario: Successful analyze reports completion
- **WHEN** `mdt learning analyze` succeeds
- **THEN** it prints at least one line confirming completion or no available observations
- **AND** users are not expected to infer success from exit code alone
