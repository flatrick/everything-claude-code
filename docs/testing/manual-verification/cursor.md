# Cursor Manual Verification

Last verified:
- `2026-03-12`

Tested with version:
- `Cursor Agent CLI 2026.03.11-6dfa30c`
- `Cursor IDE` must be stamped manually by the human operator who runs the IDE check

Manual boundary:
- Cursor IDE tests must be run by a human operator.
- Do not treat this page as proof of a CLI-driven Cursor IDE prompt flow.

Use this page to confirm MDT behavior inside Cursor desktop after installing into a fresh global `~/.cursor/` directory and, when needed, materializing the repo-local `.cursor/rules/` bridge that Cursor IDE reads.

## Preconditions

1. Install MDT into Cursor with `mdt install --tool cursor typescript continuous-learning`.
2. If the opened repository needs repo-local Cursor IDE rules, run `mdt bridge materialize --tool cursor --surface rules`.
3. Confirm the install exists under `~/.cursor/`.

## CLI Checks

Run:

```bash
agent --version
agent --help
cursor-agent --version
cursor-agent --help
mdt smoke tool-setups --tool cursor
mdt smoke workflows --tool cursor
```

Installed-home equivalents:

```bash
node ~/.cursor/mdt/scripts/mdt.js smoke tool-setups --tool cursor
node ~/.cursor/mdt/scripts/mdt.js smoke workflows --tool cursor
```

## Human-Operated IDE Checks

- verify that repo-local `.cursor/rules/` are read when the bridge is materialized
- verify that installed commands and skills are visible in Cursor
- verify that the exact Cursor IDE version used for the check is recorded at the top of this page
- verify that any hook-dependent behavior is treated as experimental, not vendor-native
