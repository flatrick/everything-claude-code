## ADDED Requirements

### Requirement: Codex Dev Smoke Helpers Are Present For Supported Entry Points
MDT MUST package the helper files required by supported Codex dev smoke entrypoints into installed dev homes.

#### Scenario: Installed Codex dev home includes required smoke helpers
- **WHEN** MDT performs a Codex `--dev` install
- **THEN** the installed MDT runtime includes the helper files required by the supported Codex smoke entrypoints
- **AND** those entrypoints do not fail only because a declared helper file was omitted from the install

#### Scenario: Codex smoke does not depend on unrelated missing tool helpers
- **WHEN** a maintainer invokes Codex workflow smoke from an installed dev home
- **THEN** the command does not require absent helper files that only belong to a different tool's smoke path
- **AND** helper loading matches the supported tool-scoped smoke contract
