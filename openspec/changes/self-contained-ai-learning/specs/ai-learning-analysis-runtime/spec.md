## ADDED Requirements

### Requirement: Analyzer Payload Delivery Is Runtime-Controlled
MDT MUST provide ai-learning analyzer input through runtime-controlled payload delivery rather than interactive model file reads.

#### Scenario: Analyzer receives bounded payload input
- **WHEN** `mdt learning analyze` prepares observations or related input for analysis
- **THEN** MDT delivers that payload through stdin or a bounded temp-file flow
- **AND** the supported analyzer path does not depend on asking the model to read files interactively

#### Scenario: Payload delivery is tool-agnostic
- **WHEN** analysis is invoked from Claude, Cursor, Codex, or a plain shell context
- **THEN** the analyzer input is prepared by the runtime in a tool-agnostic way
- **AND** supported analysis behavior does not depend on a vendor-specific read surface

### Requirement: Analyzer Failure Is User-Visible
MDT MUST emit a user-visible failure message when `mdt learning analyze` exits unsuccessfully.

#### Scenario: Empty failing subprocess still reports an error
- **WHEN** the analyze subprocess exits non-zero without stdout or stderr output
- **THEN** MDT prints a fallback failure message to the user
- **AND** the command does not fail silently

#### Scenario: Timeout failures remain visible
- **WHEN** analysis exceeds the supported runtime timeout guard
- **THEN** MDT emits an explicit timeout-oriented failure message
- **AND** the user is not left with only a non-zero exit code

### Requirement: Analyzer Uses The Shared Runtime Across Tool Modes
MDT MUST route both hook-enabled and hook-free analysis flows through the same shared ai-learning runtime model.

#### Scenario: Hook-enabled tools analyze through the shared runtime
- **WHEN** analysis follows hook-based observation capture for a hook-enabled tool
- **THEN** the analysis path still goes through the shared ai-learning runtime
- **AND** hook files remain adapters rather than separate analyzers

#### Scenario: Hook-free tools analyze through the shared runtime
- **WHEN** analysis runs after explicit capture in Codex or another hook-free context
- **THEN** the analysis path still goes through the shared ai-learning runtime
- **AND** the hook-free mode does not require a second runtime implementation
