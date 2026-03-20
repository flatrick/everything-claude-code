## MODIFIED Requirements

### Requirement: Dev Smoke Verification Surface
MDT MUST provide dev-install smoke workflows for maintainer verification beyond the normal install baseline.

#### Scenario: Dev smoke tool-setups exists
- **WHEN** a maintainer verifies a `--dev` installation
- **THEN** MDT provides `mdt dev smoke tool-setups`
- **AND** supports tool-scoped smoke checks for Claude, Cursor, and Codex

#### Scenario: Dev smoke workflows are tool-specific
- **WHEN** a maintainer validates workflow behavior for one supported tool
- **THEN** MDT provides `mdt dev smoke workflows --tool <claude|cursor|codex>`
- **AND** the selected tool's supported smoke entrypoint is runnable from the installed dev home

#### Scenario: Dev smoke remains outside the normal end-user baseline
- **WHEN** MDT documents or installs dev smoke verification surfaces
- **THEN** those surfaces are treated as maintainer-only `--dev` helpers
- **AND** they are not described as part of the normal end-user install baseline
