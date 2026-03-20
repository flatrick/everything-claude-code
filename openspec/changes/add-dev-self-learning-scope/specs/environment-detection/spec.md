## ADDED Requirements

### Requirement: Derived Learning Paths Can Select Reserved Self Scope
MDT MUST support selecting a reserved `.self` learning scope when runtime path selection determines that MDT-meta learning is active on a dev install.

#### Scenario: Self scope selection is gated by dev-install state
- **WHEN** runtime helpers consider selecting the reserved `.self` learning scope
- **THEN** they require a valid dev-install signal before using it
- **AND** path selection does not use `.self` for normal installs

#### Scenario: Self scope selection respects existing precedence
- **WHEN** explicit project-root signals, MDT-repo detection, and normal project fallback are all relevant
- **THEN** runtime helpers apply the shared precedence so explicit project-root signals remain strongest
- **AND** the reserved `.self` scope only overrides the ordinary repo-detection path for the MDT repo on a dev install
