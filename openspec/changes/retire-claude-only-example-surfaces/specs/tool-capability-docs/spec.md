## ADDED Requirements

### Requirement: Example Material Does Not Override Current Capability Framing
MDT MUST not let example or reference material act as an informal source of truth that overrides the current docs-pack framing.

#### Scenario: Current docs stay authoritative over examples
- **WHEN** an example or reference file under `examples/` suggests a different cross-tool default than the current docs pack
- **THEN** the docs pack remains authoritative
- **AND** MDT updates or retires the example rather than letting it drift

#### Scenario: References do not route maintainers to stale examples as defaults
- **WHEN** current maintainer-facing docs reference example material
- **THEN** those references only point to examples that match the current contract
- **AND** they do not route contributors to stale Claude-only defaults
