## 1. Sensitive-File Audit

- [ ] 1.1 Audit the current sensitive base-state files under `~/.claude/`, `~/.cursor/`, and `~/.codex/`.
- [ ] 1.2 Classify each candidate file as harden directly, verify only, or leave untouched.

## 2. Contract Shaping

- [ ] 2.1 Define the boundary between shared workspace hardening and optional tool-home hardening.
- [ ] 2.2 Decide whether future tool-home hardening stays operator-invoked and optional for each tool.
- [ ] 2.3 Decide where future apply/verify assets would live if the audit supports implementation.

## 3. Follow-Up Readiness

- [ ] 3.1 Update docs to describe the current boundary accurately if the audit reveals drift.
- [ ] 3.2 Create one or more implementation changes only after the per-tool file-scope audit is complete.
