## ADDED Requirements

### Requirement: Runtime Path Selection Distinguishes Explicit Root, VCS Identity, And Cwd Fallback
MDT MUST keep runtime path selection explicit about the difference between explicit project-root signals, VCS-backed identity, and cwd fallback when evaluating future non-git VCS support.

#### Scenario: Discovery respects existing path-selection order
- **WHEN** MDT evaluates how non-git VCS-backed project identity would affect runtime path selection
- **THEN** it preserves the existing shared order between explicit project-root signals, VCS-backed identity, and cwd fallback
- **AND** it does not let new VCS support introduce ambiguous path precedence

#### Scenario: Future VCS support remains scoped to project identity
- **WHEN** MDT considers adding non-git VCS detection
- **THEN** it treats that work as an extension of project-identity selection
- **AND** it does not treat it as a replacement for broader tool or config environment detection
