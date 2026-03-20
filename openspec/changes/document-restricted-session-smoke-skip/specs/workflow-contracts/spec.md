## ADDED Requirements

### Requirement: Dev-Smoke Workflow Distinguishes Inconclusive Environment Skips
MDT MUST allow the `mdt-dev-smoke` workflow to report `SKIP` when local environment restrictions make CLI probes inconclusive.

#### Scenario: Restricted environment produces non-failing SKIP
- **WHEN** the `mdt-dev-smoke` workflow cannot complete a CLI probe because local process spawn is blocked
- **THEN** the workflow can report `SKIP` for that probe or tool result
- **AND** the reported detail explains that the probe should be rerun in a session that allows local process spawn

#### Scenario: Required files and blocked probes can coexist
- **WHEN** required workflow files are present but the local environment blocks the smoke CLI probe
- **THEN** MDT may keep the workflow result non-failing and marked as `SKIP`
- **AND** it does not collapse that state into either `PASS` or a missing-files `FAIL`
