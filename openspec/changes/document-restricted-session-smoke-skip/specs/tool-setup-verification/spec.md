## ADDED Requirements

### Requirement: Smoke SKIP Results Stay Explicit About Rerun Conditions
MDT MUST keep environment-blocked smoke `SKIP` results explicit about rerun conditions.

#### Scenario: Verification guidance explains restricted-session rerun
- **WHEN** maintainers use the local verification playbook or a manual verification page after an environment-blocked smoke `SKIP`
- **THEN** MDT explains that the next step is to rerun from a shell or session that allows local process spawn
- **AND** the `SKIP` result is not misrepresented as successful verification

#### Scenario: Environment-blocked SKIP does not invalidate documented setup files
- **WHEN** environment restrictions block the smoke probe but required workflow files are present
- **THEN** MDT treats the result as an inconclusive runtime probe
- **AND** it does not describe the documented setup surface itself as failed solely because of the blocked session
