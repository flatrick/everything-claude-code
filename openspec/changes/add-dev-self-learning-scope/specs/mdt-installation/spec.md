## ADDED Requirements

### Requirement: Dev Install Can Mark Self-Scope Eligibility
MDT MUST provide an install-time signal that tells runtime helpers when the reserved `.self` learning scope is eligible.

#### Scenario: Dev install writes or preserves self-scope eligibility marker
- **WHEN** a supported tool install is performed with `--dev`
- **THEN** MDT materializes or preserves the runtime signal needed to identify that install as self-scope eligible
- **AND** normal installs do not claim that eligibility

#### Scenario: Self-scope eligibility is part of dev install behavior
- **WHEN** MDT documents the effect of `--dev`
- **THEN** it includes the reserved MDT-meta learning-scope behavior as part of the maintainer-only dev surface
- **AND** it does not describe `.self` as part of the normal install baseline
