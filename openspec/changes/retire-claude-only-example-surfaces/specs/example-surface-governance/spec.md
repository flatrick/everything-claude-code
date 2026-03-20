## ADDED Requirements

### Requirement: Example Surfaces Do Not Imply A Claude-First Default
MDT MUST keep example and reference surfaces aligned with the tool-agnostic-by-default current contract.

#### Scenario: Generic example is not branded as Claude-only
- **WHEN** an example or reference file is intended to illustrate a generic MDT pattern
- **THEN** it is not named or framed as a Claude-only surface
- **AND** contributors are not left to infer that Claude is the generic MDT baseline

#### Scenario: Tool-specific example states its scope explicitly
- **WHEN** an example remains tool-specific
- **THEN** it states that scope explicitly
- **AND** it does not imply that the same example is the default model for Cursor or Codex

### Requirement: Stale Example Surfaces Are Retired Or Reframed
MDT MUST retire or reframe example/reference surfaces that no longer represent useful current MDT guidance.

#### Scenario: Low-value stale example is retired
- **WHEN** an example no longer reflects a useful current MDT pattern
- **THEN** MDT removes it instead of keeping it as an informal historical default

#### Scenario: Useful example is generalized
- **WHEN** an example still contains useful contributor guidance
- **THEN** MDT may keep it after renaming or reframing it to match the current contract
- **AND** references are updated to the retained form
