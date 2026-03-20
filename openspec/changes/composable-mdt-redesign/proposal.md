## Why

MDT still relies on a hybrid install layout where tool-facing assets and MDT runtime code cross-reference each other through path heuristics. That is workable for the current baseline, but it makes self-contained skill packaging, install parity, and future shared-runtime reuse harder than they need to be.

## What Changes

- Introduce a compose model that assembles self-contained skill outputs from shared source code and declared dependency metadata.
- Require dev staging and installed output to use the same composed layout rather than separate path-resolution strategies.
- Define how shared runtime files are declared, copied, and verified as part of package resolution instead of ad hoc fallback logic.
- Add parity checks so composed staging output and installed skill output can be compared structurally.
- Keep this as a forward architectural change that builds on the dependency/support manifest model instead of replacing it with a separate metadata system.

## Capabilities

### New Capabilities

- `composed-skill-packaging`: Defines how MDT composes self-contained skill packages from shared source code and package metadata.

### Modified Capabilities

- `ai-learning`: Update ai-learning expectations so a composed self-contained skill layout becomes a supported future packaging model.
- `install-packages`: Extend package-resolution behavior to cover composed outputs, shared-library materialization, and dev/install parity checks.

## Impact

- Affected package metadata, installer/resolver behavior, dev staging flow, and future skill layout conventions.
- Affected shared-library consumers beyond ai-learning once a second composed consumer exists.
- Affected verification and parity testing between repo staging and installed homes.
