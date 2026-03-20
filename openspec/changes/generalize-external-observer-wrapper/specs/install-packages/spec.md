## ADDED Requirements

### Requirement: Observer Add-On Package Naming Matches The Generic Wrapper Contract
MDT MUST keep optional observer add-on package naming aligned with the generic external observer wrapper contract.

#### Scenario: Package metadata does not imply Codex owns the concept
- **WHEN** MDT packages the optional external observer add-on
- **THEN** package metadata and installed runtime naming do not imply that the observer-wrapper concept is inherently Codex-specific
- **AND** current Codex-only realization is expressed through tool support metadata rather than through a misleadingly narrow concept name

#### Scenario: Tool support metadata still scopes current realization
- **WHEN** MDT resolves or documents the optional observer add-on package
- **THEN** tool support metadata still reflects the currently realized supported tools
- **AND** generic package naming does not weaken that installability boundary
