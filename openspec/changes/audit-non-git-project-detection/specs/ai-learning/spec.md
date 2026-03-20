## ADDED Requirements

### Requirement: AI-Learning Project Detection Can Grow Beyond Git Only By Explicit Contract
MDT MUST only expand ai-learning project detection beyond git-backed identity through an explicit VCS-specific contract.

#### Scenario: Git remains the only implemented VCS until expanded explicitly
- **WHEN** MDT has not yet approved a non-git VCS detection contract
- **THEN** ai-learning keeps git-backed identity as the only implemented VCS-backed project identity
- **AND** non-git repositories continue to fall back through the existing non-VCS behavior

#### Scenario: Future non-git VCS support preserves current fallback model
- **WHEN** MDT later adds support for a non-git VCS
- **THEN** that support fits within the existing explicit-root, VCS-backed, then cwd-fallback model
- **AND** it does not redefine the broader ai-learning scope-selection contract
