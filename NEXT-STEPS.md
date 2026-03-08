# Next Steps

## Current Direction

- This fork is primarily for personal daily use, with possible reuse by friends and coworkers.
- Upstream ECC is now reference material, not an active sync source.
- v1 is still stabilization work: remove drift, verify real workflows, and avoid guesswork across tools.

---

## Next Practical Steps

### 1. Cursor parity — fix silently broken hooks (P0)

The Cursor hook adapter exists but two core hooks silently no-op because Cursor
does not provide Claude's `transcript_path`:

- `session-end.js` — reads JSONL transcript to build session summary → writes nothing in Cursor
- `evaluate-session.js` — also transcript-dependent → skips entirely
- `cost-tracker.js` — reads token data from transcript → skips silently

**Fix**: rewrite `.cursor/hooks/session-end.js` and `.cursor/hooks/stop.js` to
consume Cursor's native `stop`/`sessionEnd` payload (`conversation_id`,
`modified_files`, `messages[]`) instead of delegating to the Claude-format scripts.
Session summaries can still be written to the same sessions dir so `session-start`
keeps working cross-session.

### 2. Cursor parity — MDT_ROOT for shared scripts (P0)

Shared scripts in `scripts/hooks/` that spawn subprocesses may fail when
`MDT_ROOT` is not set in Cursor's environment.

**Fix**: in `adapter.js` `runExistingHook()`, inject `MDT_ROOT` into the child
process env (set to the resolved plugin root). Alternatively, set it in
`session-start.js` at the top of each Cursor session.

### 3. Cursor parity — cost tracker (P1)

Either detect token usage from Cursor's stop payload (if available) or write a
Cursor-native stub that logs `[MDT] Cost tracking: not available in Cursor` instead
of silently skipping. Respect `MDT_DISABLED_HOOKS=stop:cost-tracker` to opt out.

### 4. Cursor parity — wire continuous learning (P1)

`skills/continuous-learning-v2/hooks/observe.js` is called at Pre/PostToolUse in
Claude hooks but is not wired in Cursor hooks at all. `observe.js` already supports
Cursor via `detect-env.js`. Add calls to `afterFileEdit` and `afterShellExecution`
Cursor hooks.

### 5. Cursor parity — populate `.cursor/skills/` (P2)

Cursor has a native skills system using the same `SKILL.md` format and
auto-discovery as Claude Code. Skills live in `.cursor/skills/` (project) or
`~/.cursor/skills/` (user) and are invocable via `/` in Agent chat.

Currently only `frontend-slides` is in `.cursor/skills/`. All other skills need
to be added there — not converted to rules.

Priority skills to add first:
- `tdd-workflow`
- `verification-loop`
- `coding-standards`
- `security-review`
- `backend-patterns`
- `frontend-patterns`

Update `scripts/install-mdt.js` to copy `skills/*/` to `.cursor/skills/` on
Cursor installs (same as it does for Claude Code).

Note: Cursor user-level rules (`~/.cursor/rules/`) are stored in a database and
cannot be file-installed. The install script must only target project-level paths
(`.cursor/rules/`, `.cursor/skills/`). This is unlike Claude Code where
`~/.claude/rules/` is file-based.

### 6. Add dependency declarations to SKILL.md frontmatter (P1)

Currently all inter-component dependencies are implicit. Skills that assume rules
are loaded don't declare it, so the install script cannot warn when installing to
an environment where those dependencies can't be satisfied (e.g. Cursor global
install, where user-level rules are database-backed and unavailable).

**Proposed addition to SKILL.md frontmatter:**

```yaml
---
name: tdd-workflow
description: ...
requires:
  rules:
    - common/testing
    - common/coding-style
  hooks: true          # needs hook infrastructure active
  skills: []           # inter-skill dependencies
---
```

**What this enables:**
- The install script can check `requires.rules` and warn (or block) when rules
  can't be guaranteed (e.g. Cursor global scope)
- The install script can check `requires.hooks` and skip or warn when installing
  to a tool that doesn't support hooks
- Users see upfront what a skill needs before installing it
- Test suite can validate that declared dependencies are actually present

**Scope of work:**
1. Add `requires:` to the SKILL.md schema (or document it as a convention)
2. Audit each skill and add `requires:` where the dependency is real (not just
   "nice to have") — start with skills that embed explicit rule guidance:
   `tdd-workflow`, `security-review`, `coding-standards`, `verification-loop`
3. Update `scripts/install-mdt.js` to read `requires:` and emit warnings when
   installing to a tool/scope that can't satisfy them
4. Update tests to cover the dependency-check logic

### 7. Cursor parity — convert commands to Cursor custom commands (P2)

All commands in `commands/*.md` use Claude Code slash command format. Cursor has
its own custom command system. Create `.cursor/commands/` and convert the core
workflows, stripping Claude-specific subagent syntax:

- `/tdd`, `/plan`, `/verify`, `/code-review`, `/learn`, `/skill-create`

Update `scripts/install-mdt.js` to copy these for Cursor installs.

### 8. Add deeper Claude workflow smoke (P2)

Codex has workflow-level smoke coverage. Claude should get the same for:

- `plan`
- `tdd`
- `verify`
- `security`

### 9. Add Cursor parity tests (P3)

Add test coverage for:
- `.cursor/hooks/*.js` with Cursor-format input (no `transcript_path`)
- Cursor session-end writing a fallback summary when no transcript is available
- Skill-to-rule and command conversion output

### 10. Cut a stabilization release boundary (P3)

Once Cursor hook parity is working and Claude workflow smoke is added, prepare
release notes covering:

- Cursor hook parity (no Claude Code dependencies)
- Claude workflow smoke coverage
- Skills/commands conversion for Cursor

### 11. Add OpenCode local smoke once installed

OpenCode is structurally documented but not locally verified. Once installed:

- run `node scripts/smoke-tool-setups.js`
- add an OpenCode-specific workflow smoke if the adapter is going to stay first-class

---

## Design Principle for Cursor Hooks

> Never fake Claude format in Cursor hooks. `transformToClaude()` works for hooks
> that only use `command` or `file_path`, but breaks for anything reading
> `transcript_path`. Write Cursor hooks that consume Cursor's native JSON directly
> and call the business-logic layer (format checking, secret detection) directly —
> not via the Claude Code hook runner.

Shared scripts that are transcript-independent (format, typecheck, console-warn,
secret detection) are safe to delegate to via adapter. The ones that are
transcript-dependent (session-end, cost-tracker, evaluate-session) need Cursor-native
reimplementations.

---

## Keep Using

For future verification passes, use:

- `node scripts/verify-tool-setups.js`
- `node scripts/smoke-tool-setups.js`
- `node scripts/smoke-codex-workflows.js`
- `node tests/run-all.js --profile neutral`

If a tool is not installed locally, record it as `SKIP` rather than guessing.
