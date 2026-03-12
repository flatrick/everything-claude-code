# Local Verification Playbook

Use this when you need to refresh or challenge any claim in the MDT tool docs.

Version-stamp rule:
- every environment-specific claim in current-state docs must include `Last verified` and `Tested with version`
- if a surface cannot be checked in the current audit, mark it `not-locally-verified` instead of preserving an older value

## Verification Order

1. Read the relevant page in `docs/tools/`.
2. Check whether the tool is installed locally.
3. Run local CLI probes first.
4. Run the local setup verification scripts.
5. Inspect MDT's repo adapter/config files.
6. Only then open vendor docs if the local version changed, the page is stale, local behavior conflicts with current docs, or a claim is still `experimental` or `repo-adapter`.

## Local Commands

### Workflow Contract

```bash
mdt verify tool-setups
mdt smoke tool-setups
mdt smoke workflows --tool claude
mdt smoke workflows --tool cursor
mdt smoke workflows --tool codex
```

### Claude Code

```bash
claude --version
claude --help
claude agents --help
claude mcp --help
```

### Cursor

```bash
agent --version
agent --help
cursor-agent --version
cursor-agent --help
```

Cursor IDE is a manual verification surface. Use the desktop app only for human-operated runtime checks inside Cursor itself.

### Codex

```bash
codex --version
codex --help
codex exec --help
codex features list
```

## Required Page Footer Data

Every current-state page in `docs/tools/` should keep:
- audit date
- tested version or `not-locally-verified`
- status labels used on the page
- source links

## Current Machine Baseline

- Claude Code installed: yes
- Cursor Agent installed: yes
- Cursor IDE CLI launcher on PATH: no
- Codex installed: yes
