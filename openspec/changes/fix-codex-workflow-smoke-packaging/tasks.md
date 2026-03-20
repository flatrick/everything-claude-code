## 1. Runtime Boundary

- [ ] 1.1 Audit which smoke helper files `mdt.js` loads for Codex workflow smoke in installed dev homes.
- [ ] 1.2 Update helper loading or dev-install packaging so Codex smoke only requires files present in the installed dev runtime.

## 2. Regression Coverage

- [ ] 2.1 Add or update tests for Codex `--dev` install output to assert required smoke helpers are present.
- [ ] 2.2 Add or update tests for Codex workflow smoke invocation so missing packaged helpers are caught before release.

## 3. Verification

- [ ] 3.1 Re-run targeted dev-install and smoke verification for Codex after the fix.
- [ ] 3.2 Update verification docs if the supported dev-smoke boundary wording changes.
