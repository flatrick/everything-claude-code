## ADDED Requirements

### Requirement: Dev Install Materializes Supported Smoke Runtime Files
MDT MUST materialize the runtime files required by supported dev-smoke entrypoints during `--dev` installs.

#### Scenario: Dev install includes declared smoke runtime
- **WHEN** a user performs a supported `--dev` install for a tool
- **THEN** MDT installs the runtime files required by the documented dev-smoke entrypoints for that tool
- **AND** the dev install does not advertise a smoke path that is missing its required runtime files

#### Scenario: Tool-scoped smoke runtime remains scoped
- **WHEN** MDT packages smoke helpers for a tool-specific dev-smoke flow
- **THEN** it can limit that runtime to the tool-scoped `--dev` surface
- **AND** it does not need to broaden the normal install baseline to support the smoke path
