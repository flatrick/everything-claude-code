## ADDED Requirements

### Requirement: Verification Does Not Overclaim Optional Home Hardening
MDT MUST not overstate what current verification proves about optional tool-home hardening before a verified cross-tool contract exists.

#### Scenario: Verification can report current optional hardening boundaries
- **WHEN** MDT documents or verifies hardening-related workflows
- **THEN** it can describe the currently available optional hardening workflows for a tool
- **AND** it does not imply that all supported tools already share the same verified home-hardening behavior

#### Scenario: Workspace verification does not imply home-file hardening
- **WHEN** MDT verifies workspace access or shared hardening assets
- **THEN** it does not describe that result as proof that sensitive home files are hardened
- **AND** optional tool-home hardening remains a separate verification concern
