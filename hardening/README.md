# MDT Workspace Hardening Bundle

This folder contains shared MDT hardening assets that should be available under every tool's installed `mdt/` root.

## Files

- `verify-workspace-permissions.mjs` verifies whether the active identity can read, write, and delete a temporary probe file in the target workspace
- `CODEX-WINDOWS-SANDBOX-ROOT-CHILD-ACL-ISSUE.md` documents the observed Windows sandbox failure mode, how to reproduce it, and how to verify the repair
- `WORKSPACE-PERMISSIONS-PROMPT.md` gives an operator-safe prompt for investigating and remediating workspace ACL problems

## Installed Location

MDT installs this bundle under:

- `~/.claude/mdt/hardening/`
- `~/.cursor/mdt/hardening/`
- `~/.codex/mdt/hardening/`

Future MDT tool targets should install the same bundle under their tool-specific `mdt/hardening/` directory.

## Usage

```bash
node ~/.tool/mdt/hardening/verify-workspace-permissions.mjs --workspace "/path/to/workspace"
```

The verification script performs a temporary write/delete probe inside the target workspace. It verifies effective access; it does not change permissions.

Important boundary for Codex on Windows:

- `verify-workspace-permissions.mjs` proves raw filesystem read/write/delete only
- it does not prove that Codex's internal `apply_patch` sandbox refresh will succeed
- if you are investigating `windows sandbox: setup refresh failed with status exit code: 1`, finish with a real Codex `apply_patch` probe as documented in `CODEX-WINDOWS-SANDBOX-ROOT-CHILD-ACL-ISSUE.md` and `docs/testing/manual-verification/codex.md`

For the Windows root-child ACL repair workflow, run from an elevated PowerShell terminal **outside** any sandbox.
See `CODEX-WINDOWS-SANDBOX-ROOT-CHILD-ACL-ISSUE.md` for the full repair procedure using `icacls`.
