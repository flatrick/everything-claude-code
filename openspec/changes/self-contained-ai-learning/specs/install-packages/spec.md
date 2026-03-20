## ADDED Requirements

### Requirement: AI-Learning Package Materializes The Canonical Runtime Tree
MDT MUST package ai-learning from its canonical shared runtime tree rather than from multiple competing runtime sources.

#### Scenario: Install closure selects the shared runtime source
- **WHEN** ai-learning is included in an install closure
- **THEN** the installed runtime content is derived from the canonical shared ai-learning tree
- **AND** package resolution does not rely on a second duplicated runtime source for the same capability

#### Scenario: Tool-specific add-ons remain additive during install
- **WHEN** install resolution includes tool-specific ai-learning material
- **THEN** that material is added on top of the shared ai-learning runtime tree
- **AND** it does not replace the shared runtime as the capability source
