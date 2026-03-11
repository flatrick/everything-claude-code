## Cursor / Cursor Agent Guidance

This repository is **ModelDev Toolkit (MDT)**, designed to be consumed by Cursor and Cursor Agent as a **scaffolding source**, not as an already-installed project.

### How Cursor should treat this repo

- **Primary guidance**: read root `AGENTS.md` for cross-tool rules and workflows.
- **Cursor-specific details**: see `docs/tools/cursor.md` (source of truth for Cursor capability claims and integration points).
- **Install layout**: treat `cursor-template/` as the **install source** for rules, skills, commands, and the optional hook adapter.
- **Install target**: `~/.cursor/` is the normal MDT install target. MDT-owned runtime/state lives under `~/.cursor/mdt/`.
- **Local exception**: if a workflow needs a repo-local Cursor surface, use the explicit bridge command instead of a full project install.

### Expected install workflow

- Use `node scripts/install-mdt.js --target cursor <package...>` to materialize:
  - global rules into `~/.cursor/rules/*.mdc`
  - skills into `~/.cursor/skills/`
  - custom commands into `~/.cursor/commands/`
  - optional experimental hooks into `~/.cursor/hooks*`
  - MDT-owned helpers/state into `~/.cursor/mdt/`
- Use `node scripts/materialize-mdt-local.js --target cursor --surface rules` only when a repo-local `.cursor/rules/` bridge is explicitly needed.
- Cursor tools should assume:
  - this repo is safe to clone and install from,
  - repo-local `.cursor/` contents are exception surfaces, not the primary install target,
  - workflows must still function even if the experimental hook adapter is ignored (rules, skills, `AGENTS.md`, memories, and background agents remain primary).
