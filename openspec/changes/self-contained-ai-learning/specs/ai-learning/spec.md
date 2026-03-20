## MODIFIED Requirements

### Requirement: Shared AI-Learning Skill Is The Canonical Capability Home
MDT MUST keep the shared `skills/ai-learning/` tree as the canonical home of the ai-learning capability and runtime.

#### Scenario: Shared skill remains the primary source
- **WHEN** maintainers update ai-learning behavior, guidance, scripts, hooks, metadata, or reusable runtime logic
- **THEN** the primary capability definition lives under `skills/ai-learning/`
- **AND** ai-learning is not split into multiple competing top-level capability homes

#### Scenario: Shared skill owns reusable runtime behavior
- **WHEN** ai-learning needs reusable runtime code that is part of the supported capability
- **THEN** that runtime code lives under the shared `skills/ai-learning/` tree
- **AND** repo-only runtime directories are not treated as the canonical supported implementation

#### Scenario: Package manifest selects the capability rather than redefining it
- **WHEN** `packages/ai-learning/package.json` includes ai-learning
- **THEN** it selects and composes the shared ai-learning capability for installation
- **AND** it does not act as a second canonical definition of ai-learning behavior

### Requirement: Codex AI-Learning Overlay Is Additive
MDT MUST treat Codex-specific ai-learning files as a Codex-specific overlay rather than as a separate ai-learning implementation.

#### Scenario: Codex overlay adjusts Codex-specific shape only
- **WHEN** Codex needs ai-learning-specific metadata, config, or integration add-ons
- **THEN** those differences are expressed as additive Codex-specific material
- **AND** the overlay remains additive to the shared ai-learning capability rather than a competing source model

#### Scenario: Codex overlay does not duplicate runtime logic
- **WHEN** Codex-specific ai-learning files differ from the shared skill
- **THEN** those differences do not create a duplicate Codex runtime tree
- **AND** reusable ai-learning runtime logic remains shared

#### Scenario: Codex overlay does not reintroduce unsupported capture semantics
- **WHEN** Codex-specific ai-learning files differ from the shared skill
- **THEN** those differences preserve the manual-first Codex model
- **AND** they do not reintroduce hook-style automatic capture as if Codex supported it
