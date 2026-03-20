## ADDED Requirements

### Requirement: External Observer Wrapper Is A Generic MDT Runtime Surface
MDT MUST define the external observer wrapper as a tool-agnostic runtime surface rather than as a Codex-owned concept.

#### Scenario: Wrapper contract is generic
- **WHEN** MDT documents or packages the external observer wrapper
- **THEN** it treats the wrapper as a generic MDT runtime concept
- **AND** it does not name the concept as if Codex uniquely owns it

#### Scenario: Generic contract does not imply universal support
- **WHEN** MDT uses a generic name for the external observer wrapper
- **THEN** it still states which tools currently realize that wrapper
- **AND** generic naming does not imply support for tools that have not implemented it

### Requirement: Current Observer Wrapper Realization Remains Tool-Scoped
MDT MUST preserve the distinction between the generic observer-wrapper contract and the tool-specific realization that exists today.

#### Scenario: Codex remains the current realized wrapper consumer
- **WHEN** MDT describes current observer-wrapper support
- **THEN** it states that Codex is the current realized external-wrapper consumer
- **AND** it does not overclaim that Claude or Cursor currently use the same wrapper path

#### Scenario: Shared runtime stays below the wrapper contract
- **WHEN** MDT reasons about the shared observer runtime and the external wrapper
- **THEN** the shared runtime remains the reusable implementation layer
- **AND** the external wrapper remains the tool-facing launch surface above it
