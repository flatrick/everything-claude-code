## ADDED Requirements

### Requirement: Non-Git VCS Support Requires Explicit Discovery Contract
MDT MUST define a discovery contract before extending project detection beyond git-backed repositories.

#### Scenario: Candidate VCS systems are evaluated explicitly
- **WHEN** MDT considers adding project detection support for a non-git VCS
- **THEN** it evaluates that VCS explicitly for root detection, naming inputs, and local verification feasibility
- **AND** it does not treat a proposed suffix alone as a sufficient implementation contract

#### Scenario: Discovery can reject unsupported VCS systems
- **WHEN** a candidate VCS does not meet MDT's detection or naming requirements
- **THEN** MDT may leave that VCS unsupported
- **AND** it does not need to force parity across all proposed VCS types

### Requirement: Future VCS-Backed Detection Preserves Existing Precedence
MDT MUST preserve the existing project-detection precedence model when considering non-git VCS support.

#### Scenario: Explicit project-root signals remain strongest
- **WHEN** explicit project-root signals and VCS-backed detection are both available
- **THEN** explicit project-root signals remain stronger
- **AND** future non-git VCS support does not override them

#### Scenario: VCS-backed identity remains stronger than cwd fallback
- **WHEN** a future supported non-git VCS root is detected and no stronger explicit override applies
- **THEN** MDT may treat that VCS-backed identity as stronger than cwd-hash fallback
- **AND** cwd fallback remains the last project-identity resort

### Requirement: Future VCS-Backed Project IDs Must Be Deterministic
MDT MUST define deterministic project-id behavior before adding non-git VCS-backed identities.

#### Scenario: Discovery defines naming contract
- **WHEN** MDT evaluates a candidate non-git VCS for project detection
- **THEN** it defines how project ids and project directories would be derived for that VCS
- **AND** the contract remains deterministic and collision-aware
