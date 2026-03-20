## ADDED Requirements

### Requirement: Installation Docs Distinguish Optional Home Hardening From Install Baseline
MDT MUST distinguish optional tool-home hardening workflows from the normal install baseline.

#### Scenario: Optional hardening is not described as default install behavior
- **WHEN** MDT documents installation and hardening behavior
- **THEN** optional tool-home hardening is described separately from the normal install contract
- **AND** normal installs are not described as if they automatically harden all sensitive tool-home state

#### Scenario: Shared workspace hardening remains separate from home hardening
- **WHEN** MDT documents the shared `mdt/hardening/` bundle
- **THEN** it describes that bundle as workspace-oriented hardening or verification
- **AND** it does not collapse that bundle into the separate concept of tool-home hardening
