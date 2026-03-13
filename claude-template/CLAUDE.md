# CLAUDE.md

This file is the Claude Code entrypoint for projects using MDT.

## MDT Install

MDT is installed via the Claude Code plugin (`modeldev-toolkit`) or manually
from the MDT repo. If you installed via plugin, agents, commands, skills, and
rules are already available globally.

For manual install verification, see `docs/tools/claude-code.md` in the MDT repo.

## MDT Guidance

MDT rules, commands, agents, and skills are installed globally via the plugin or
`mdt install`. The shared working rules are loaded from `~/.claude/rules/`,
commands from `~/.claude/commands/`, and agents from `~/.claude/agents/`.

## Verification

When changing code in this repo, use the normal repo verification flow unless
the task explicitly calls for something narrower:

```bash
npm run lint
npm test
```
