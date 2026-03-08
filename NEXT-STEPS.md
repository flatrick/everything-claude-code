# Next Steps

The repo now has:

- audited cross-tool capability docs under `docs/tools/`
- a local-first setup contract for Claude, Cursor, Codex, and OpenCode
- local smoke probes for installed CLIs
- deeper Codex workflow smoke for `plan`, `tdd`, and `verify`

The next work should stay narrow, local-first, and focused on real workflow confidence rather than new features.

---

## Current Direction

- This fork is primarily for personal daily use, with possible reuse by friends and coworkers.
- Upstream ECC is now reference material, not an active sync source.
- v1 is still stabilization work: remove drift, verify real workflows, and avoid guesswork across tools.

---

## Next Practical Steps

### 1. Add deeper Claude workflow smoke

Codex now has workflow-level smoke coverage beyond simple CLI reachability.
Claude should get the same treatment for the MDT workflows that matter most.

Recommended first scope:

- `plan`
- `tdd`
- `verify`
- `security`

### 2. Keep Cursor desktop verification manual for now

Cursor Agent CLI is locally smoke-tested, but the desktop app should be treated
as a manual verification surface until there is a reliable non-interactive
workflow worth automating.

Document manual checks in `docs/tools/` instead of forcing a brittle script.

### 3. Add OpenCode local smoke once installed

OpenCode remains structurally documented and contract-checked, but not locally
verified on this machine. Once it is installed locally:

- run `node scripts/smoke-tool-setups.js`
- add an OpenCode-specific workflow smoke if the adapter is going to stay first-class

### 4. Continue replacing stale workflow references

There are still likely skills and docs that refer to removed Python/shell-era
scripts or older workflow assumptions. Continue fixing those as they are found,
and prefer the local validators plus workflow smoke scripts over manual guessing.

### 5. Cut a stabilization release boundary after Claude workflow smoke

Once Claude gets the same deeper workflow verification that Codex now has,
the repo will have a stronger stabilization boundary for the two primary tools
currently in use.

That would be a sensible point to prepare release notes covering:

- local-first tool setup verification
- Codex workflow smoke coverage
- cross-tool workflow contract docs

---

## Keep Using

For future verification passes, use:

- `node scripts/verify-tool-setups.js`
- `node scripts/smoke-tool-setups.js`
- `node scripts/smoke-codex-workflows.js`
- `node tests/run-all.js --profile neutral`

If a tool is not installed locally, record it as `SKIP` rather than guessing.
