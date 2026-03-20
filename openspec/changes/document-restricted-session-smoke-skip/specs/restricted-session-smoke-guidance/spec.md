## ADDED Requirements

### Requirement: Restricted-Session Smoke Skips Are Documented As Environment Limits
MDT MUST document smoke `SKIP` results caused by blocked local process spawn as environment limitations rather than tool failures.

#### Scenario: Environment-blocked spawn maps to documented SKIP guidance
- **WHEN** a smoke tool-setup probe is blocked by local process-spawn restrictions such as `EPERM` or `EACCES`
- **THEN** MDT documents that result as a `SKIP` caused by the local environment
- **AND** maintainers are told to rerun from a shell or session that allows local process spawn

#### Scenario: Restricted-session SKIP is distinct from missing-install SKIP
- **WHEN** MDT explains smoke `SKIP` outcomes
- **THEN** it distinguishes between "tool not installed" and "probe blocked by local environment"
- **AND** it does not present both cases as the same remediation path
