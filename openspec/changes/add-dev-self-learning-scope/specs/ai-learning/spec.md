## ADDED Requirements

### Requirement: AI-Learning Scope Selection Supports MDT Self Scope
MDT MUST allow ai-learning scope selection to route MDT-meta learning into a reserved `.self` scope during dev installs.

#### Scenario: Explicit project root remains stronger than self scope
- **WHEN** ai-learning receives a valid explicit project-root signal
- **THEN** it uses that explicit project root
- **AND** it does not override the explicit root with the reserved `.self` scope

#### Scenario: Self scope wins over repo fallback for MDT repo on dev install
- **WHEN** ai-learning would otherwise resolve the MDT repository as the current project during a valid dev install
- **THEN** it routes that learning state into the reserved `.self` scope
- **AND** it does not register the MDT repository as an ordinary external project scope for that session
