## ADDED Requirements

### Requirement: AI-Learning Observer Wrapper Naming Matches The Generic Model
MDT MUST describe the optional external observer wrapper for ai-learning in generic terms while keeping current tool realization explicit.

#### Scenario: Generic observer wrapper does not erase Codex-specific defaults
- **WHEN** ai-learning documents or configures the external observer wrapper
- **THEN** it may use generic wrapper naming
- **AND** it still preserves Codex-specific defaults and current Codex-only realized support where relevant

#### Scenario: Generic wrapper remains optional for hook-free tool modes
- **WHEN** ai-learning runs in a hook-free tool mode
- **THEN** the generic external observer wrapper remains an optional helper layer
- **AND** ai-learning does not treat that wrapper as the baseline learning flow
