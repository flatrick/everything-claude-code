## ADDED Requirements

### Requirement: AI-Learning Command Failures Stay User-Visible
MDT MUST keep ai-learning command failures user-visible at the supported CLI surface.

#### Scenario: Analyze failure remains visible even without runtime stderr
- **WHEN** `mdt learning analyze` fails and the underlying runtime emits no stdout or stderr
- **THEN** the outer CLI still presents a user-visible failure message
- **AND** the command does not leave the terminal empty on failure

#### Scenario: Runtime-specific error output is preserved when present
- **WHEN** the underlying ai-learning runtime emits stdout or stderr for a failure
- **THEN** MDT preserves that output as part of the user-visible failure path
- **AND** the generic fallback is only needed for otherwise silent failures
