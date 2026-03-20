## ADDED Requirements

### Requirement: AI-Learning Runtime Has One Canonical Shared Home
MDT MUST keep the ai-learning runtime core under the shared `skills/ai-learning/` tree as the single canonical runtime implementation.

#### Scenario: Shared skill tree owns runtime logic
- **WHEN** maintainers add or update reusable ai-learning runtime logic
- **THEN** that logic lives under `skills/ai-learning/`
- **AND** MDT does not keep a second top-level runtime tree as a competing implementation

#### Scenario: Repo and installed layouts share the same runtime home
- **WHEN** ai-learning runs from the repo, a temp copy, or an installed tool home
- **THEN** the runtime entrypoints resolve from the shared skill-owned runtime tree
- **AND** MDT does not depend on a separate repo-only runtime location for supported behavior

### Requirement: Tool-Specific AI-Learning Material Is Additive
MDT MUST limit tool-specific ai-learning material to additive metadata, config, or thin integration shims.

#### Scenario: Overlay files do not duplicate runtime logic
- **WHEN** a tool-specific ai-learning overlay exists
- **THEN** it adds only the tool-specific metadata, config, or integration files needed for that tool
- **AND** it does not duplicate the shared ai-learning runtime implementation

#### Scenario: Hook adapters stay thin
- **WHEN** hook-enabled tools need ai-learning hook integration
- **THEN** hook-facing files act as thin payload adapters into the shared runtime core
- **AND** load-bearing learning logic does not remain trapped inside hook files

### Requirement: Internal AI-Learning Imports Are Stable And Relative
MDT MUST use stable skill-relative internal imports for ai-learning runtime entrypoints.

#### Scenario: Internal imports do not use fallback chains
- **WHEN** ai-learning runtime files import other ai-learning runtime files
- **THEN** they use stable relative imports from the canonical shared runtime tree
- **AND** they do not rely on multi-candidate path loops to discover the correct file

#### Scenario: Temp copy remains runnable
- **WHEN** the shared ai-learning tree is copied into a temp or installed location
- **THEN** its internal runtime imports still resolve correctly
- **AND** the supported runtime does not require repo-root assumptions to load
