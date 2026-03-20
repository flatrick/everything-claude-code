## ADDED Requirements

### Requirement: Resolver Can Materialize Composed Skill Outputs
MDT MUST let the shared install resolver materialize composed skill outputs when a package declares shared runtime dependencies that must be assembled into the skill tree.

#### Scenario: Resolver assembles composed output
- **WHEN** a package-selected skill requires composed shared runtime content
- **THEN** the shared resolver assembles that content into the skill output
- **AND** there is no separate install path that bypasses resolver-controlled composition

#### Scenario: Resolver reports compose-related closure results
- **WHEN** resolve or install includes composed skill assembly
- **THEN** the resolver output describes the resulting skill closure and any composition warnings or failures
- **AND** maintainers can verify compose behavior through the existing install verification model
