## ADDED Requirements

### Requirement: Tool-Home Hardening Requires Per-Tool Sensitive-File Audit
MDT MUST audit and classify sensitive tool-home files before defining a cross-tool home-hardening implementation contract.

#### Scenario: Discovery classifies candidate sensitive files
- **WHEN** MDT evaluates home hardening for a supported tool
- **THEN** it identifies the candidate sensitive base-state files in that tool's home directory
- **AND** it classifies each file as "harden directly", "verify only", or "leave untouched"

#### Scenario: Discovery does not generalize from one tool alone
- **WHEN** MDT already has a verified home-hardening script for one tool
- **THEN** it does not treat that script as sufficient evidence for other tools
- **AND** each additional tool still requires its own sensitive-file audit

### Requirement: Workspace Hardening And Home Hardening Stay Distinct
MDT MUST keep workspace hardening and tool-home hardening as separate concepts in discovery and future implementation.

#### Scenario: Workspace bundle does not stand in for home hardening
- **WHEN** MDT documents or audits hardening behavior
- **THEN** shared workspace hardening under `mdt/hardening/` is treated as a workspace-access workflow
- **AND** it is not described as proof that sensitive tool-home files are already hardened

#### Scenario: Home hardening is scoped to tool-home state
- **WHEN** MDT defines future tool-home hardening
- **THEN** it scopes that workflow to sensitive base-state files under the tool's home directory
- **AND** it does not broaden into unrelated workflow-file mutation by default

### Requirement: Tool-Home Hardening Is Optional Until Explicitly Standardized
MDT MUST treat cross-tool tool-home hardening as optional until a verified implementation contract exists.

#### Scenario: Discovery does not silently expand install behavior
- **WHEN** MDT is still in the discovery phase for tool-home hardening
- **THEN** normal installs do not silently mutate sensitive tool-home files for new tools
- **AND** any existing hardening workflow remains an explicit operator action
