## ADDED Requirements

### Requirement: AI-Learning Can Be Packaged As A Self-Contained Composed Skill
MDT MUST allow ai-learning to participate in a future composed-skill packaging model without reintroducing split runtime ownership.

#### Scenario: Compose preserves the canonical ai-learning runtime model
- **WHEN** ai-learning is eventually materialized through a compose step
- **THEN** the composed output is derived from the canonical shared ai-learning runtime source
- **AND** compose does not reintroduce a second competing ai-learning implementation tree

#### Scenario: Tool-specific ai-learning add-ons remain additive under compose
- **WHEN** a composed ai-learning output includes tool-specific metadata or config
- **THEN** those additions remain additive to the shared ai-learning output
- **AND** they do not replace the shared skill as the capability source
