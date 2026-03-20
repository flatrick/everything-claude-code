# Rules Across Tools

Use this page when you need to compare how MDT should author persistent policy and project guidance (rules) across Claude Code, Cursor, and Codex.

For audited support labels and version notes, prefer [../capability-matrix.md](../capability-matrix.md) and the per-tool pages below. If this comparison disagrees with a tool page, fix the tool page first, then align here.

## Support Summary


| Tool   | Status                          | What MDT should author                                                                                                                                       |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude | `official`                      | Shared markdown rules in `rules/` plus Claude-facing guidance such as `CLAUDE.md` and settings where the install maps them                                   |
| Cursor | `official` (project rules only) | Shared `rules/` with Cursor-shaped installs into the **opened project's** `.cursor/rules/` via `cursor-template/rules/` when filenames or frontmatter differ |
| Codex  | `official`                      | Shared `rules/` plus flat Codex rule add-ons under `codex-template/rules/`; layered `AGENTS.md` for project-wide instruction                                 |


## Source Files


| Tool   | Primary repo sources                                   | Notes                                                                                                                                                        |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude | `rules/`, Claude template/install mappings             | Treat `rules/` as shared policy first; see [../claude-code.md](../claude-code.md) for how Claude consumes project guidance                                   |
| Cursor | `rules/`, `cursor-template/rules/`                     | Cursor IDE and cursor-agent read **project** `.cursor/rules/` only; `~/.cursor/rules/` is not consumed (verified 2026-03-14 on [../cursor.md](../cursor.md)) |
| Codex  | `rules/`, `codex-template/rules/`, layered `AGENTS.md` | Codex `.rules` files live under Codex config layers; do not assume they share Claude's on-disk layout                                                        |


## Creation Model

### Claude

- Create or update shared policy under `rules/common/` and `rules/<language>/` first.
- Keep Claude-specific packaging or settings alignment documented on [../claude-code.md](../claude-code.md) when install paths differ from other tools.

### Cursor

- Keep canonical policy in `rules/`; add or adjust `cursor-template/rules/` when Cursor needs a different filename, extension, or frontmatter shape.
- Plan for rules to exist in the **currently opened** project: MDT should provide a flow that materializes `.cursor/rules/` in that project (see [../cursor.md](../cursor.md)).
- Do not document `~/.cursor/rules/` as a rule-consumption surface for Cursor.

### Codex

- Keep shared source in `rules/`; add `codex-template/rules/` when the installed Codex surface needs a Codex-specific flat rule copy.
- Treat layered `AGENTS.md` as first-class project guidance alongside Codex rules; see [../codex.md](../codex.md).

## Key Differences


| Question                                                         | Claude                                                               | Cursor                                                          | Codex                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Where do installed rules apply?                                  | Per Claude settings / project guidance model                         | **Only** the opened project's `.cursor/rules/`                  | Codex rule layers plus `AGENTS.md`                                                        |
| Is a global user rules directory a substitute for project rules? | Claude has file-based user rules under `~/.claude/rules/` per matrix | **No** — `~/.cursor/rules/` is ignored for IDE and cursor-agent | Follow Codex layer docs, not Claude paths                                                 |
| Same markdown file on disk for every tool?                       | Often shared from `rules/` with tool overlays                        | Often needs `cursor-template/rules/` shape differences          | Often needs `codex-template/rules/` copies                                                |
| Common mistake                                                   | assuming `CLAUDE.md` alone replaces a coherent `rules/` story        | assuming global Cursor install paths apply at runtime           | treating Codex `.rules` as interchangeable with Claude rule files without checking layers |


## Decision Rule

- If the change is broad reusable policy, start in `rules/` and add tool overlays only when the installed shape diverges.
- If the change is Cursor-specific consumption (project-only rules), verify against [../cursor.md](../cursor.md) before documenting behavior.
- If the change is Codex-specific, verify rule layers and `AGENTS.md` guidance on [../codex.md](../codex.md).

## Contributor Rules

- Default to `rules/` as the shared source; treat `cursor-template/rules/` and `codex-template/rules/` as overlays, not parallel originals.
- When capability or install behavior changes, update [../capability-matrix.md](../capability-matrix.md) and the affected tool page before adjusting comparison wording here.

## Verification

- Use [../local-verification.md](../local-verification.md) for verification order.
- Per-tool detail: [../claude-code.md](../claude-code.md), [../cursor.md](../cursor.md), [../codex.md](../codex.md).

