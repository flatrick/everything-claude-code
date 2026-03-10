# Backlog

Deferred work items that are documented but not yet scheduled.

---

## Replace hardcoded `~/.claude/` with tool-aware paths

**Status:** Completed for generic docs, commands, skills, and JSDoc/comments. Remaining `~/.claude/` mentions are intentional Claude-specific examples, upstream-reference guides, validator/test text, or explicit compatibility notes.

**Why it mattered:** MDT supports multiple tools (Claude Code, Cursor, Codex, OpenCode). Generic documentation now uses config-dir/data-dir wording unless a tool-specific path is required.

---

## Local-first tool setup and workflow verification

**Status:** Core local verification now exists.

Implemented:

- `docs/tools/workflow-matrix.md` for intended MDT workflow behavior by tool
- `scripts/verify-tool-setups.js` for deterministic local contract checks
- `scripts/smoke-tool-setups.js` for local CLI smoke probes
- `scripts/smoke-codex-workflows.js` for deeper Codex workflow smoke on `plan`, `tdd`, and `verify`
- `skills/tool-setup-verifier/SKILL.md` and `harness-audit setup` guidance

Remaining follow-up:

- Add deeper workflow smoke coverage for Claude
- Decide whether Cursor desktop verification should remain manual or get a documented assisted workflow
- Add OpenCode local smoke coverage once OpenCode is installed locally

---

## Harden tool home directories for all supported tools

**Status:** Open — Codex only.

`codex-template/hardening/` contains an optional hardening bundle for Codex:

- `apply-codex-home-hardening.mjs` — restricts `auth.json` to owner-only permissions
  (Windows: removes sandbox-user ACL entries via `icacls`; POSIX: `chmod 600`)
- `verify-codex-home-hardening.mjs` — checks that the hardening is in place
- `PROMPT.md` — an adaptive Codex prompt for hardening on another machine or as
  another user, without requiring the scripts to be present

This is **opt-in** — the installer does not apply hardening automatically.
Users run it manually: `node codex-template/hardening/apply-codex-home-hardening.mjs`.

**What to replicate for other tools:**

Each tool stores sensitive local state (auth tokens, session history, API keys)
in its home directory. The specific files differ per tool:

| Tool | Sensitive files | Home path |
|---|---|---|
| Codex | `auth.json`, `history.jsonl`, `sessions/`, `state_*.sqlite*` | `~/.codex/` |
| Claude Code | `credentials`, session data | `~/.claude/` |
| Cursor | auth state, telemetry | `~/.cursor/` |
| OpenCode | auth, session state | tool-specific |

**Proposed approach:**

- Add a `<tool>-template/hardening/` bundle for each tool following the Codex pattern
- Each bundle: `apply-<tool>-home-hardening.mjs`, `verify-<tool>-home-hardening.mjs`, `PROMPT.md`
- Keep them opt-in — never run from `install-mdt.js` automatically
- Consider a future `scripts/harden.js --target <tool>` unified entry point once
  multiple bundles exist

**Constraint:** Do not implement until the tool is installed and locally verified,
so that actual sensitive file paths can be confirmed rather than guessed.

---

## Cursor install copies non-requested skills

**Status:** Open.

**Repro:**

```text
node scripts/install-mdt.js --target cursor typescript
```

**Current behavior:** Cursor install copies skills for unrelated languages as
well, including items such as Rust and SQL-oriented skills.

**Expected behavior:** A language-scoped Cursor install should only copy the
skills intended for the requested install scope, or otherwise follow an explicit
tool-level rule for which skills are global versus language-specific. It should
not silently install unrelated language skills when only `typescript` was
requested.

---
