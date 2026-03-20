## ADDED Requirements

### Requirement: External Observer Wrapper Surface Is Generic Even When Realization Is Narrow
MDT MUST allow a surface family to be conceptually generic while its current realized support remains tool-specific.

#### Scenario: Generic surface concept and narrow realization coexist
- **WHEN** MDT has a reusable surface concept with only one current tool realization
- **THEN** it may name the surface generically
- **AND** it still documents the current tool-specific realization explicitly

#### Scenario: Tool-surface docs do not confuse concept with support breadth
- **WHEN** MDT documents the external observer wrapper surface
- **THEN** it separates the generic surface concept from the currently realized support breadth
- **AND** contributors are not left to infer fake parity from the generic name alone
