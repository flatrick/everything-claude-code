## ADDED Requirements

### Requirement: Dev Installs Can Use A Reserved Self Scope
MDT MUST reserve a `.self` learning scope under the tool-relative homunculus directory for MDT-meta learning during dev installs.

#### Scenario: Dev install enables reserved self scope
- **WHEN** MDT is installed in `--dev` mode for a supported tool
- **THEN** the runtime may use `~/.{tool}/mdt/homunculus/.self/` as a reserved learning scope for MDT-meta work
- **AND** that reserved scope is not treated as part of the normal end-user install baseline

#### Scenario: Self scope uses the standard project layout
- **WHEN** MDT writes learning state into the reserved `.self` scope
- **THEN** it uses the same internal directory structure expected for a normal project-scoped learning directory
- **AND** runtime helpers do not need a separate storage schema for `.self`

### Requirement: Self Scope Applies Only To MDT-Repo Meta Learning
MDT MUST limit the reserved `.self` scope to MDT-repo meta learning rather than general project routing.

#### Scenario: MDT repo on dev install routes to self scope
- **WHEN** the runtime is operating in the MDT repository under a valid dev install and no stronger explicit project-root signal applies
- **THEN** learning state is routed to the reserved `.self` scope
- **AND** MDT does not create or update an ordinary project-scoped entry for that MDT-repo session

#### Scenario: Other repos stay project-scoped
- **WHEN** the runtime is operating outside the MDT repository or the install is not a dev install
- **THEN** learning state continues to use the normal project-scoped or fallback behavior
- **AND** `.self` is not selected
