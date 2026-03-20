## ADDED Requirements

### Requirement: Skills Can Be Materialized As Self-Contained Composed Outputs
MDT MUST support a compose model that materializes self-contained skill outputs from shared source code and declared metadata.

#### Scenario: Composed skill contains its declared shared runtime files
- **WHEN** MDT composes a skill that depends on shared runtime code
- **THEN** the composed output includes the declared shared runtime files inside the skill output tree
- **AND** the composed skill does not depend on repo-root path traversal to load supported runtime code

#### Scenario: Composed output preserves skill-local relative imports
- **WHEN** MDT composes a skill into staging or an installed home
- **THEN** the skill's internal relative imports resolve inside the composed output
- **AND** runtime behavior does not require alternate path-discovery chains for staging versus install

### Requirement: Compose Is Deterministic Across Staging And Install
MDT MUST keep composed staging output and composed installed output structurally aligned.

#### Scenario: Staging and install produce the same shape
- **WHEN** MDT materializes a composed skill in a dev staging area and in an installed tool home
- **THEN** both outputs follow the same structural layout for that skill
- **AND** MDT does not rely on one layout in development and another in production

#### Scenario: Parity can be verified
- **WHEN** maintainers verify a composed skill workflow
- **THEN** MDT provides a deterministic way to compare staging output against installed output
- **AND** parity failures are treated as packaging regressions

### Requirement: Compose Uses Package-Model Metadata
MDT MUST express compose behavior through the package and dependency metadata model rather than a competing ad hoc schema.

#### Scenario: Compose declarations cooperate with resolver metadata
- **WHEN** MDT declares which shared files a composed skill needs
- **THEN** those declarations participate in the package/dependency resolution model
- **AND** compose does not bypass the shared resolver contract

#### Scenario: Compose remains tool-agnostic until a tool-specific need exists
- **WHEN** MDT composes a shared skill for multiple supported tools
- **THEN** the default composed skill layout stays tool-agnostic
- **AND** tool-specific differences are only added where an audited install surface requires them
